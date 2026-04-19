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
from .utils import get_device
from .geo import get_country
from app.redis_client import redis_client

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

def increment_usage(request: Request):
    api_key = request.headers.get("x-api-key", "default")
    key = f"rate:{api_key}"
    redis_client.incr(key)
    redis_client.expire(key, 60)

def get_usage(request: Request):
    api_key = request.headers.get("x-api-key", "default")
    key = f"rate:{api_key}"
    val = redis_client.get(key)
    return int(val) if val else 0

@router.post("/generate-api-key")
def generate_api_key():
    return {"api_key": str(uuid.uuid4())}

@router.get("/api-usage")
def api_usage(request: Request):
    current = get_usage(request)
    limit = 50
    return {
        "total_usage": current,
        "current_window": current,
        "limit": limit,
        "remaining": max(0, limit - current),
        "status": "active" if current < limit else "rate_limited"
    }

@router.post("/shorten")
def shorten(request: Request, body: ShortenRequest, db: Session = Depends(get_db)):
    increment_usage(request)

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

def create_click(short_code, request, db):
    user_agent = request.headers.get("user-agent", "")
    device = get_device(user_agent)

    ip = request.headers.get("x-forwarded-for")
    if ip:
        ip = ip.split(",")[0]
    else:
        ip = request.client.host if request.client else "unknown"

    country = get_country(ip)

    click = Click(
        short_code=short_code,
        ip_address=ip,
        device=device,
        country=country,
        timestamp=datetime.utcnow()
    )
    db.add(click)
    db.commit()

    return click

@router.get("/ping/{short_code}")
async def simulate_click(short_code: str, request: Request, db: Session = Depends(get_db)):
    increment_usage(request)

    click = create_click(short_code, request, db)

    for ws in clients:
        try:
            await ws.send_json({
                "event": "click",
                "short_code": short_code,
                "ip": click.ip_address,
                "device": click.device,
                "country": click.country,
                "timestamp": str(click.timestamp)
            })
        except:
            pass

    return {"message": "click recorded"}

@router.get("/{short_code}")
async def redirect(short_code: str, request: Request, db: Session = Depends(get_db)):
    increment_usage(request)

    url = db.query(URL).filter(URL.short_code == short_code).first()
    if not url:
        raise HTTPException(status_code=404, detail="Not found")

    click = create_click(short_code, request, db)

    for ws in clients:
        try:
            await ws.send_json({
                "event": "click",
                "short_code": short_code,
                "ip": click.ip_address,
                "device": click.device,
                "country": click.country,
                "timestamp": str(click.timestamp)
            })
        except:
            pass

    return RedirectResponse(url.long_url)

@router.get("/analytics/{short_code}")
def get_analytics(short_code: str, request: Request, db: Session = Depends(get_db)):
    increment_usage(request)

    clicks = db.query(Click).filter(Click.short_code == short_code).all()

    device_count = {}
    country_count = {}

    for c in clicks:
        device_count[c.device] = device_count.get(c.device, 0) + 1
        country_count[c.country] = country_count.get(c.country, 0) + 1

    return {
        "total": len(clicks),
        "unique": len(set(c.ip_address for c in clicks)),
        "devices": device_count,
        "countries": country_count,
        "clicks": [
            {
                "timestamp": c.timestamp,
                "ip": c.ip_address,
                "device": c.device,
                "country": c.country
            }
            for c in clicks
        ]
    }