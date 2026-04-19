from .cache import redis_client
from .database import SessionLocal
from .models import Click
from datetime import datetime
import time

def sync_clicks():
    while True:
        db = SessionLocal()
        try:
            keys = redis_client.keys("clicks:*")
            for key in keys:
                count = int(redis_client.get(key))
                short_code = key.split(":")[1]

                for _ in range(count):
                    click = Click(
                        short_code=short_code,
                        ip_address="simulated",
                        timestamp=datetime.utcnow()
                    )
                    db.add(click)

                redis_client.delete(key)

            db.commit()
        finally:
            db.close()

        time.sleep(5)