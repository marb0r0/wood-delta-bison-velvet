from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column
from football_ai.db import Base

class Fixture(Base):
    __tablename__ = "fixtures"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    competition: Mapped[str] = mapped_column(String(160))
    season: Mapped[str | None] = mapped_column(String(40), nullable=True)
    kickoff_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    home_team: Mapped[str] = mapped_column(String(160))
    away_team: Mapped[str] = mapped_column(String(160))
    home_goals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_goals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(80), default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Prediction(Base):
    __tablename__ = "predictions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fixture_id: Mapped[str] = mapped_column(ForeignKey("fixtures.id"))
    model_version: Mapped[str] = mapped_column(String(80))
    predicted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    home_xg: Mapped[float] = mapped_column(Float)
    away_xg: Mapped[float] = mapped_column(Float)
    home_win: Mapped[float] = mapped_column(Float)
    draw: Mapped[float] = mapped_column(Float)
    away_win: Mapped[float] = mapped_column(Float)
    over_2_5: Mapped[float] = mapped_column(Float)
    btts_yes: Mapped[float] = mapped_column(Float)
