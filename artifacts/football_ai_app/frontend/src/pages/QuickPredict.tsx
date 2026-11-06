import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Prediction } from "../types";
import ProbMetrics from "../components/ProbMetrics";
import ScoreMatrix from "../components/ScoreMatrix";
import TopScoresChart from "../components/TopScoresChart";

export default function QuickPredict() {
  const [homeXg, setHomeXg] = useState(1.55);
  const [awayXg, setAwayXg] = useState(1.1);
  const [rho, setRho] = useState(-0.13);
  const [pred, setPred] = useState<(Prediction & { top_scores?: { score: string; probability: number }[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const p = await api.quickPredict({
        home_xg: homeXg,
        away_xg: awayXg,
        rho,
      });
      setPred(p);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : String(ex));
      setPred(null);
    } finally {
      setLoading(false);
    }
  }

  // auto-run on mount and when sliders settle
  useEffect(() => {
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeXg, awayXg, rho]);

  return (
    <>
      <div className="page-header">
        <h1>Previsão Rápida</h1>
        <p>Explora combinações de xG sem gravar jogo</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="card-title">Parâmetros</div>
        <div className="grid-3">
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
      </div>

      {loading && !pred && (
        <div className="loading">
          <div className="spinner" /> A calcular…
        </div>
      )}

      {pred && (
        <>
          <div className="card section-gap">
            <div className="card-title">Probabilidades 1X2 / mercados</div>
            <ProbMetrics {...pred} />
            {pred.most_likely_score && (
              <div className="most-likely">
                Resultado mais provável: <strong>{pred.most_likely_score}</strong>
                {pred.most_likely_prob != null && (
                  <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                    ({(pred.most_likely_prob * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {pred.top_scores && pred.top_scores.length > 0 && (
            <div className="card section-gap">
              <div className="card-title">Top resultados mais prováveis</div>
              <TopScoresChart data={pred.top_scores} />
            </div>
          )}

          {pred.score_matrix && (
            <div className="card section-gap">
              <div className="card-title">Matriz de golos (%)</div>
              <ScoreMatrix matrix={pred.score_matrix} />
            </div>
          )}
        </>
      )}
    </>
  );
}
