"""Dashboard Streamlit — Global Football Intelligence"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import httpx
import pandas as pd
import streamlit as st

API_URL = st.sidebar.text_input("API URL", value="http://localhost:8000")

st.set_page_config(
    page_title="Football Intelligence",
    page_icon="⚽",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("⚽ Global Football Intelligence")
st.caption("Previsões com modelo Dixon-Coles · FastAPI + LangGraph")


def api(method: str, path: str, **kwargs):
    url = f"{API_URL.rstrip('/')}{path}"
    try:
        r = httpx.request(method, url, timeout=15, **kwargs)
        if r.status_code >= 400:
            st.error(f"Erro {r.status_code}: {r.text}")
            return None
        if r.status_code == 204:
            return True
        return r.json()
    except httpx.ConnectError:
        st.error("Não foi possível ligar à API. Confirma que o servidor está a correr em " + API_URL)
        return None
    except Exception as e:
        st.error(str(e))
        return None


# ── Sidebar navigation ──────────────────────────────────────────────────────
page = st.sidebar.radio(
    "Navegação",
    ["🏠 Dashboard", "➕ Novo Jogo", "🔮 Previsão Rápida", "📋 Histórico", "ℹ️ Sobre"],
)

# ── Health check ────────────────────────────────────────────────────────────
health = api("GET", "/health")
if health:
    st.sidebar.success(f"API: {health['status']} · {health.get('model_version', '')}")
else:
    st.sidebar.warning("API offline")

# ═══════════════════════════════════════════════════════════════════════════
if page == "🏠 Dashboard":
    st.subheader("Jogos recentes")
    fixtures = api("GET", "/api/v1/fixtures?limit=30")
    if fixtures is not None:
        if not fixtures:
            st.info("Ainda não existem jogos. Cria um em **Novo Jogo**.")
        else:
            df = pd.DataFrame(fixtures)
            cols = ["id", "competition", "home_team", "away_team", "season", "home_goals", "away_goals"]
            cols = [c for c in cols if c in df.columns]
            st.dataframe(df[cols], use_container_width=True, hide_index=True)

            st.subheader("Últimas previsões")
            preds = api("GET", "/api/v1/predictions/latest?limit=15")
            if preds:
                pdf = pd.DataFrame(preds)
                for col in ["home_win", "draw", "away_win", "over_2_5", "btts_yes"]:
                    if col in pdf.columns:
                        pdf[col] = (pdf[col] * 100).round(1).astype(str) + "%"
                show = ["fixture_id", "home_xg", "away_xg", "home_win", "draw", "away_win", "over_2_5", "btts_yes", "model_version"]
                show = [c for c in show if c in pdf.columns]
                st.dataframe(pdf[show], use_container_width=True, hide_index=True)

# ═══════════════════════════════════════════════════════════════════════════
elif page == "➕ Novo Jogo":
    st.subheader("Criar novo fixture")
    with st.form("create_fixture"):
        col1, col2 = st.columns(2)
        with col1:
            fid = st.text_input("ID do jogo *", value=f"match-{datetime.now().strftime('%Y%m%d-%H%M')}")
            home = st.text_input("Equipa da casa *", value="Home FC")
            competition = st.text_input("Competição *", value="Demo League")
        with col2:
            away = st.text_input("Equipa visitante *", value="Away FC")
            season = st.text_input("Época", value="2025/26")
            kickoff = st.text_input("Kickoff (ISO, opcional)", placeholder="2025-11-10T20:00:00Z")

        submitted = st.form_submit_button("Criar jogo", type="primary")
        if submitted:
            payload = {
                "id": fid.strip(),
                "home_team": home.strip(),
                "away_team": away.strip(),
                "competition": competition.strip(),
                "season": season.strip() or None,
                "source": "manual",
            }
            if kickoff.strip():
                payload["kickoff_utc"] = kickoff.strip()
            result = api("POST", "/api/v1/fixtures", json=payload)
            if result:
                st.success(f"Jogo **{result['id']}** criado com sucesso!")
                st.json(result)

    st.divider()
    st.subheader("Gerar previsão para um jogo existente")
    fixtures = api("GET", "/api/v1/fixtures?limit=50") or []
    if fixtures:
        options = {f"{f['id']} — {f['home_team']} vs {f['away_team']}": f["id"] for f in fixtures}
        choice = st.selectbox("Seleciona o jogo", list(options.keys()))
        fid = options[choice]

        c1, c2, c3 = st.columns(3)
        home_xg = c1.number_input("xG Casa", min_value=0.1, max_value=5.0, value=1.55, step=0.05)
        away_xg = c2.number_input("xG Fora", min_value=0.1, max_value=5.0, value=1.10, step=0.05)
        rho = c3.number_input("ρ (Dixon-Coles)", min_value=-0.5, max_value=0.5, value=-0.13, step=0.01)

        if st.button("Gerar previsão", type="primary"):
            body = {"home_xg": home_xg, "away_xg": away_xg, "rho": rho}
            pred = api("POST", f"/api/v1/fixtures/{fid}/predict", json=body)
            if pred:
                st.success("Previsão gerada!")
                m1, m2, m3, m4, m5 = st.columns(5)
                m1.metric("Vitória Casa", f"{pred['home_win']*100:.1f}%")
                m2.metric("Empate", f"{pred['draw']*100:.1f}%")
                m3.metric("Vitória Fora", f"{pred['away_win']*100:.1f}%")
                m4.metric("Over 2.5", f"{pred['over_2_5']*100:.1f}%")
                m5.metric("BTTS Sim", f"{pred['btts_yes']*100:.1f}%")

                if pred.get("most_likely_score"):
                    st.info(f"Resultado mais provável: **{pred['most_likely_score']}**")

                if pred.get("score_matrix"):
                    with st.expander("Matriz de resultados (probabilidades)"):
                        mat = pred["score_matrix"]
                        dfm = pd.DataFrame(
                            [[round(v * 100, 2) for v in row] for row in mat],
                            index=[f"Casa {i}" for i in range(len(mat))],
                            columns=[f"Fora {j}" for j in range(len(mat[0]))],
                        )
                        st.dataframe(dfm, use_container_width=True)

# ═══════════════════════════════════════════════════════════════════════════
elif page == "🔮 Previsão Rápida":
    st.subheader("Previsão exploratória (sem gravar jogo)")
    st.markdown("Útil para testar combinações de xG rapidamente.")

    c1, c2, c3 = st.columns(3)
    home_xg = c1.slider("xG Casa", 0.3, 4.0, 1.55, 0.05)
    away_xg = c2.slider("xG Fora", 0.3, 4.0, 1.10, 0.05)
    rho = c3.slider("ρ Dixon-Coles", -0.40, 0.20, -0.13, 0.01)

    if st.button("Calcular", type="primary") or True:
        body = {"home_xg": home_xg, "away_xg": away_xg, "rho": rho}
        pred = api("POST", "/api/v1/predict/quick", json=body)
        if pred:
            m1, m2, m3, m4, m5 = st.columns(5)
            m1.metric("1 (Casa)", f"{pred['home_win']*100:.1f}%")
            m2.metric("X (Empate)", f"{pred['draw']*100:.1f}%")
            m3.metric("2 (Fora)", f"{pred['away_win']*100:.1f}%")
            m4.metric("Over 2.5", f"{pred['over_2_5']*100:.1f}%")
            m5.metric("BTTS", f"{pred['btts_yes']*100:.1f}%")

            st.markdown(f"**Resultado mais provável:** `{pred.get('most_likely_score', '—')}`")

            tops = pred.get("top_scores") or []
            if tops:
                st.subheader("Top resultados mais prováveis")
                tdf = pd.DataFrame(tops)
                tdf["probability"] = (tdf["probability"] * 100).round(2)
                tdf.columns = ["Resultado", "Probabilidade (%)"]
                st.bar_chart(tdf.set_index("Resultado"))

            if pred.get("score_matrix"):
                with st.expander("Matriz completa de golos"):
                    mat = pred["score_matrix"]
                    dfm = pd.DataFrame(
                        [[round(v * 100, 2) for v in row] for row in mat],
                        index=[str(i) for i in range(len(mat))],
                        columns=[str(j) for j in range(len(mat[0]))],
                    )
                    st.dataframe(dfm.style.background_gradient(cmap="YlOrRd", axis=None), use_container_width=True)

# ═══════════════════════════════════════════════════════════════════════════
elif page == "📋 Histórico":
    st.subheader("Histórico de previsões")
    fixtures = api("GET", "/api/v1/fixtures?limit=50") or []
    if not fixtures:
        st.info("Sem jogos.")
    else:
        options = {f"{f['id']} — {f['home_team']} vs {f['away_team']}": f["id"] for f in fixtures}
        choice = st.selectbox("Jogo", list(options.keys()))
        fid = options[choice]
        hist = api("GET", f"/api/v1/fixtures/{fid}/predictions")
        if hist:
            hdf = pd.DataFrame(hist)
            for col in ["home_win", "draw", "away_win", "over_2_5", "btts_yes"]:
                if col in hdf.columns:
                    hdf[col] = (hdf[col] * 100).round(1)
            st.dataframe(hdf, use_container_width=True, hide_index=True)
        else:
            st.info("Ainda não há previsões para este jogo.")

# ═══════════════════════════════════════════════════════════════════════════
else:  # Sobre
    st.subheader("Sobre o projeto")
    st.markdown(
        """
        **Global Football Intelligence** é uma plataforma starter de previsão de resultados de futebol.

        ### Modelos
        - **Dixon-Coles** — matriz de Poisson independente com correção de baixa pontuação (ρ)
        - **XGBoost** — classificador 1X2 (módulo de treino separado)
        - **LangGraph** — workflow de validação + previsão

        ### Stack
        - FastAPI + SQLAlchemy + PostgreSQL/SQLite
        - Alembic (migrações)
        - Streamlit (este dashboard)
        - Docker Compose

        ### Limitações atuais
        - xG são fornecidos manualmente (ainda não existe estimador treinado integrado)
        - Dixon-Coles não ajusta forças de ataque/defesa a partir de histórico
        - Sem odds em tempo real, lesões ou lineups
        - Matriz truncada em 10 golos e renormalizada

        ### Próximos passos sugeridos
        1. Importar resultados históricos com proveniência
        2. Estimar parâmetros Dixon-Coles por competição/época
        3. Features point-in-time + validação walk-forward
        4. Ligar XGBoost ao serviço de inferência
        5. Modelos de cantos, cartões e props de jogadores
        """
    )
    st.code("curl http://localhost:8000/docs", language="bash")
