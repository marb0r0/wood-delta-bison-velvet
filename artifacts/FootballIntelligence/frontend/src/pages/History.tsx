import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Fixture, Prediction } from "../types";

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function History() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selected, setSelected] = useState("");
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listFixtures(50)
      .then((f) => {
        setFixtures(f);
        if (f.length && !selected) setSelected(f[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api
      .predictionHistory(selected)
      .then(setPreds)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <>
      <div className="page-header">
        <h1>Histórico</h1>
        <p>Previsões anteriores por jogo</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {fixtures.length === 0 ? (
          <div className="empty">Sem jogos registados.</div>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label>Jogo</label>
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} — {f.home_team} vs {f.away_team}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner" /> A carregar…
              </div>
            ) : preds.length === 0 ? (
              <div className="empty">Ainda não há previsões para este jogo.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>xG C</th>
                      <th>xG F</th>
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
                      <tr key={p.id ?? p.predicted_at}>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {p.predicted_at
                            ? new Date(p.predicted_at).toLocaleString("pt-PT")
                            : "—"}
                        </td>
                        <td className="pct">{p.home_xg.toFixed(2)}</td>
                        <td className="pct">{p.away_xg.toFixed(2)}</td>
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
                        <td style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {p.model_version}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
