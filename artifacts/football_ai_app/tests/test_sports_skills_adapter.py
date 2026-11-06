from football_ai.integrations.sports_skills_client import elo_to_xg, event_to_fixture_payload, status


def test_elo_to_xg_home_favorite():
    hx, ax = elo_to_xg(1800, 1500)
    assert hx > ax
    assert hx > 0.35 and ax > 0.35


def test_elo_to_xg_away_favorite():
    hx, ax = elo_to_xg(1400, 1700)
    assert ax > hx


def test_event_to_fixture_payload():
    event = {
        "id": "999",
        "status": "closed",
        "start_time": "2026-11-03T20:00:00Z",
        "competition": {"id": "premier-league", "name": "Premier League"},
        "season": {"year": "2025/26"},
        "competitors": [
            {"qualifier": "home", "score": 2, "team": {"id": "1", "name": "Arsenal"}},
            {"qualifier": "away", "score": 1, "team": {"id": "2", "name": "Chelsea"}},
        ],
    }
    p = event_to_fixture_payload(event)
    assert p["id"] == "espn-999"
    assert p["home_team"] == "Arsenal"
    assert p["away_team"] == "Chelsea"
    assert p["home_goals"] == 2
    assert p["source"] == "sports-skills"


def test_status_dict():
    s = status()
    assert "available" in s
    assert "package" in s
