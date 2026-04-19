import time
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import URL
from app.cache import redis_client


def sync_clicks():
    while True:
        db: Session = SessionLocal()

        try:
            cursor = 0

            while True:
                cursor, keys = redis_client.scan(cursor=cursor, match="clicks:*", count=100)

                for key in keys:
                    short_code = key.split(":")[1]

                    # atomic read + reset
                    clicks = int(redis_client.getset(key, 0) or 0)

                    if clicks == 0:
                        continue

                    url = db.query(URL).filter(URL.short_code == short_code).first()

                    if url:
                        url.click_count = (url.click_count or 0) + clicks

                if cursor == 0:
                    break

            db.commit()

        except Exception as e:
            print("Worker error:", e)

        finally:
            db.close()

        time.sleep(10)


if __name__ == "__main__":
    print("Worker started...")
    sync_clicks()