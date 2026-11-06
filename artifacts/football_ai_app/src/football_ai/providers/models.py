from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class UnifiedMatch:
    id: str
    source: str
    competition: str
    home_team: str
    away_team: str
    status: str  # scheduled | live | finished | unknown
    kickoff_utc: str | None = None
    season: str | None = None
    home_goals: int | None = None
    away_goals: int | None = None
    minute: str | None = None
    home_team_id: str | None = None
    away_team_id: str | None = None
    external_id: str | None = None
    home_xg: float | None = None
    away_xg: float | None = None
    odds: dict[str, Any] | None = None
    extras: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
