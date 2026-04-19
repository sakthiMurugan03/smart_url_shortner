from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router
from app.database import Base, engine
from app.websocket_manager import clients

Base.metadata.create_all(bind=engine)

app = FastAPI()

# ✅ FIXED CORS
origins = [
    "http://localhost:5173",                # local frontend
    "https://smart-url-shortner.vercel.app" # deployed frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # ❗ NOT "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws")
async def websocket(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except:
        clients.remove(ws)