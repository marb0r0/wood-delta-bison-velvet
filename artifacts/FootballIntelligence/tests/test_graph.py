from football_ai.agents.graph import build_graph


def test_workflow_ok():
    graph = build_graph()
    result = graph.invoke({"fixture_id": "t1", "home_xg": 1.5, "away_xg": 1.1})
    assert result["quality_status"] == "ok"
    assert "home_win" in result["probabilities"]
    assert len(result["matrix"]) == 11
    assert result.get("top_scores")


def test_workflow_rejects_bad_xg():
    graph = build_graph()
    result = graph.invoke({"fixture_id": "t2", "home_xg": 0, "away_xg": 1.1})
    assert result["quality_status"] == "rejected"
