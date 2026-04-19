from redis import Redis
from rq import Queue

redis_conn = Redis(host="localhost", port=6379, db=0)
click_queue = Queue("clicks", connection=redis_conn)