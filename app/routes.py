from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid
import random
import string

from .database import SessionLocal
from .models import URL, Click
from .websocket_manager import clients
from .cache import redis_client

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ShortenRequest(BaseModel):
    long_url: str
    alias: str | None = None

def generate_code(length=6):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

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

@router.get("/ping/{short_code}")
async def simulate_click(short_code: str):
    try:
        redis_client.incr(f"clicks:{short_code}")

        for ws in clients:
            try:
                await ws.send_json({
                    "event": "click",
                    "short_code": short_code
                })
            except:
                pass

        return {"message": "click recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def log_click(short_code: str, request: Request, db: Session):
    click = Click(
        short_code=short_code,
        ip_address=request.client.host,
        timestamp=datetime.utcnow()
    )
    db.add(click)
    db.commit()

@router.get("/{short_code}")
async def redirect(short_code: str, request: Request, db: Session = Depends(get_db)):
    url = db.query(URL).filter(URL.short_code == short_code).first()
    if not url:
        raise HTTPException(status_code=404, detail="Not found")

    log_click(short_code, request, db)

    for ws in clients:
        try:
            await ws.send_json({
                "event": "click",
                "short_code": short_code
            })
        except:
            pass

    return RedirectResponse(url.long_url)

@router.get("/analytics/{short_code}")
def get_analytics(short_code: str, db: Session = Depends(get_db)):
    clicks = db.query(Click).filter(Click.short_code == short_code).all()

    return {
        "short_code": short_code,
        "total_clicks": len(clicks),
        "clicks": [
            {
                "timestamp": c.timestamp,
                "ip": c.ip_address
            }
            for c in clicks
        ]
    }