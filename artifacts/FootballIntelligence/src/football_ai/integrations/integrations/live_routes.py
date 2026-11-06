"""Live + prematch routes (multi-provider hub)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from football_ai.db import get_db
from football_ai.integrations import sports_skills_client as ss
from football_ai.models import Fixture
from football_ai.providers import hub

router = APIRouter(prefix="/api/v1/live", tags=["live"])


class HubPredictBody(BaseModel):
    home_team: str
    away_team: str
    home_team_id: str | None = None
    away_team_id: str | None = None
    home_xg: float | None = Field(default=None, gt=0, le=6)
    away_xg: float | None = Field(default=None, gt=0, le=6)
    rho: float | None = None


@router.get("/status")
def live_status():
    return {
        "sports_skills": ss.status(),
        "providers": hub.providers_status(),
    }


@router.get("/board")
def live_board():
    """Live matches from Sofascore (if available) / ESPN / API-Football."""
    return hub.live_board()


@router.get("/prematch")
def prematch_board(date: str | None = Query(None, description="YYYY-MM-DD")):
    """Prematch schedule for a day (ESPN primary)."""
    return hub.prematch_board(date=date)


@router.post("/predict")
def hub_predict(body: HubPredictBody):
    try:
        return hub.predict_match(
            home_team=body.home_team,
            away_team=body.away_team,
            home_team_id=body.home_team_id,
            away_team_id=body.away_team_id,
            home_xg=body.home_xg,
            away_xg=body.away_xg,
            rho=body.rho,
        )
    except ValueError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, detail=str(exc)) from exc


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
    """Alias: day schedule simplified (ESPN)."""
    board = hub.prematch_board(date=date)
    return {"date": board.get("date"), "events": board.get("matches"), "errors": board.get("errors")}


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
    if not ss.available():
        raise HTTPException(503, detail=ss.status())
    try:
        data = ss.daily_schedule(date=date)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, detail=str(exc)) from exc

    events = (data or {}).get("events") if isinstance(data, dict) else (data or [])
    created, updated = [], []
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
        "created_ids": created[:50],
        "updated_ids": updated[:50],
    }
