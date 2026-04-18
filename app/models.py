from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from .database import Base


class URL(Base):
    __tablename__ = "urls"

    id = Column(Integer, primary_key=True, index=True)
    long_url = Column(String(1000))
    short_code = Column(String(20), unique=True)


class Click(Base):
    __tablename__ = "clicks"

    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String(20))
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(50))