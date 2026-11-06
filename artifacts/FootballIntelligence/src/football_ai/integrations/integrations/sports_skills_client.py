"""Adapter over machina-sports/sports-skills (football module).

Optional dependency: pip install sports-skills
(or PYTHONPATH to a local checkout of the repo).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

_IMPORT_ERROR: str | None = None
try:
    from sports_skills import football as _fb
except Exception as exc:  # noqa: BLE001
    _fb = None
    _IMPORT_ERROR = str(exc)


def available() -> bool:
    return _fb is not None


def status() -> dict[str, Any]:
    return {
        "available": available(),
        "error": _IMPORT_ERROR,
        "package": "sports-skills",
        "source": "https://github.com/machina-sports/sports-skills",
    }


def _require():
    if _fb is None:
        raise RuntimeError(
            "sports-skills não está instalado. Corre: pip install sports-skills\n"
            f"Detalhe: {_IMPORT_ERROR}"
        )
    return _fb


def _unwrap(resp: dict) -> Any:
    """sports-skills returns {status, data} or similar."""
    if not isinstance(resp, dict):
        return resp
    if resp.get("status") is False:
        msg = resp.get("message") or resp.get("error") or "sports-skills error"
        raise RuntimeError(str(msg))
    return resp.get("data", resp)


def list_competitions() -> list[dict]:
    fb = _require()
    data = _unwrap(fb.get_competitions())
    if isinstance(data, dict):
        return list(data.get("competitions") or data.get("items") or [])
    return list(data or [])


def daily_schedule(date: str | None = None) -> dict:
    fb = _require()
    data = _unwrap(fb.get_daily_schedule(date=date))
    return data if isinstance(data, dict) else {"events": data or []}


def season_standings(season_id: str) -> Any:
    fb = _require()
    return _unwrap(fb.get_season_standings(season_id=season_id))


def current_season(competition_id: str) -> Any:
    fb = _require()
    return _unwrap(fb.get_current_season(competition_id=competition_id))


def search_team(query: str, competition_id: str | None = None) -> Any:
    fb = _require()
    return _unwrap(fb.search_team(query=query, competition_id=competition_id))


def team_strength(team_id: str, team_id_2: str | None = None) -> Any:
    fb = _require()
    return _unwrap(fb.get_team_strength(team_id=team_id, team_id_2=team_id_2))


def match_forecast(team_id: str, team_id_2: str | None = None) -> Any:
    fb = _require()
    return _unwrap(fb.get_match_forecast(team_id=team_id, team_id_2=team_id_2))


def event_xg(event_id: str) -> Any:
    fb = _require()
    return _unwrap(fb.get_event_xg(event_id=event_id))


def parse_event_teams(event: dict) -> tuple[str, str, str | None, str | None, int | None, int | None]:
    """Return home_name, away_name, home_id, away_id, home_goals, away_goals."""
    home_name, away_name = "Home", "Away"
    home_id = away_id = None
    home_goals = away_goals = None
    comps = event.get("competitors") or []
    for c in comps:
        team = c.get("team") or {}
        name = team.get("name") or team.get("short_name") or "?"
        tid = str(team.get("id")) if team.get("id") is not None else None
        q = (c.get("qualifier") or "").lower()
        score = c.get("score")
        if q == "home":
            home_name, home_id = name, tid
            if score is not None:
                home_goals = int(score)
        elif q == "away":
            away_name, away_id = name, tid
            if score is not None:
                away_goals = int(score)
    scores = event.get("scores") or {}
    if home_goals is None and scores.get("home") is not None:
        home_goals = int(scores["home"])
    if away_goals is None and scores.get("away") is not None:
        away_goals = int(scores["away"])
    return home_name, away_name, home_id, away_id, home_goals, away_goals


def event_to_fixture_payload(event: dict) -> dict:
    home, away, home_id, away_id, hg, ag = parse_event_teams(event)
    comp = event.get("competition") or {}
    season = event.get("season") or {}
    eid = str(event.get("id"))
    kickoff = event.get("start_time")
    kickoff_dt = None
    if kickoff:
        try:
            kickoff_dt = datetime.fromisoformat(str(kickoff).replace("Z", "+00:00"))
        except ValueError:
            kickoff_dt = None
    status = (event.get("status") or "").lower()
    # only persist final scores when closed/final
    if status not in {"closed", "final", "post"}:
        hg = ag = None
    return {
        "id": f"espn-{eid}",
        "competition": comp.get("name") or comp.get("id") or "Unknown",
        "season": season.get("name") or season.get("year") or season.get("id"),
        "kickoff_utc": kickoff_dt,
        "home_team": home,
        "away_team": away,
        "home_goals": hg,
        "away_goals": ag,
        "source": "sports-skills",
        "meta": {
            "espn_event_id": eid,
            "home_team_id": home_id,
            "away_team_id": away_id,
            "status": event.get("status"),
        },
    }


def elo_to_xg(home_elo: float, away_elo: float, avg_goals: float = 2.55) -> tuple[float, float]:
    """Map Elo difference to expected goals with a mild home advantage."""
    diff = home_elo - away_elo
    # logistic share of total goals for the home side
    home_share = 1.0 / (1.0 + 10 ** (-diff / 400.0))
    # home advantage ~0.25 goals equivalent boost via share shift
    home_share = min(0.85, max(0.15, home_share + 0.04))
    home_xg = round(avg_goals * home_share, 3)
    away_xg = round(avg_goals * (1.0 - home_share), 3)
    # floor
    return max(0.35, home_xg), max(0.35, away_xg)


def estimate_xg_for_teams(home_team_id: str | None, away_team_id: str | None) -> dict[str, Any]:
    """Best-effort xG from ClubElo strength; falls back to neutral priors."""
    result: dict[str, Any] = {
        "home_xg": 1.45,
        "away_xg": 1.15,
        "method": "prior",
        "detail": None,
    }
    if not home_team_id or not away_team_id:
        return result
    try:
        data = team_strength(team_id=str(home_team_id), team_id_2=str(away_team_id))
        result["detail"] = data
        # Flexible parsing of ClubElo payload
        home_elo = away_elo = None
        if isinstance(data, dict):
            teams = data.get("teams") or data.get("team") or data
            if isinstance(teams, list) and len(teams) >= 2:
                home_elo = float(teams[0].get("elo") or teams[0].get("rating") or 1500)
                away_elo = float(teams[1].get("elo") or teams[1].get("rating") or 1500)
            elif isinstance(teams, dict):
                t1 = teams.get("team") or teams.get(str(home_team_id)) or teams.get("home")
                t2 = teams.get("team_2") or teams.get(str(away_team_id)) or teams.get("away")
                if isinstance(t1, dict):
                    home_elo = float(t1.get("elo") or t1.get("rating") or 1500)
                if isinstance(t2, dict):
                    away_elo = float(t2.get("elo") or t2.get("rating") or 1500)
            if home_elo is None and "elo" in data:
                home_elo = float(data["elo"])
            if away_elo is None and data.get("elo_2") is not None:
                away_elo = float(data["elo_2"])
            if home_elo is None and data.get("difference") is not None:
                # only diff known
                diff = float(data["difference"])
                home_elo, away_elo = 1500 + diff / 2, 1500 - diff / 2
        if home_elo is not None and away_elo is not None:
            hx, ax = elo_to_xg(home_elo, away_elo)
            result.update(home_xg=hx, away_xg=ax, method="clubelo")
    except Exception as exc:  # noqa: BLE001
        result["detail"] = {"error": str(exc)}
    return result
