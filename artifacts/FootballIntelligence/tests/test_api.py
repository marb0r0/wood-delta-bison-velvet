"""API smoke tests using SQLite."""
from __future__ import annotations

import os

# Must run before application imports bind the engine
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_api.db")
os.environ.setdefault("APP_ENV", "test")

from fastapi.testclient import TestClient  # noqa: E402

from football_ai.db import Base, engine  # noqa: E402
from football_ai.main import app  # noqa: E402

Base.metadata.create_all(bind=engine)
client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "model_version" in body


def test_quick_predict():
    r = client.post(
        "/api/v1/predict/quick",
        json={"home_xg": 1.6, "away_xg": 1.1, "rho": -0.13},
    )
    assert r.status_code == 200
    body = r.json()
    assert abs(body["home_win"] + body["draw"] + body["away_win"] - 1.0) < 1e-6
    assert "most_likely_score" in body
    assert "score_matrix" in body


def test_fixture_crud_and_predict():
    fid = "ci-test-fixture-001"
    client.delete(f"/api/v1/fixtures/{fid}")

    r = client.post(
        "/api/v1/fixtures",
        json={
            "id": fid,
            "competition": "CI League",
            "season": "2025/26",
            "home_team": "Alpha",
            "away_team": "Beta",
        },
    )
    assert r.status_code == 201

    r = client.get("/api/v1/fixtures")
    assert r.status_code == 200
    assert any(f["id"] == fid for f in r.json())

    r = client.post(
        f"/api/v1/fixtures/{fid}/predict",
        json={"home_xg": 1.4, "away_xg": 1.2},
    )
    assert r.status_code == 200
    assert "home_win" in r.json()

    r = client.get(f"/api/v1/fixtures/{fid}/predictions")
    assert r.status_code == 200
    assert len(r.json()) >= 1

    r = client.delete(f"/api/v1/fixtures/{fid}")
    assert r.status_code == 204


def test_quick_predict_rejects_bad_xg():
    r = client.post("/api/v1/predict/quick", json={"home_xg": 0, "away_xg": 1.0})
    assert r.status_code == 422
