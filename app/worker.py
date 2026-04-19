import time
from app.cache import redis_client
from app.database import SessionLocal
from app.models import Click
from datetime import datetime

def sync_clicks():
    while True:
        keys = redis_client.keys("clicks:*")
        for key in keys:
            short_code = key.split(":")[1]
            count = int(redis_client.get(key) or 0)

            if count > 0:
                db = SessionLocal()
                try:
                    for _ in range(count):
                        db.add(Click(
                            short_code=short_code,
                            ip_address="redis",
                            timestamp=datetime.utcnow()
                        ))
                    db.commit()
                    redis_client.set(key, 0)
                finally:
                    db.close()

        time.sleep(5)