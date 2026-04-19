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
from .cache import redis_client
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


def api_rate_limit(api_key: str, limit: int = 50, window: int = 60):
    key = f"apikey_rate:{api_key}"

    current = redis_client.get(key)
    if current and int(current) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    pipe = redis_client.pipeline()
    pipe.incr(key, 1)
    pipe.expire(key, window)
    pipe.execute()


def track_api_usage(api_key: str):
    redis_client.incr(f"usage:{api_key}")


# ---------------- API KEY ----------------
@router.post("/generate-api-key")
def generate_api_key():
    key = str(uuid.uuid4())
    redis_client.set(f"apikey:{key}", "active")
    return {"api_key": key}


@router.get("/api-usage")
def get_api_usage(request: Request):
    api_key = request.headers.get("x-api-key")

    if not api_key or not redis_client.get(f"apikey:{api_key}"):
        return {
            "total_usage": 0,
            "current_window": 0,
            "limit": 50,
            "remaining": 50,
            "status": "inactive"
        }

    usage = int(redis_client.get(f"usage:{api_key}") or 0)
    rate = int(redis_client.get(f"apikey_rate:{api_key}") or 0)

    return {
        "total_usage": usage,
        "current_window": rate,
        "limit": 50,
        "remaining": max(0, 50 - rate),
        "status": "throttled" if rate >= 50 else "active"
    }


# ---------------- SHORTEN ----------------
@router.post("/shorten")
def shorten(request: Request, body: ShortenRequest, db: Session = Depends(get_db)):
    api_key = request.headers.get("x-api-key")

    if not api_key:
        raise HTTPException(status_code=401, detail="API key missing")

    if not redis_client.get(f"apikey:{api_key}"):
        raise HTTPException(status_code=401, detail="Invalid API key")

    api_rate_limit(api_key)
    track_api_usage(api_key)

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

    return {"short_url": f"http://127.0.0.1:8000/{short_code}"}


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

    redis_client.incr(f"clicks:{short_code}")


# ---------------- ANALYTICS ----------------
@router.get("/analytics/{short_code}")
def analytics(short_code: str, db: Session = Depends(get_db)):
    clicks = db.query(Click).filter(Click.short_code == short_code).all()

    total = len(clicks)
    unique = len(set(c.ip_address for c in clicks))

    daily_map = {}
    hourly_map = {}
    device_map = {}
    country_map = {}

    for c in clicks:
        day = str(c.timestamp.date())
        hour = c.timestamp.strftime("%H:00")

        daily_map[day] = daily_map.get(day, 0) + 1
        hourly_map[hour] = hourly_map.get(hour, 0) + 1

        d = c.device or "unknown"
        device_map[d] = device_map.get(d, 0) + 1

        country = c.country or "Unknown"
        country_map[country] = country_map.get(country, 0) + 1

    recent = [
        {
            "ip": c.ip_address,
            "country": c.country or "Unknown",
            "device": c.device or "unknown",
            "time": c.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }
        for c in sorted(clicks, key=lambda x: x.timestamp, reverse=True)[:20]
    ]

    return {
        "total": total,
        "unique": unique,
        "daily": [{"date": k, "clicks": v} for k, v in daily_map.items()],
        "hourly": [{"hour": k, "clicks": v} for k, v in hourly_map.items()],
        "devices": [{"device": k, "count": v} for k, v in device_map.items()],
        "countries": [{"country": k, "count": v} for k, v in country_map.items()],
        "recent": recent
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