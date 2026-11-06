"""End-to-end API integration tests (PostgreSQL)."""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


def test_health_reports_environment(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["environment"] == "test"
    assert body["model_version"]


def test_full_fixture_lifecycle(client, unique_id):
    """Create → list → get → predict → history → update → delete."""
    payload = {
        "id": unique_id,
        "competition": "Integration League",
        "season": "2025/26",
        "home_team": "Porto",
        "away_team": "Braga",
        "source": "integration",
    }

    # Create
    r = client.post("/api/v1/fixtures", json=payload)
    assert r.status_code == 201, r.text
    assert r.json()["id"] == unique_id
    assert r.json()["home_team"] == "Porto"

    # Duplicate should conflict
    r = client.post("/api/v1/fixtures", json=payload)
    assert r.status_code == 409

    # List includes fixture
    r = client.get("/api/v1/fixtures?limit=100")
    assert r.status_code == 200
    ids = [f["id"] for f in r.json()]
    assert unique_id in ids

    # Filter by competition
    r = client.get("/api/v1/fixtures", params={"competition": "Integration"})
    assert r.status_code == 200
    assert any(f["id"] == unique_id for f in r.json())

    # Get single
    r = client.get(f"/api/v1/fixtures/{unique_id}")
    assert r.status_code == 200
    assert r.json()["away_team"] == "Braga"

    # Predict
    r = client.post(
        f"/api/v1/fixtures/{unique_id}/predict",
        json={"home_xg": 1.7, "away_xg": 1.15, "rho": -0.13},
    )
    assert r.status_code == 200, r.text
    pred = r.json()
    assert pred["fixture_id"] == unique_id
    assert abs(pred["home_win"] + pred["draw"] + pred["away_win"] - 1.0) < 1e-5
    assert 0 <= pred["over_2_5"] <= 1
    assert 0 <= pred["btts_yes"] <= 1
    assert pred["most_likely_score"]
    assert pred["score_matrix"] and len(pred["score_matrix"]) == 11

    # Second prediction (history grows)
    r = client.post(
        f"/api/v1/fixtures/{unique_id}/predict",
        json={"home_xg": 1.2, "away_xg": 1.5},
    )
    assert r.status_code == 200

    r = client.get(f"/api/v1/fixtures/{unique_id}/predictions")
    assert r.status_code == 200
    history = r.json()
    assert len(history) >= 2
    # newest first
    assert history[0]["home_xg"] == pytest.approx(1.2, rel=1e-3)

    # Latest predictions endpoint
    r = client.get("/api/v1/predictions/latest?limit=10")
    assert r.status_code == 200
    assert any(p["fixture_id"] == unique_id for p in r.json())

    # Update scores
    r = client.patch(
        f"/api/v1/fixtures/{unique_id}",
        json={"home_goals": 2, "away_goals": 1},
    )
    assert r.status_code == 200
    assert r.json()["home_goals"] == 2
    assert r.json()["away_goals"] == 1

    # Delete cascades predictions
    r = client.delete(f"/api/v1/fixtures/{unique_id}")
    assert r.status_code == 204

    r = client.get(f"/api/v1/fixtures/{unique_id}")
    assert r.status_code == 404

    r = client.get(f"/api/v1/fixtures/{unique_id}/predictions")
    assert r.status_code == 200
    assert r.json() == []


def test_predict_unknown_fixture(client):
    r = client.post(
        "/api/v1/fixtures/does-not-exist/predict",
        json={"home_xg": 1.5, "away_xg": 1.0},
    )
    assert r.status_code == 404


def test_quick_predict_matrix_and_top_scores(client):
    r = client.post(
        "/api/v1/predict/quick",
        json={"home_xg": 2.0, "away_xg": 0.9, "rho": -0.1},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["home_win"] > body["away_win"]
    assert "top_scores" in body
    assert len(body["top_scores"]) >= 1
    assert body["top_scores"][0]["probability"] >= body["top_scores"][-1]["probability"]
    total = sum(sum(row) for row in body["score_matrix"])
    assert abs(total - 1.0) < 1e-6


def test_validation_errors(client, unique_id):
    # Invalid xG on quick predict (pydantic ge/gt)
    r = client.post("/api/v1/predict/quick", json={"home_xg": -1, "away_xg": 1})
    assert r.status_code == 422

    # Partial scores on create
    r = client.post(
        "/api/v1/fixtures",
        json={
            "id": unique_id,
            "competition": "X",
            "home_team": "A",
            "away_team": "B",
            "home_goals": 1,
        },
    )
    assert r.status_code == 422
