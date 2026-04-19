
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import threading

from app.routes import router
from app.database import Base, engine
from app.websocket_manager import clients

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ API routes
app.include_router(router, prefix="/api")


# ✅ SAFE WORKER START (IMPORTANT FIX)
@app.on_event("startup")
def start_background_worker():
    try:
        from app.worker import sync_clicks   # 🔥 IMPORT INSIDE FUNCTION
        thread = threading.Thread(target=sync_clicks, daemon=True)
        thread.start()
        print("✅ Worker started")
    except Exception as e:
        print("❌ Worker failed to start:", e)


# Health check
@app.get("/")
def root():
    return {"status": "API running 🚀"}


# WebSocket
@app.websocket("/ws")
async def websocket(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except:
        clients.remove(ws)

