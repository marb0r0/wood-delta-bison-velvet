"""Transparent independent-Poisson baseline with Dixon-Coles low-score adjustment.

This is an inference baseline, not a fitted league model. Production use should fit
attack/defence strengths and rho on historical, time-ordered competition data.
"""
from math import exp, factorial


def _poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return exp(-lam) * (lam**k) / factorial(k)


def score_matrix(
    home_xg: float,
    away_xg: float,
    max_goals: int = 10,
    rho: float = -0.13,
) -> list[list[float]]:
    """Build a (max_goals+1) x (max_goals+1) probability matrix of exact scores."""
    if home_xg <= 0 or away_xg <= 0:
        raise ValueError("expected goals must be positive")

    matrix: list[list[float]] = []
    for h in range(max_goals + 1):
        row: list[float] = []
        for a in range(max_goals + 1):
            p = _poisson_pmf(h, home_xg) * _poisson_pmf(a, away_xg)
            # Dixon-Coles tau correction for the four low-score outcomes
            if (h, a) == (0, 0):
                tau = 1 - home_xg * away_xg * rho
            elif (h, a) == (0, 1):
                tau = 1 + home_xg * rho
            elif (h, a) == (1, 0):
                tau = 1 + away_xg * rho
            elif (h, a) == (1, 1):
                tau = 1 - rho
            else:
                tau = 1.0
            row.append(max(0.0, p * tau))
        matrix.append(row)

    total = sum(sum(row) for row in matrix)
    if total <= 0:
        raise ValueError("matrix total probability is zero")
    return [[v / total for v in row] for row in matrix]


def summarize(matrix: list[list[float]]) -> dict:
    """Extract 1X2, over/under 2.5 and BTTS probabilities from a score matrix."""
    n = len(matrix)
    home = sum(matrix[h][a] for h in range(n) for a in range(n) if h > a)
    draw = sum(matrix[h][a] for h in range(n) for a in range(n) if h == a)
    away = sum(matrix[h][a] for h in range(n) for a in range(n) if h < a)
    over25 = sum(matrix[h][a] for h in range(n) for a in range(n) if h + a >= 3)
    btts = sum(matrix[h][a] for h in range(1, n) for a in range(1, n))

    # Most likely exact score
    best_h, best_a, best_p = 0, 0, -1.0
    for h in range(n):
        for a in range(n):
            if matrix[h][a] > best_p:
                best_p = matrix[h][a]
                best_h, best_a = h, a

    return {
        "home_win": home,
        "draw": draw,
        "away_win": away,
        "over_2_5": over25,
        "btts_yes": btts,
        "most_likely_score": f"{best_h}-{best_a}",
        "most_likely_prob": best_p,
    }


def top_scores(matrix: list[list[float]], k: int = 5) -> list[dict]:
    """Return the k most probable exact scores."""
    n = len(matrix)
    scores = [
        {"score": f"{h}-{a}", "probability": matrix[h][a]}
        for h in range(n)
        for a in range(n)
    ]
    scores.sort(key=lambda x: x["probability"], reverse=True)
    return scores[:k]
