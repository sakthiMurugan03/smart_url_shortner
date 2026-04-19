from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router
from app.database import Base, engine
from app.websocket_manager import clients

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ✅ CORS — production-safe
origins = [
    "http://localhost:5173",                  # local dev
    "https://smart-url-shortner.vercel.app",  # your main Vercel URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # allow all Vercel previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(router)

# Optional health check (nice to have)
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