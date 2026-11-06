"""Aggregate prematch + live matches from all available providers."""
from __future__ import annotations

from typing import Any

from football_ai.config import settings
from football_ai.providers import api_football, espn, sofascore
from football_ai.providers.models import UnifiedMatch


def providers_status() -> dict[str, Any]:
    return {
        "espn": espn.status(),
        "sofascore": sofascore.status(),
        "api_football": api_football.status(),
    }


def live_board() -> dict[str, Any]:
    errors: dict[str, str] = {}
    matches: list[UnifiedMatch] = []

    sofa, err = sofascore.live_matches()
    if err:
        errors["sofascore"] = err
    matches.extend(sofa)

    if not matches and espn.available():
        try:
            for m in espn.day_matches():
                if m.status == "live":
                    matches.append(m)
        except Exception as exc:  # noqa: BLE001
            errors["espn"] = str(exc)

    if not matches and api_football.available():
        from datetime import date

        apif, err = api_football.day_matches(date.today().isoformat())
        if err:
            errors["api_football"] = err
        matches.extend([m for m in apif if m.status == "live"])

    return {
        "count": len(matches),
        "matches": [m.to_dict() for m in matches],
        "errors": errors,
        "providers": providers_status(),
    }


def prematch_board(date: str | None = None) -> dict[str, Any]:
    errors: dict[str, str] = {}
    by_id: dict[str, UnifiedMatch] = {}

    if espn.available():
        try:
            for m in espn.day_matches(date=date):
                by_id[m.id] = m
        except Exception as exc:  # noqa: BLE001
            errors["espn"] = str(exc)

    if api_football.available() and date:
        apif, err = api_football.day_matches(date)
        if err:
            errors["api_football"] = err
        for m in apif:
            if m.id not in by_id:
                by_id[m.id] = m

    if sofascore.available():
        sofa, err = sofascore.day_matches(date or "today")
        if err:
            errors["sofascore"] = err
        for m in sofa:
            if m.id not in by_id:
                by_id[m.id] = m

    matches = list(by_id.values())
    matches.sort(key=lambda m: (m.kickoff_utc or "", m.competition, m.home_team))
    return {
        "date": date,
        "count": len(matches),
        "matches": [m.to_dict() for m in matches],
        "errors": errors,
        "providers": providers_status(),
    }


def predict_match(
    *,
    home_team: str,
    away_team: str,
    home_team_id: str | None = None,
    away_team_id: str | None = None,
    home_xg: float | None = None,
    away_xg: float | None = None,
    rho: float | None = None,
) -> dict[str, Any]:
    from football_ai.agents.graph import build_graph

    xg_meta: dict[str, Any] = {"method": "manual_or_prior"}
    if home_xg is None or away_xg is None:
        est = (
            espn.estimate_xg(home_team_id, away_team_id)
            if espn.available()
            else {"home_xg": 1.45, "away_xg": 1.15, "method": "prior"}
        )
        home_xg = float(est.get("home_xg", 1.45))
        away_xg = float(est.get("away_xg", 1.15))
        xg_meta = {k: est.get(k) for k in ("method", "detail") if k in est}

    rho = settings.default_rho if rho is None else rho
    result = build_graph().invoke(
        {
            "fixture_id": f"hub-{home_team}-{away_team}",
            "home_xg": home_xg,
            "away_xg": away_xg,
            "rho": rho,
        }
    )
    if result.get("quality_status") != "ok":
        raise ValueError("invalid xG")
    probs = result["probabilities"]
    return {
        "home_team": home_team,
        "away_team": away_team,
        "home_xg": home_xg,
        "away_xg": away_xg,
        "rho": rho,
        "xg_meta": xg_meta,
        "model_version": settings.model_version,
        **probs,
        "top_scores": result.get("top_scores"),
        "score_matrix": result.get("matrix"),
        "sources": [
            "dixon-coles",
            "sports-skills/clubelo" if xg_meta.get("method") == "clubelo" else "prior",
        ],
    }
