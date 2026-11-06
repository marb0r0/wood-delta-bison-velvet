import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Fixture, Prediction } from "../types";

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function Dashboard() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.listFixtures(30), api.latestPredictions(15)])
      .then(([f, p]) => {
        setFixtures(f);
        setPreds(p);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" /> A carregar…
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Jogos e previsões mais recentes</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="card-title">Jogos recentes</div>
        {fixtures.length === 0 ? (
          <div className="empty">
            Ainda não existem jogos.{" "}
            <Link to="/novo" style={{ color: "var(--accent)" }}>
              Criar o primeiro →
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Competição</th>
                  <th>Partida</th>
                  <th>Época</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <span className="badge">{f.id}</span>
                    </td>
                    <td>{f.competition}</td>
                    <td className="team-vs">
                      {f.home_team}
                      <span className="sep">vs</span>
                      {f.away_team}
                    </td>
                    <td>{f.season ?? "—"}</td>
                    <td>
                      {f.home_goals != null && f.away_goals != null
                        ? `${f.home_goals} – ${f.away_goals}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card section-gap">
        <div className="card-title">Últimas previsões</div>
        {preds.length === 0 ? (
          <div className="empty">Sem previsões ainda.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Jogo</th>
                  <th>xG</th>
                  <th>1</th>
                  <th>X</th>
                  <th>2</th>
                  <th>O2.5</th>
                  <th>BTTS</th>
                  <th>Modelo</th>
                </tr>
              </thead>
              <tbody>
                {preds.map((p) => (
                  <tr key={p.id ?? `${p.fixture_id}-${p.predicted_at}`}>
                    <td>
                      <span className="badge">{p.fixture_id}</span>
                    </td>
                    <td className="pct">
                      {p.home_xg.toFixed(2)} / {p.away_xg.toFixed(2)}
                    </td>
                    <td className="pct" style={{ color: "var(--home)" }}>
                      {pct(p.home_win)}
                    </td>
                    <td className="pct" style={{ color: "var(--draw)" }}>
                      {pct(p.draw)}
                    </td>
                    <td className="pct" style={{ color: "var(--away)" }}>
                      {pct(p.away_win)}
                    </td>
                    <td className="pct">{pct(p.over_2_5)}</td>
                    <td className="pct">{pct(p.btts_yes)}</td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                      {p.model_version}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
