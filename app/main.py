from fastapi import FastAPI, WebSocket, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import threading

from app.routes import router
from app.database import Base, engine, SessionLocal
from app.websocket_manager import clients
from app.worker import sync_clicks
from app.models import URL

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def start_background_worker():
    thread = threading.Thread(target=sync_clicks, daemon=True)
    thread.start()

@app.get("/")
def root():
    return {"status": "API running 🚀"}

@app.get("/{short_code}")
def global_redirect(short_code: str, request: Request, db: Session = Depends(get_db)):
    url = db.query(URL).filter(URL.short_code == short_code).first()
    if not url:
        raise HTTPException(status_code=404, detail="Not found")
    return RedirectResponse(url.long_url)

@app.websocket("/ws")
async def websocket(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except:
        clients.remove(ws)