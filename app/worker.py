import time
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import URL
from .cache import redis_client

def sync_clicks():
    while True:
        db: Session = SessionLocal()

        keys = redis_client.keys("clicks:*")

        for key in keys:
            short_code = key.split(":")[1]
            clicks = int(redis_client.get(key))

            url = db.query(URL).filter(URL.short_code == short_code).first()

            if url and clicks > 0:
                url.click_count = (url.click_count or 0) + clicks
                redis_client.set(key, 0)

        db.commit()
        db.close()

        time.sleep(30)

if __name__ == "__main__":
    sync_clicks()