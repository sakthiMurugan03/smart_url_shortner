from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router
from app.database import Base, engine
from app.websocket_manager import clients

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

@app.get("/")
def root():
    return {"status": "API running 🚀"}

from fastapi.responses import RedirectResponse
from app.database import SessionLocal
from app.models import URL

@app.get("/{short_code}")
def redirect(short_code: str):
    db = SessionLocal()

    url = db.query(URL).filter(URL.short_code == short_code).first()

    if not url:
        return {"detail": "Not Found"}

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