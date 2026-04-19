from sqlalchemy import Column, Integer, String, DateTime
from .database import Base

class URL(Base):
    __tablename__ = "urls"
    id = Column(Integer, primary_key=True, index=True)
    long_url = Column(String, nullable=False)
    short_code = Column(String, unique=True, index=True)

class Click(Base):
    __tablename__ = "clicks"
    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String, index=True)
    ip_address = Column(String)
    device = Column(String)
    country = Column(String)
    timestamp = Column(DateTime)