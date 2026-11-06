"""Optional XGBoost 1X2 classifier.

Expected training columns: home_elo_diff, home_form_points, away_form_points,
home_xg_for, home_xg_against, away_xg_for, away_xg_against.
Target labels: H, D, A. Input rows must be generated without future information.
"""
from pathlib import Path
import joblib
import pandas as pd
from xgboost import XGBClassifier

FEATURES = [
    "home_elo_diff", "home_form_points", "away_form_points",
    "home_xg_for", "home_xg_against", "away_xg_for", "away_xg_against",
]

def train(csv_path: str, model_path: str = "models/xgb_1x2.json"):
    data = pd.read_csv(csv_path).sort_values("kickoff_utc")
    if not set(FEATURES + ["result"]).issubset(data.columns):
        raise ValueError(f"CSV must contain {FEATURES + ['result']}")
    # Chronological split; never shuffle football time series.
    cut = int(len(data) * 0.8)
    train_df, valid_df = data.iloc[:cut], data.iloc[cut:]
    if len(train_df) < 30 or valid_df.empty:
        raise ValueError("Need at least 30 training rows and a non-empty validation set")
    labels = {"H": 0, "D": 1, "A": 2}
    y_train = train_df["result"].map(labels)
    y_valid = valid_df["result"].map(labels)
    if y_train.isna().any() or y_valid.isna().any():
        raise ValueError("result must contain only H, D, A")
    model = XGBClassifier(
        n_estimators=400, max_depth=4, learning_rate=0.03,
        subsample=0.85, colsample_bytree=0.85, objective="multi:softprob",
        num_class=3, eval_metric="mlogloss", random_state=42,
    )
    model.fit(train_df[FEATURES], y_train, eval_set=[(valid_df[FEATURES], y_valid)], verbose=False)
    path = Path(model_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(path)
    return model
