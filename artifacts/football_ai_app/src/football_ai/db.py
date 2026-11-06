from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from football_ai.config import settings


class Base(DeclarativeBase):
    pass


_url = settings.sqlalchemy_url
_engine_kwargs: dict = {"pool_pre_ping": True}
if _url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Render free Postgres can drop idle connections
    _engine_kwargs["pool_recycle"] = 300

engine = create_engine(_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
