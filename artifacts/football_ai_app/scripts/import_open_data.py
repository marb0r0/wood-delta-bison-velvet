"""Example importer for StatsBomb open-data matches JSON.

Usage:
  python scripts/import_open_data.py data/raw/matches.json --competition "Example"
This starter deliberately does not scrape websites or bypass provider terms.
"""
import argparse, json
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from football_ai.db import SessionLocal
from football_ai.models import Fixture

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file")
    parser.add_argument("--competition", default="StatsBomb Open Data")
    args = parser.parse_args()
    payload = json.loads(Path(args.json_file).read_text())
    db: Session = SessionLocal()
    inserted = 0
    try:
        for item in payload:
            fixture_id = str(item.get("match_id"))
            if not fixture_id or db.get(Fixture, fixture_id):
                continue
            date = item.get("match_date")
            kickoff = datetime.fromisoformat(date).replace(tzinfo=timezone.utc) if date else None
            db.add(Fixture(
                id=fixture_id, competition=args.competition, season=str(item.get("season", {}).get("season_name", "")),
                kickoff_utc=kickoff, home_team=item.get("home_team", {}).get("home_team_name", "Unknown"),
                away_team=item.get("away_team", {}).get("away_team_name", "Unknown"),
                source="statsbomb_open_data"
            ))
            inserted += 1
        db.commit()
        print(f"Inserted {inserted} fixtures")
    finally:
        db.close()

if __name__ == "__main__":
    main()
