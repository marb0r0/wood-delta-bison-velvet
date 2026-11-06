"""Small LangGraph workflow. The deterministic prediction engine remains authoritative."""
from typing import TypedDict

from langgraph.graph import StateGraph, END

from football_ai.prediction.dixon_coles import score_matrix, summarize, top_scores
from football_ai.config import settings


class MatchState(TypedDict, total=False):
    fixture_id: str
    home_xg: float
    away_xg: float
    rho: float
    matrix: list[list[float]]
    probabilities: dict
    top_scores: list[dict]
    quality_status: str


def validate(state: MatchState) -> MatchState:
    home = state.get("home_xg", 0)
    away = state.get("away_xg", 0)
    if home is None or away is None or home <= 0 or away <= 0:
        return {"quality_status": "rejected"}
    return {"quality_status": "ok"}


def predict(state: MatchState) -> MatchState:
    rho = state.get("rho")
    if rho is None:
        rho = settings.default_rho
    matrix = score_matrix(state["home_xg"], state["away_xg"], rho=rho)
    probs = summarize(matrix)
    tops = top_scores(matrix, k=8)
    return {
        "matrix": matrix,
        "probabilities": probs,
        "top_scores": tops,
    }


def build_graph():
    graph = StateGraph(MatchState)
    graph.add_node("validate", validate)
    graph.add_node("predict", predict)
    graph.set_entry_point("validate")
    graph.add_conditional_edges(
        "validate",
        lambda s: "predict" if s.get("quality_status") == "ok" else END,
        {"predict": "predict", END: END},
    )
    graph.add_edge("predict", END)
    return graph.compile()
