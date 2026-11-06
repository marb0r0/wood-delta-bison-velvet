import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";
import type { Fixture, Prediction } from "../types";
import ProbMetrics from "../components/ProbMetrics";
import ScoreMatrix from "../components/ScoreMatrix";

export default function NewFixture() {
  const [id, setId] = useState(() => `match-${Date.now().toString(36)}`);
  const [home, setHome] = useState("Home FC");
  const [away, setAway] = useState("Away FC");
  const [competition, setCompetition] = useState("Demo League");
  const [season, setSeason] = useState("2025/26");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selected, setSelected] = useState("");
  const [homeXg, setHomeXg] = useState(1.55);
  const [awayXg, setAwayXg] = useState(1.1);
  const [rho, setRho] = useState(-0.13);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [predicting, setPredicting] = useState(false);

  const loadFixtures = () =>
    api.listFixtures(50).then(setFixtures).catch(() => setFixtures([]));

  useEffect(() => {
    loadFixtures();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const f = await api.createFixture({
        id: id.trim(),
        home_team: home.trim(),
        away_team: away.trim(),
        competition: competition.trim(),
        season: season.trim() || null,
        source: "manual",
      });
      setMsg(`Jogo ${f.id} criado com sucesso.`);
      setId(`match-${Date.now().toString(36)}`);
      await loadFixtures();
      setSelected(f.id);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setSaving(false);
    }
  }

  async function onPredict() {
    if (!selected) return;
    setPredicting(true);
    setErr(null);
    setPred(null);
    try {
      const p = await api.predict(selected, {
        home_xg: homeXg,
        away_xg: awayXg,
        rho,
      });
      setPred(p);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setPredicting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Novo Jogo</h1>
        <p>Criar fixture e gerar previsão Dixon-Coles</p>
      </div>

      {msg && <div className="success-banner">{msg}</div>}
      {err && <div className="error-banner">{err}</div>}

      <div className="card">
        <div className="card-title">Criar fixture</div>
        <form onSubmit={onCreate}>
          <div className="form-grid">
            <div className="form-group">
              <label>ID do jogo *</label>
              <input value={id} onChange={(e) => setId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Competição *</label>
              <input
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Equipa da casa *</label>
              <input value={home} onChange={(e) => setHome(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Equipa visitante *</label>
              <input value={away} onChange={(e) => setAway(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Época</label>
              <input value={season} onChange={(e) => setSeason(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "A criar…" : "Criar jogo"}
            </button>
          </div>
        </form>
      </div>

      <div className="card section-gap">
        <div className="card-title">Gerar previsão</div>
        {fixtures.length === 0 ? (
          <div className="empty">Cria um jogo primeiro.</div>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Seleciona o jogo</label>
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setPred(null);
                }}
              >
                <option value="">— escolher —</option>
                {fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} — {f.home_team} vs {f.away_team}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-3" style={{ marginBottom: "1.25rem" }}>
              <div className="slider-group">
                <label>
                  xG Casa <strong>{homeXg.toFixed(2)}</strong>
                </label>
                <input
                  type="range"
                  min={0.3}
                  max={4}
                  step={0.05}
                  value={homeXg}
                  onChange={(e) => setHomeXg(+e.target.value)}
                />
              </div>
              <div className="slider-group">
                <label>
                  xG Fora <strong>{awayXg.toFixed(2)}</strong>
                </label>
                <input
                  type="range"
                  min={0.3}
                  max={4}
                  step={0.05}
                  value={awayXg}
                  onChange={(e) => setAwayXg(+e.target.value)}
                />
              </div>
              <div className="slider-group">
                <label>
                  ρ Dixon-Coles <strong>{rho.toFixed(2)}</strong>
                </label>
                <input
                  type="range"
                  min={-0.4}
                  max={0.2}
                  step={0.01}
                  value={rho}
                  onChange={(e) => setRho(+e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={!selected || predicting}
              onClick={onPredict}
            >
              {predicting ? "A calcular…" : "Gerar previsão"}
            </button>

            {pred && (
              <div style={{ marginTop: "1.5rem" }}>
                <ProbMetrics {...pred} />
                {pred.most_likely_score && (
                  <div className="most-likely">
                    Resultado mais provável: <strong>{pred.most_likely_score}</strong>
                  </div>
                )}
                {pred.score_matrix && (
                  <details style={{ marginTop: "1.25rem" }}>
                    <summary style={{ cursor: "pointer", color: "var(--text-muted)" }}>
                      Matriz de resultados
                    </summary>
                    <ScoreMatrix matrix={pred.score_matrix} />
                  </details>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
