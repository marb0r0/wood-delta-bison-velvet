from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from football_ai.config import settings
from football_ai.db import Base, engine, get_db
from football_ai.models import Fixture, Prediction
from football_ai.schemas import (
    FixtureCreate,
    FixtureOut,
    FixtureUpdate,
    HealthOut,
    PredictRequest,
    PredictionOut,
)
from football_ai.agents.graph import build_graph
from football_ai.integrations.live_routes import router as live_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables automatically for SQLite / local development
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Global Football Intelligence API",
    description="Plataforma de previsão de futebol com Dixon-Coles, XGBoost, LangGraph e sports-skills",
    version="0.4.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

workflow = build_graph()

app.include_router(live_router)


@app.get("/health", response_model=HealthOut)
def health():
    from football_ai.integrations import sports_skills_client as ss

    return {
        "status": "ok",
        "environment": settings.app_env,
        "model_version": settings.model_version,
        "sports_skills": ss.status(),
    }


@app.post("/api/v1/fixtures", response_model=FixtureOut, status_code=201)
def create_fixture(payload: FixtureCreate, db: Session = Depends(get_db)):
    if db.get(Fixture, payload.id):
        raise HTTPException(status_code=409, detail="Fixture já existe")
    fixture = Fixture(**payload.model_dump())
    db.add(fixture)
    db.commit()
    db.refresh(fixture)
    return fixture


@app.get("/api/v1/fixtures", response_model=list[FixtureOut])
def list_fixtures(
    limit: int = Query(50, ge=1, le=200),
    competition: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Fixture)
    if competition:
        q = q.filter(Fixture.competition.ilike(f"%{competition}%"))
    return q.order_by(Fixture.created_at.desc()).limit(limit).all()


@app.get("/api/v1/fixtures/{fixture_id}", response_model=FixtureOut)
def get_fixture(fixture_id: str, db: Session = Depends(get_db)):
    fixture = db.get(Fixture, fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture não encontrado")
    return fixture


@app.patch("/api/v1/fixtures/{fixture_id}", response_model=FixtureOut)
def update_fixture(fixture_id: str, payload: FixtureUpdate, db: Session = Depends(get_db)):
    fixture = db.get(Fixture, fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture não encontrado")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(fixture, k, v)
    db.commit()
    db.refresh(fixture)
    return fixture


@app.delete("/api/v1/fixtures/{fixture_id}", status_code=204)
def delete_fixture(fixture_id: str, db: Session = Depends(get_db)):
    fixture = db.get(Fixture, fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture não encontrado")
    db.query(Prediction).filter(Prediction.fixture_id == fixture_id).delete()
    db.delete(fixture)
    db.commit()


@app.post("/api/v1/fixtures/{fixture_id}/predict", response_model=PredictionOut)
def predict_fixture(
    fixture_id: str,
    body: PredictRequest | None = None,
    home_xg: float | None = Query(None, gt=0, le=6),
    away_xg: float | None = Query(None, gt=0, le=6),
    db: Session = Depends(get_db),
):
    fixture = db.get(Fixture, fixture_id)
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture não encontrado")

    # Prefer body, fall back to query params, then defaults
    hx = (body.home_xg if body else None) or home_xg or 1.45
    ax = (body.away_xg if body else None) or away_xg or 1.10
    rho = body.rho if body and body.rho is not None else settings.default_rho

    result = workflow.invoke(
        {
            "fixture_id": fixture_id,
            "home_xg": hx,
            "away_xg": ax,
            "rho": rho,
        }
    )
    if result.get("quality_status") != "ok":
        raise HTTPException(status_code=422, detail="xG inválidos (devem ser > 0)")

    probs = result["probabilities"]
    record = Prediction(
        fixture_id=fixture_id,
        model_version=settings.model_version,
        home_xg=hx,
        away_xg=ax,
        home_win=probs["home_win"],
        draw=probs["draw"],
        away_win=probs["away_win"],
        over_2_5=probs["over_2_5"],
        btts_yes=probs["btts_yes"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "fixture_id": fixture_id,
        "model_version": settings.model_version,
        "predicted_at": record.predicted_at,
        "home_xg": hx,
        "away_xg": ax,
        "home_win": probs["home_win"],
        "draw": probs["draw"],
        "away_win": probs["away_win"],
        "over_2_5": probs["over_2_5"],
        "btts_yes": probs["btts_yes"],
        "score_matrix": result["matrix"],
        "most_likely_score": probs.get("most_likely_score"),
    }


@app.get("/api/v1/fixtures/{fixture_id}/predictions", response_model=list[PredictionOut])
def prediction_history(fixture_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(Prediction)
        .filter(Prediction.fixture_id == fixture_id)
        .order_by(Prediction.predicted_at.desc())
        .all()
    )
    return [
        PredictionOut(
            id=r.id,
            fixture_id=r.fixture_id,
            model_version=r.model_version,
            predicted_at=r.predicted_at,
            home_xg=r.home_xg,
            away_xg=r.away_xg,
            home_win=r.home_win,
            draw=r.draw,
            away_win=r.away_win,
            over_2_5=r.over_2_5,
            btts_yes=r.btts_yes,
        )
        for r in rows
    ]


@app.get("/api/v1/predictions/latest", response_model=list[PredictionOut])
def latest_predictions(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    rows = db.query(Prediction).order_by(Prediction.predicted_at.desc()).limit(limit).all()
    return [
        PredictionOut(
            id=r.id,
            fixture_id=r.fixture_id,
            model_version=r.model_version,
            predicted_at=r.predicted_at,
            home_xg=r.home_xg,
            away_xg=r.away_xg,
            home_win=r.home_win,
            draw=r.draw,
            away_win=r.away_win,
            over_2_5=r.over_2_5,
            btts_yes=r.btts_yes,
        )
        for r in rows
    ]


@app.post("/api/v1/predict/quick")
def quick_predict(body: PredictRequest):
    """Previsão rápida sem gravar fixture (útil para exploração)."""
    rho = body.rho if body.rho is not None else settings.default_rho
    result = workflow.invoke(
        {
            "fixture_id": "quick",
            "home_xg": body.home_xg,
            "away_xg": body.away_xg,
            "rho": rho,
        }
    )
    if result.get("quality_status") != "ok":
        raise HTTPException(status_code=422, detail="xG inválidos")
    probs = result["probabilities"]
    return {
        "model_version": settings.model_version,
        "home_xg": body.home_xg,
        "away_xg": body.away_xg,
        "rho": rho,
        **probs,
        "top_scores": result.get("top_scores", []),
        "score_matrix": result["matrix"],
    }
