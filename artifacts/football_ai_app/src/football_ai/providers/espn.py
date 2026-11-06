"""ESPN / ClubElo via sports-skills (prematch schedule + strength)."""
from __future__ import annotations

from typing import Any

from football_ai.integrations import sports_skills_client as ss
from football_ai.providers.models import UnifiedMatch


def available() -> bool:
    return ss.available()


def status() -> dict[str, Any]:
    return {"provider": "espn/sports-skills", **ss.status()}


def _map_status(raw: str | None) -> str:
    s = (raw or "").lower()
    if s in {"closed", "final", "post", "finished"}:
        return "finished"
    if s in {"in", "live", "halftime", "ht"}:
        return "live"
    if s in {"pre", "scheduled", "notstarted", "ns"}:
        return "scheduled"
    return "unknown"


def day_matches(date: str | None = None) -> list[UnifiedMatch]:
    if not available():
        return []
    data = ss.daily_schedule(date=date)
    events = (data or {}).get("events") or []
    out: list[UnifiedMatch] = []
    for ev in events:
        payload = ss.event_to_fixture_payload(ev)
        meta = payload.get("meta") or {}
        kick = payload.get("kickoff_utc")
        kick_s = kick.isoformat() if hasattr(kick, "isoformat") else (str(kick) if kick else None)
        out.append(
            UnifiedMatch(
                id=payload["id"],
                source="espn",
                competition=payload["competition"],
                home_team=payload["home_team"],
                away_team=payload["away_team"],
                status=_map_status(meta.get("status")),
                kickoff_utc=kick_s,
                season=payload.get("season"),
                home_goals=payload.get("home_goals"),
                away_goals=payload.get("away_goals"),
                home_team_id=meta.get("home_team_id"),
                away_team_id=meta.get("away_team_id"),
                external_id=meta.get("espn_event_id"),
                extras={"raw_status": meta.get("status")},
            )
        )
    return out


def estimate_xg(home_team_id: str | None, away_team_id: str | None) -> dict[str, Any]:
    return ss.estimate_xg_for_teams(home_team_id, away_team_id)
