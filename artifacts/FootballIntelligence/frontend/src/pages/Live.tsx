import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

type Match = {
  id: string;
  source: string;
  competition: string;
  home_team: string;
  away_team: string;
  status: string;
  kickoff_utc?: string | null;
  home_goals?: number | null;
  away_goals?: number | null;
  minute?: string | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
};

export default function Live() {
  const [tab, setTab] = useState<"live" | "prematch">("prematch");
  const [date, setDate] = useState("");
  const [filter, setFilter] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      if (tab === "live") {
        const data = await api.liveBoard();
        setMatches((data.matches || []) as Match[]);
        setErrors(data.errors || {});
      } else {
        const data = await api.prematchBoard(date || undefined);
        setMatches((data.matches || []) as Match[]);
        setErrors(data.errors || {});
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [tab, date]);

  useEffect(() => {
    api.liveStatus().then(setProviders).catch(() => setProviders(null));
    load();
  }, [load]);

  async function doImport() {
    setImporting(true);
    setMsg(null);
    try {
      const r = await api.liveImportSchedule(date || undefined, filter || undefined);
      setMsg(`Importados: ${r.created} novos · ${r.updated} atualizados`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }

  async function predict(m: Match) {
    setMsg(null);
    setErr(null);
    try {
      const pred = (await api.hubPredict({
        home_team: m.home_team,
        away_team: m.away_team,
        home_team_id: m.home_team_id || undefined,
        away_team_id: m.away_team_id || undefined,
      })) as {
        home_win: number;
        draw: number;
        away_win: number;
        home_xg: number;
        away_xg: number;
        xg_meta?: { method?: string };
      };
      setMsg(
        `${m.home_team} vs ${m.away_team} → 1 ${(pred.home_win * 100).toFixed(1)}% · X ${(pred.draw * 100).toFixed(1)}% · 2 ${(pred.away_win * 100).toFixed(1)}%  (xG ${pred.home_xg}/${pred.away_xg} · ${pred.xg_meta?.method || "n/a"})`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const shown = filter
    ? matches.filter((m) =>
        `${m.competition} ${m.home_team} ${m.away_team}`.toLowerCase().includes(filter.toLowerCase())
      )
    : matches;

  return (
    <>
      <div className="page-header">
        <h1>Pré-jogo & Live</h1>
        <p>Multi-fonte: ESPN (sports-skills) · Sofascore (EasySoccerData) · API-Football opcional</p>
      </div>

      {msg && <div className="success-banner">{msg}</div>}
      {err && <div className="error-banner">{err}</div>}
      {Object.keys(errors).length > 0 && (
        <div className="error-banner">
          Fontes com aviso:{" "}
          {Object.entries(errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")}
        </div>
      )}

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            className={`btn ${tab === "prematch" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("prematch")}
          >
            Pré-jogo
          </button>
          <button
            className={`btn ${tab === "live" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("live")}
          >
            Live
          </button>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? "A atualizar…" : "Atualizar"}
          </button>
        </div>

        {tab === "prematch" && (
          <div className="form-grid" style={{ marginBottom: "1rem" }}>
            <div className="form-group">
              <label>Data (YYYY-MM-DD)</label>
              <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="hoje" />
            </div>
            <div className="form-group">
              <label>Filtro</label>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="liga ou equipa" />
            </div>
          </div>
        )}

        {tab === "prematch" && (
          <button className="btn btn-ghost" onClick={doImport} disabled={importing}>
            {importing ? "A importar…" : "Importar para BD local"}
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          {tab === "live" ? "Jogos a decorrer" : "Jogos do dia"} ({shown.length})
        </div>
        {shown.length === 0 ? (
          <div className="empty">
            {loading
              ? "A carregar…"
              : tab === "live"
                ? "Sem jogos live neste momento (Sofascore pode estar bloqueado neste IP)."
                : "Sem jogos — tenta outra data ou verifica providers."}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fonte</th>
                  <th>Competição</th>
                  <th>Partida</th>
                  <th>Placar</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="badge">{m.source}</span>
                    </td>
                    <td>{m.competition}</td>
                    <td className="team-vs">
                      {m.home_team}
                      <span className="sep">vs</span>
                      {m.away_team}
                    </td>
                    <td>
                      {m.home_goals != null && m.away_goals != null
                        ? `${m.home_goals} – ${m.away_goals}`
                        : "—"}
                      {m.minute ? ` '${m.minute}` : ""}
                    </td>
                    <td>
                      <span className="badge">{m.status}</span>
                    </td>
                    <td>
                      {tab === "prematch" && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                          onClick={() => predict(m)}
                        >
                          Prever
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {providers && (
        <div className="card section-gap">
          <div className="card-title">Providers</div>
          <pre style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "auto" }}>
            {JSON.stringify(providers, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}
