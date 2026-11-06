from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class FixtureCreate(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    competition: str
    season: str | None = None
    kickoff_utc: datetime | None = None
    home_team: str
    away_team: str
    home_goals: int | None = Field(default=None, ge=0)
    away_goals: int | None = Field(default=None, ge=0)
    source: str = "manual"

    @model_validator(mode="after")
    def both_scores_or_none(self):
        if (self.home_goals is None) != (self.away_goals is None):
            raise ValueError("home_goals and away_goals must both be set or both be null")
        return self


class FixtureUpdate(BaseModel):
    home_goals: int | None = Field(default=None, ge=0)
    away_goals: int | None = Field(default=None, ge=0)
    kickoff_utc: datetime | None = None

    @model_validator(mode="after")
    def both_scores_or_none(self):
        if self.home_goals is not None or self.away_goals is not None:
            if (self.home_goals is None) != (self.away_goals is None):
                raise ValueError("home_goals and away_goals must both be set or both be null")
        return self


class FixtureOut(FixtureCreate):
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class PredictRequest(BaseModel):
    home_xg: float = Field(default=1.45, gt=0, le=6.0)
    away_xg: float = Field(default=1.10, gt=0, le=6.0)
    rho: float | None = Field(default=None, ge=-1.0, le=1.0)


class PredictionOut(BaseModel):
    id: int | None = None
    fixture_id: str
    model_version: str
    predicted_at: datetime | None = None
    home_xg: float
    away_xg: float
    home_win: float
    draw: float
    away_win: float
    over_2_5: float
    btts_yes: float
    score_matrix: list[list[float]] | None = None
    most_likely_score: str | None = None

    model_config = {"from_attributes": True}


class HealthOut(BaseModel):
    status: str
    environment: str
    model_version: str
    sports_skills: dict | None = None
