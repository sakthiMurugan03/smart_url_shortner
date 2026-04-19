from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router
from app.database import Base, engine
from app.websocket_manager import clients

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ✅ CORS (keep this as is)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ IMPORTANT FIX (this is what you chose)
app.include_router(router, prefix="/api")

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