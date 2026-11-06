"""Database persistence checks at the SQLAlchemy layer."""
from __future__ import annotations

import pytest
from sqlalchemy import func, select

from football_ai.models import Fixture, Prediction

pytestmark = pytest.mark.integration


def test_fixture_and_prediction_persist(client, clean_session, unique_id):
    r = client.post(
        "/api/v1/fixtures",
        json={
            "id": unique_id,
            "competition": "DB League",
            "home_team": "Home",
            "away_team": "Away",
        },
    )
    assert r.status_code == 201

    r = client.post(
        f"/api/v1/fixtures/{unique_id}/predict",
        json={"home_xg": 1.5, "away_xg": 1.0},
    )
    assert r.status_code == 200

    fx = clean_session.get(Fixture, unique_id)
    assert fx is not None
    assert fx.competition == "DB League"

    count = clean_session.scalar(
        select(func.count()).select_from(Prediction).where(Prediction.fixture_id == unique_id)
    )
    assert count == 1

    client.delete(f"/api/v1/fixtures/{unique_id}")
