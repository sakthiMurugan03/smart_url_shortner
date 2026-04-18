from fastapi import APIRouter, HTTPException, Request, Query, Depends
from fastapi.responses import RedirectResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import qrcode

from .database import SessionLocal
from .models import URL, Click
from .utils import encode_base62
from .websocket_manager import clients

router = APIRouter()


# ---------- DB DEPENDENCY ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- SHORTEN ----------
@router.post("/shorten")
def shorten(long_url: str = Query(...), db: Session = Depends(get_db)):

    if not long_url.startswith("http"):
        long_url = "https://" + long_url

    url = URL(long_url=long_url)
    db.add(url)
    db.commit()
    db.refresh(url)

    short_code = encode_base62(url.id)
    url.short_code = short_code
    db.commit()

    return {
        "short_url": f"http://127.0.0.1:8000/{short_code}"
    }


# ---------- ANALYTICS ----------
@router.get("/analytics/{short_code}")
def analytics(short_code: str, db: Session = Depends(get_db)):

    total = db.query(func.count(Click.id)).filter(
        Click.short_code == short_code
    ).scalar()

    unique = db.query(func.count(func.distinct(Click.ip_address))).filter(
        Click.short_code == short_code
    ).scalar()

    daily = (
        db.query(
            func.date(Click.timestamp),
            func.count()
        )
        .filter(Click.short_code == short_code)
        .group_by(func.date(Click.timestamp))
        .order_by(func.date(Click.timestamp))
        .all()
    )

    recent = (
        db.query(Click)
        .filter(Click.short_code == short_code)
        .order_by(Click.timestamp.desc())
        .limit(10)
        .all()
    )

    return {
        "total": total or 0,
        "unique": unique or 0,
        "daily": [
            {"date": str(d[0]), "clicks": d[1]} for d in daily
        ],
        "recent": [
            {"time": str(r.timestamp), "ip": r.ip_address} for r in recent
        ]
    }


# ---------- QR ----------
@router.get("/qr/{short_code}")
def generate_qr(short_code: str):

    url = f"http://127.0.0.1:8000/{short_code}"

    img = qrcode.make(url)
    file_path = f"{short_code}.png"
    img.save(file_path)

    return FileResponse(file_path)


# ---------- REDIRECT ----------
@router.get("/{short_code}")
async def redirect(
    short_code: str,
    request: Request,
    db: Session = Depends(get_db)
):

    url = db.query(URL).filter(URL.short_code == short_code).first()

    if not url:
        raise HTTPException(status_code=404, detail="URL not found")

    # 🔥 store click
    click = Click(
        short_code=short_code,
        timestamp=datetime.utcnow(),
        ip_address=request.client.host
    )
    db.add(click)
    db.commit()

    # 🔥 websocket broadcast
    for ws in clients:
        try:
            await ws.send_json({
                "event": "click",
                "short_code": short_code
            })
        except:
            pass

    return RedirectResponse(url.long_url)