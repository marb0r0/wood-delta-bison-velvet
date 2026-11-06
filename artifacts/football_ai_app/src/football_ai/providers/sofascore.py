"""Live/prematch via EasySoccerData (Sofascore).

Requires: pip install EasySoccerData curl_cffi
May be blocked from some datacenter IPs — returns empty with error in status.
"""
from __future__ import annotations

from typing import Any

from football_ai.providers.models import UnifiedMatch

_ERR: str | None = None
_Client = None
try:
    from esd import SofascoreClient as _Client  # type: ignore
except Exception as exc:  # noqa: BLE001
    _ERR = str(exc)


def available() -> bool:
    return _Client is not None


def status() -> dict[str, Any]:
    return {
        "provider": "sofascore/EasySoccerData",
        "available": available(),
        "error": _ERR,
        "source": "https://github.com/manucabral/EasySoccerData",
    }


def _event_to_match(ev: Any, live: bool = False) -> UnifiedMatch | None:
    try:
        # EasySoccerData Event objects expose attributes; also accept dicts
        def g(obj, *names, default=None):
            if isinstance(obj, dict):
                for n in names:
                    if n in obj:
                        return obj[n]
                return default
            for n in names:
                if hasattr(obj, n):
                    return getattr(obj, n)
            return default

        eid = g(ev, "id", "event_id")
        home = g(ev, "home_team", "homeTeam")
        away = g(ev, "away_team", "awayTeam")
        home_name = g(home, "name", "short_name") if home else g(ev, "home_name")
        away_name = g(away, "name", "short_name") if away else g(ev, "away_name")
        if not home_name or not away_name:
            return None
        home_id = str(g(home, "id") or "") or None
        away_id = str(g(away, "id") or "") or None
        score = g(ev, "score", "scores", "home_score")
        hg = ag = None
        if isinstance(score, dict):
            hg = score.get("home") or score.get("current", {}).get("home") if isinstance(score.get("current"), dict) else score.get("home")
            ag = score.get("away") or score.get("current", {}).get("away") if isinstance(score.get("current"), dict) else score.get("away")
        else:
            hg = g(ev, "home_score", "homeScore")
            ag = g(ev, "away_score", "awayScore")
        try:
            hg = int(hg) if hg is not None else None
            ag = int(ag) if ag is not None else None
        except (TypeError, ValueError):
            hg = ag = None
        tournament = g(ev, "tournament", "league", "competition")
        comp_name = g(tournament, "name") if tournament else "Sofascore"
        status_obj = g(ev, "status")
        status_desc = g(status_obj, "description", "type") if status_obj else None
        if live:
            st = "live"
        else:
            desc = str(status_desc or "").lower()
            if "live" in desc or "inprogress" in desc or "halftime" in desc:
                st = "live"
            elif "end" in desc or "finish" in desc or "closed" in desc:
                st = "finished"
            else:
                st = "scheduled"
        start = g(ev, "start_timestamp", "startTimestamp", "start_time")
        minute = g(ev, "time", "minute", "status_time")
        if hasattr(minute, "minute"):
            minute = getattr(minute, "minute", None)
        return UnifiedMatch(
            id=f"sofa-{eid}",
            source="sofascore",
            competition=str(comp_name or "Sofascore"),
            home_team=str(home_name),
            away_team=str(away_name),
            status=st,
            kickoff_utc=str(start) if start else None,
            home_goals=hg,
            away_goals=ag,
            minute=str(minute) if minute is not None else None,
            home_team_id=home_id,
            away_team_id=away_id,
            external_id=str(eid) if eid is not None else None,
        )
    except Exception:  # noqa: BLE001
        return None


def live_matches() -> tuple[list[UnifiedMatch], str | None]:
    if not available():
        return [], _ERR or "EasySoccerData not installed"
    try:
        client = _Client()
        events = client.get_events(live=True) or []
        matches = []
        for ev in events:
            m = _event_to_match(ev, live=True)
            if m:
                matches.append(m)
        return matches, None
    except Exception as exc:  # noqa: BLE001
        return [], str(exc)


def day_matches(date: str = "today") -> tuple[list[UnifiedMatch], str | None]:
    if not available():
        return [], _ERR or "EasySoccerData not installed"
    try:
        client = _Client()
        events = client.get_events(date=date, live=False) or []
        matches = []
        for ev in events:
            m = _event_to_match(ev, live=False)
            if m:
                matches.append(m)
        return matches, None
    except Exception as exc:  # noqa: BLE001
        return [], str(exc)
