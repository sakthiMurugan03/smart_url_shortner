import geoip2.database
import os
import random

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "GeoLite2-City.mmdb")

reader = None

try:
    reader = geoip2.database.Reader(DB_PATH)
except:
    reader = None


def get_country(ip):
    if ip in ("127.0.0.1", "localhost"):
        return random.choice(["India", "USA", "Germany", "UK"])

    if not reader:
        return "Unknown"

    try:
        response = reader.city(ip)
        return response.country.name or "Unknown"
    except:
        return "Unknown"