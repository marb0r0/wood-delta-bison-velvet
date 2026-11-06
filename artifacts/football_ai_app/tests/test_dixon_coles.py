import pytest
from football_ai.prediction.dixon_coles import score_matrix, summarize, top_scores


def test_matrix_sums_to_one():
    m = score_matrix(1.5, 1.2)
    total = sum(sum(row) for row in m)
    assert abs(total - 1.0) < 1e-9


def test_probs_are_valid():
    m = score_matrix(1.8, 0.9, rho=-0.13)
    s = summarize(m)
    assert abs(s["home_win"] + s["draw"] + s["away_win"] - 1.0) < 1e-9
    assert 0 <= s["over_2_5"] <= 1
    assert 0 <= s["btts_yes"] <= 1
    assert s["most_likely_score"] is not None


def test_rejects_non_positive_xg():
    with pytest.raises(ValueError):
        score_matrix(0, 1.2)
    with pytest.raises(ValueError):
        score_matrix(1.2, -0.1)


def test_top_scores():
    m = score_matrix(1.4, 1.1)
    tops = top_scores(m, k=3)
    assert len(tops) == 3
    assert tops[0]["probability"] >= tops[1]["probability"]
