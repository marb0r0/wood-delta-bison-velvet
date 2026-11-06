"""Live football data routes powered by sports-skills."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from football_ai.db import get_db
from football_ai.integrations import sports_skills_client as ss
from football_ai.models import Fixture

router = APIRouter(prefix="/api/v1/live", tags=["live"])


@router.get("/status")
def live_status():
    return ss.status()


@router.get("/competitions")
def live_competitions():
    if not ss.available():
        raise HTTPException(503, detail=ss.status())
    try:
        return {"competitions": ss.list_competitions()}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, detail=str(exc)) from exc


@router.get("/schedule")
def live_schedule(date: str | None = Query(None, description="YYYY-MM-DD")):
    if not ss.available():
        raise HTTPException(503, detail=ss.status())
    try:
        data = ss.daily_schedule(date=date)
        events = data.get("events") if isinstance(data, dict) else data
        events = events or []
        simplified = []
        for ev in events:
            payload = ss.event_to_fixture_payload(ev)
            simplified.append(
                {
                    **{k: v for k, v in payload.items() if k != "meta"},
                    "espn_event_id": (payload.get("meta") or {}).get("espn_event_id"),
                    "home_team_id": (payload.get("meta") or {}).get("home_team_id"),
                    "away_team_id": (payload.get("meta") or {}).get("away_team_id"),
                    "status": (payload.get("meta") or {}).get("status"),
                }
            )
        return {"date": (data or {}).get("date") if isinstance(data, dict) else date, "events": simplified}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, detail=str(exc)) from exc


@router.get("/standings/{season_id}")
def live_standings(season_id: str):
    if not ss.available():
        raise HTTPException(503, detail=ss.status())
    try:
        return ss.season_standings(season_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, detail=str(exc)) from exc


@router.get("/season/{competition_id}")
def live_current_season(competition_id: str):
    if not ss.available():
        raise HTTPException(503, detail=ss.status())
    try:
        return ss.current_season(competition_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, detail=str(exc)) from exc


@router.get("/search/team")
def live_search_team(q: str = Query(..., min_length=2), competition_id: str | None = None):
    if not ss.available():
        raise HTTPException(503, detail=ss.status())
    try:
        return ss.search_team(q, competition_id=competition_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, detail=str(exc)) from exc


@router.get("/xg-estimate")
def live_xg_estimate(home_team_id: str, away_team_id: str):
    if not ss.available():
        raise HTTPException(503, detail=ss.status())
    return ss.estimate_xg_for_teams(home_team_id, away_team_id)


@router.post("/import-schedule")
def import_schedule(
    date: str | None = Query(None, description="YYYY-MM-DD"),
    competition: str | None = Query(None, description="Filter by competition name substring"),
    db: Session = Depends(get_db),
):
    """Import live schedule events into local fixtures table."""
    if not ss.available():
        raise HTTPException(503, detail=ss.status())
    try:
        data = ss.daily_schedule(date=date)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, detail=str(exc)) from exc

    events = (data or {}).get("events") if isinstance(data, dict) else (data or [])
    created, skipped, updated = [], [], []
    for ev in events or []:
        payload = ss.event_to_fixture_payload(ev)
        if competition and competition.lower() not in (payload["competition"] or "").lower():
            continue
        existing = db.get(Fixture, payload["id"])
        fields = {
            "competition": payload["competition"],
            "season": payload.get("season"),
            "kickoff_utc": payload.get("kickoff_utc"),
            "home_team": payload["home_team"],
            "away_team": payload["away_team"],
            "home_goals": payload.get("home_goals"),
            "away_goals": payload.get("away_goals"),
            "source": "sports-skills",
        }
        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
            updated.append(payload["id"])
        else:
            db.add(Fixture(id=payload["id"], **fields))
            created.append(payload["id"])
    db.commit()
    return {
        "created": len(created),
        "updated": len(updated),
        "skipped": len(skipped),
        "created_ids": created[:50],
        "updated_ids": updated[:50],
    }
