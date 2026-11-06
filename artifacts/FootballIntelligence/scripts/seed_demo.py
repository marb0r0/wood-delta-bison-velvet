"""Seed a few demo fixtures and predictions for local exploration."""
from football_ai.db import SessionLocal, Base, engine
from football_ai.models import Fixture, Prediction
from football_ai.agents.graph import build_graph
from football_ai.config import settings

Base.metadata.create_all(bind=engine)
workflow = build_graph()

DEMOS = [
    {
        "id": "pl-2025-ars-che",
        "competition": "Premier League",
        "season": "2025/26",
        "home_team": "Arsenal",
        "away_team": "Chelsea",
        "home_xg": 1.75,
        "away_xg": 1.15,
    },
    {
        "id": "liga-2025-ben-spo",
        "competition": "Liga Portugal",
        "season": "2025/26",
        "home_team": "Benfica",
        "away_team": "Sporting",
        "home_xg": 1.60,
        "away_xg": 1.45,
    },
    {
        "id": "ucl-2025-rma-mci",
        "competition": "Champions League",
        "season": "2025/26",
        "home_team": "Real Madrid",
        "away_team": "Manchester City",
        "home_xg": 1.85,
        "away_xg": 1.70,
    },
]


def main():
    db = SessionLocal()
    try:
        for d in DEMOS:
            if db.get(Fixture, d["id"]):
                print(f"skip {d['id']} (exists)")
                continue
            fx = Fixture(
                id=d["id"],
                competition=d["competition"],
                season=d["season"],
                home_team=d["home_team"],
                away_team=d["away_team"],
                source="seed",
            )
            db.add(fx)
            db.flush()

            result = workflow.invoke(
                {
                    "fixture_id": d["id"],
                    "home_xg": d["home_xg"],
                    "away_xg": d["away_xg"],
                    "rho": settings.default_rho,
                }
            )
            probs = result["probabilities"]
            pred = Prediction(
                fixture_id=d["id"],
                model_version=settings.model_version,
                home_xg=d["home_xg"],
                away_xg=d["away_xg"],
                home_win=probs["home_win"],
                draw=probs["draw"],
                away_win=probs["away_win"],
                over_2_5=probs["over_2_5"],
                btts_yes=probs["btts_yes"],
            )
            db.add(pred)
            print(f"seeded {d['id']}: 1={probs['home_win']:.1%} X={probs['draw']:.1%} 2={probs['away_win']:.1%}")
        db.commit()
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
