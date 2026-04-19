import os
import geoip2.database
import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "GeoLite2-City.mmdb")

reader = None

if os.path.exists(DB_PATH):
    reader = geoip2.database.Reader(DB_PATH)

def get_country(ip):
    if not ip or ip == "unknown":
        return "Unknown"

    try:
        if reader:
            response = reader.city(ip)
            country = response.country.name
            if country:
                return country
    except:
        pass

    try:
        res = requests.get(f"http://ip-api.com/json/{ip}", timeout=2)
        data = res.json()
        return data.get("country", "Unknown")
    except:
        return "Unknown"