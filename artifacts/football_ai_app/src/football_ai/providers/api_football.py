"""Optional API-Football provider (pattern from karidasd/football-predictions).

Set env API_FOOTBALL_KEY to enable. Free tier has strict rate limits.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from football_ai.providers.models import UnifiedMatch

API_URL = "https://v3.football.api-sports.io"


def available() -> bool:
    return bool(os.environ.get("API_FOOTBALL_KEY"))


def status() -> dict[str, Any]:
    return {
        "provider": "api-football",
        "available": available(),
        "source": "https://github.com/karidasd/football-predictions",
        "note": "Requires API_FOOTBALL_KEY",
    }


def _headers() -> dict[str, str]:
    return {"x-apisports-key": os.environ["API_FOOTBALL_KEY"]}


def day_matches(date: str) -> tuple[list[UnifiedMatch], str | None]:
    if not available():
        return [], "API_FOOTBALL_KEY not set"
    try:
        with httpx.Client(timeout=20) as client:
            r = client.get(f"{API_URL}/fixtures", headers=_headers(), params={"date": date})
            r.raise_for_status()
            rows = r.json().get("response") or []
        out: list[UnifiedMatch] = []
        for f in rows:
            fix = f.get("fixture") or {}
            league = f.get("league") or {}
            teams = f.get("teams") or {}
            goals = f.get("goals") or {}
            status_short = ((fix.get("status") or {}).get("short") or "").upper()
            if status_short in {"1H", "2H", "HT", "ET", "BT", "P", "LIVE"}:
                st = "live"
            elif status_short in {"FT", "AET", "PEN"}:
                st = "finished"
            else:
                st = "scheduled"
            home = teams.get("home") or {}
            away = teams.get("away") or {}
            out.append(
                UnifiedMatch(
                    id=f"apifb-{fix.get('id')}",
                    source="api-football",
                    competition=league.get("name") or "API-Football",
                    home_team=home.get("name") or "?",
                    away_team=away.get("name") or "?",
                    status=st,
                    kickoff_utc=fix.get("date"),
                    season=str(league.get("season") or ""),
                    home_goals=goals.get("home"),
                    away_goals=goals.get("away"),
                    minute=str((fix.get("status") or {}).get("elapsed") or "") or None,
                    home_team_id=str(home.get("id") or "") or None,
                    away_team_id=str(away.get("id") or "") or None,
                    external_id=str(fix.get("id") or ""),
                )
            )
        return out, None
    except Exception as exc:  # noqa: BLE001
        return [], str(exc)


def fixture_prediction(fixture_id: str) -> dict[str, Any] | None:
    if not available():
        return None
    try:
        with httpx.Client(timeout=20) as client:
            r = client.get(
                f"{API_URL}/predictions",
                headers=_headers(),
                params={"fixture": fixture_id},
            )
            r.raise_for_status()
            rows = r.json().get("response") or []
            return rows[0] if rows else None
    except Exception:  # noqa: BLE001
        return None
