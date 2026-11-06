"""Fixtures for integration tests against a real database (PostgreSQL preferred)."""
from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure env is set before importing the app modules
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://football:football@localhost:5432/football_ai_test",
)
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from football_ai.db import Base, SessionLocal, engine  # noqa: E402
from football_ai.main import app  # noqa: E402


@pytest.fixture(scope="session")
def db_ready():
    """Create schema once per session; fail clearly if DB is unreachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        pytest.fail(f"Database not reachable for integration tests: {exc}")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_ready):
    """HTTP client bound to the FastAPI app."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def unique_id() -> str:
    return f"it-{uuid.uuid4().hex[:12]}"


@pytest.fixture
def clean_session(db_ready):
    """Provide a SQLAlchemy session and roll back side effects via truncate."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
