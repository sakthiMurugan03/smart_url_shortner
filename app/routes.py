from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid
import random
import string
import csv
from io import StringIO

from .database import SessionLocal
from .models import URL, Click
from .websocket_manager import clients
from .geo import get_country

router = APIRouter()

# ---------------- DB ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- REQUEST MODEL ----------------
class ShortenRequest(BaseModel):
    long_url: str
    alias: str | None = None

# ---------------- UTILS ----------------
def generate_code(length=6):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def get_device(user_agent: str):
    ua = user_agent.lower()
    if "mobile" in ua:
        return "mobile"
    elif "tablet" in ua:
        return "tablet"
    else:
        return "desktop"

# ---------------- API KEY (NO REDIS) ----------------
@router.post("/generate-api-key")
def generate_api_key():
    return {"api_key": str(uuid.uuid4())}

@router.get("/api-usage")
def get_api_usage():
    return {
        "total_usage": 0,
        "current_window": 0,
        "limit": 50,
        "remaining": 50,
        "status": "active"
    }

# ---------------- SHORTEN ----------------
@router.post("/shorten")
def shorten(request: Request, body: ShortenRequest, db: Session = Depends(get_db)):
    long_url = body.long_url
    alias = body.alias

    if not long_url.startswith("http"):
        long_url = "https://" + long_url

    if alias:
        existing = db.query(URL).filter(URL.short_code == alias).first()
        if existing:
            raise HTTPException(status_code=409, detail="Alias taken")
        short_code = alias
    else:
        while True:
            short_code = generate_code()
            if not db.query(URL).filter(URL.short_code == short_code).first():
                break

    url = URL(long_url=long_url, short_code=short_code)
    db.add(url)
    db.commit()

    return {"short_url": f"https://smart-url-shortner.onrender.com/{short_code}"}

# ---------------- CLICK LOGGER ----------------
def log_click(short_code: str, request: Request, db: Session):
    ip = request.client.host
    user_agent = request.headers.get("user-agent", "")

    country = get_country(ip)
    device = get_device(user_agent)

    click = Click(
        short_code=short_code,
        ip_address=ip,
        country=country,
        device=device,
        timestamp=datetime.utcnow()
    )

    db.add(click)
    db.commit()

# ---------------- ANALYTICS ----------------
@router.get("/analytics/{short_code}")
def analytics(short_code: str, db: Session = Depends(get_db)):
    clicks = db.query(Click).filter(Click.short_code == short_code).all()

    total = len(clicks)
    unique = len(set(c.ip_address for c in clicks))

    return {
        "total": total,
        "unique": unique
    }

# ---------------- CSV EXPORT ----------------
@router.get("/export/{short_code}")
def export_csv(short_code: str, db: Session = Depends(get_db)):
    clicks = db.query(Click).filter(Click.short_code == short_code).all()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["IP", "Country", "Device", "Timestamp"])

    for c in clicks:
        writer.writerow([
            c.ip_address,
            c.country or "Unknown",
            c.device or "unknown",
            c.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        ])

    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={short_code}_analytics.csv"
        }
    )

# ---------------- PING ----------------
@router.get("/ping/{short_code}")
async def ping(short_code: str, request: Request, db: Session = Depends(get_db)):
    url = db.query(URL).filter(URL.short_code == short_code).first()
    if not url:
        raise HTTPException(status_code=404, detail="Not found")

    log_click(short_code, request, db)

    for ws in clients:
        try:
            await ws.send_json({"event": "click", "short_code": short_code})
        except:
            pass

    return {"ok": True}

# ---------------- REDIRECT ----------------
@router.get("/{short_code}")
async def redirect(short_code: str, request: Request, db: Session = Depends(get_db)):
    url = db.query(URL).filter(URL.short_code == short_code).first()
    if not url:
        raise HTTPException(status_code=404, detail="Not found")

    log_click(short_code, request, db)

    for ws in clients:
        try:
            await ws.send_json({"event": "click", "short_code": short_code})
        except:
            pass

    return RedirectResponse(url.long_url)