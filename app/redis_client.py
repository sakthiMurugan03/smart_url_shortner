import os
import redis

REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    redis_client = redis.Redis.from_url(
        REDIS_URL,
        decode_responses=True,
    )
else:
    # Local fallback (requires Redis running locally)
    redis_client = redis.Redis(
        host="localhost",
        port=6379,
        decode_responses=True,
    )