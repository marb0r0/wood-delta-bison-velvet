import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Radio, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getBoard, getTable } from "@/lib/football.functions";
import type { Board, LeagueTable, MatchView, Phase } from "@/lib/football";
import { sportFlow, valuePicks } from "@/lib/value";

export const Route = createFileRoute("/")({
  loader: () => getBoard({ data: { offset: 0 } }),
  component: Home,
});

const DAYS = [
  { offset: -1, label: "Yesterday" },
  { offset: 0, label: "Today" },
  { offset: 1, label: "Tomorrow" },
  { offset: 2, label: "+2" },
  { offset: 3, label: "+3" },
];

const TABLE_LEAGUES = [
  ["eng.1", "Premier League"],
  ["esp.1", "La Liga"],
  ["ger.1", "Bundesliga"],
  ["ita.1", "Serie A"],
  ["fra.1", "Ligue 1"],
  ["por.1", "Liga Portugal"],
  ["ned.1", "Eredivisie"],
  ["eng.2", "Championship"],
] as const;

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function kickLabel(iso: string) {
  if (!iso) return "TBD";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Home() {
  const initial = Route.useLoaderData() as Board;
  const fetchBoard = useServerFn(getBoard);
  const fetchTable = useServerFn(getTable);
  const [offset, setOffset] = useState(0);
  const [board, setBoard] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState("all");
  const [phase, setPhase] = useState<"all" | Phase>("all");
  const [selected, setSelected] = useState<string | null>(initial.matches[0]?.id ?? null);
  const [view, setView] = useState<"matches" | "table" | "value">("matches");
  const [tableLeague, setTableLeague] = useState("eng.1");
  const [table, setTable] = useState<LeagueTable | null>(null);

  async function load(next = offset) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBoard({ data: { offset: next } });
      setBoard(data);
      setSelected((cur) => (data.matches.some((m) => m.id === cur) ? cur : (data.matches[0]?.id ?? null)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh fixtures");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view !== "table") return;
    let cancelled = false;
    void fetchTable({ data: { leagueId: tableLeague } })
      .then((data) => {
        if (!cancelled) setTable(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load table");
      });
    return () => {
      cancelled = true;
    };
  }, [view, tableLeague, fetchTable]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load(offset);
    }, 90_000);
    return () => window.clearInterval(id);
  }, [offset]);

  const leagues = useMemo(() => {
    const set = new Set(board.matches.map((m) => m.league));
    return ["all", ...set];
  }, [board.matches]);

  const shown = board.matches.filter((m) => {
    if (league !== "all" && m.league !== league) return false;
    if (phase !== "all" && m.phase !== phase) return false;
    return true;
  });
  const picks = useMemo(() => valuePicks(board.matches), [board.matches]);
  const liveCount = board.matches.filter((m) => m.phase === "in").length;
  const pick = shown.find((m) => m.id === selected) ?? shown[0] ?? null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.22em] text-primary uppercase">
            Pitchline
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
            Match desk
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Live scores, league tables, and paper value bets. Prices come from public ESPN boards.
            Nothing here places a real wager.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-sm text-fg">
            <Radio className={liveCount ? "text-live" : "text-muted"} size={16} />
            {liveCount} live
          </span>
          <Link
            to="/lab"
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-fg"
          >
            Foot lab
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ["matches", "Fixtures"],
            ["table", "Tables"],
            ["value", "Value"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              view === id
                ? "border-primary bg-primary text-primary-ink"
                : "border-line bg-surface text-fg"
            }`}
          >
            {label}
          </button>
        ))}
        {view === "matches" &&
          DAYS.map((d) => (
            <button
              key={d.offset}
              type="button"
              onClick={() => {
                setOffset(d.offset);
                void load(d.offset);
              }}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                offset === d.offset
                  ? "border-gold text-gold"
                  : "border-line bg-transparent text-muted"
              }`}
            >
              {d.label}
            </button>
          ))}
        {view === "matches" &&
          (["all", "in", "pre", "post"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPhase(p)}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                phase === p ? "border-gold text-gold" : "border-line bg-transparent text-muted"
              }`}
            >
              {p === "all" ? "All" : p === "in" ? "Live" : p === "pre" ? "Pre-match" : "Final"}
            </button>
          ))}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {view === "table"
          ? TABLE_LEAGUES.map(([id, name]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTableLeague(id)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${
                  tableLeague === id ? "bg-surface-2 text-fg" : "text-muted"
                }`}
              >
                {name}
              </button>
            ))
          : view === "matches"
            ? leagues.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setLeague(name)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${
                    league === name ? "bg-surface-2 text-fg" : "text-muted"
                  }`}
                >
                  {name === "all" ? "Every league" : name}
                </button>
              ))
            : null}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg">{error}</p>
      )}

      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        {view === "table" ? (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-3 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">Club</th>
                  <th className="px-3 py-3 font-medium">P</th>
                  <th className="px-3 py-3 font-medium">GD</th>
                  <th className="px-3 py-3 font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {(table?.rows ?? []).map((row) => (
                  <tr key={row.abbr + row.rank} className="border-t border-line">
                    <td className="px-3 py-2 tabular-nums text-muted">{row.rank}</td>
                    <td className="px-3 py-2 font-medium text-fg">
                      {row.team}
                      {row.note ? <span className="ml-2 text-xs text-primary">{row.note}</span> : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted">{row.played}</td>
                    <td className="px-3 py-2 tabular-nums text-muted">
                      {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                    </td>
                    <td className="px-3 py-2 font-display font-semibold tabular-nums text-fg">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!table?.rows.length && <p className="px-4 py-8 text-center text-sm text-muted">Loading table…</p>}
          </div>
        ) : view === "value" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              A pick is listed when the model price beats the book by more than 2%. Stake is quarter-Kelly on a
              paper bankroll of 100, capped at 5%.
            </p>
            {picks.length === 0 && (
              <p className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
                No value on this slate.
              </p>
            )}
            {picks.map((row) => (
              <article key={row.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="text-xs tracking-wide text-muted uppercase">{row.league}</p>
                <p className="font-display text-lg font-semibold text-fg">{row.match}</p>
                <p className="mt-1 text-sm text-gold">
                  {row.market} @ {row.decimal.toFixed(2)} · edge {pct(row.edge)} · paper stake {row.stake.toFixed(2)}
                </p>
                <p className="text-xs text-muted">Model {pct(row.model)}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {shown.length === 0 && (
              <p className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
                No fixtures in this window. Try another day.
              </p>
            )}
            {shown.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                  pick?.id === m.id ? "border-primary bg-surface-2" : "border-line bg-surface"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs tracking-wide text-muted uppercase">
                    {m.league}
                    {m.phase === "in" ? " · live" : ""}
                  </p>
                  <p className="truncate font-display text-lg font-semibold text-fg">
                    {m.home} <span className="text-muted">vs</span> {m.away}
                  </p>
                  <p className="text-xs text-muted">{m.detail || kickLabel(m.kickoff)}</p>
                </div>
                <div className="text-right">
                  {m.phase === "pre" ? (
                    <p className="font-display text-sm text-gold">
                      {pct(m.model.home)} · {pct(m.model.draw)} · {pct(m.model.away)}
                    </p>
                  ) : (
                    <p className="font-display text-2xl font-bold tabular-nums text-fg">
                      {m.homeScore ?? 0}
                      <span className="mx-1 text-muted">–</span>
                      {m.awayScore ?? 0}
                    </p>
                  )}
                  <p className="text-xs text-muted">flow {sportFlow(m)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {view === "matches" && (
          <aside className="lg:sticky lg:top-4 lg:self-start">
            {pick ? <Detail match={pick} /> : null}
            <p className="mt-3 text-xs leading-relaxed text-muted">{board.source}</p>
          </aside>
        )}
      </section>
    </main>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: "home" | "draw" | "away" }) {
  const color = tone === "home" ? "bg-primary" : tone === "away" ? "bg-gold" : "bg-muted";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-fg">{pct(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(2, value * 100)}%` }} />
      </div>
    </div>
  );
}

function Detail({ match }: { match: MatchView }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs tracking-wide text-muted uppercase">{match.league}</p>
      <h2 className="font-display mt-1 text-2xl font-bold text-fg">
        {match.homeAbbr} vs {match.awayAbbr}
      </h2>
      <p className="text-sm text-muted">{kickLabel(match.kickoff)}</p>
      <p className="mt-2 text-sm text-gold">SportFlow {sportFlow(match)}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-bg px-2 py-3">
          <dt className="text-xs text-muted">xG home</dt>
          <dd className="font-display text-xl font-semibold text-fg">{match.homeXg.toFixed(2)}</dd>
        </div>
        <div className="rounded-xl bg-bg px-2 py-3">
          <dt className="text-xs text-muted">Score</dt>
          <dd className="font-display text-xl font-semibold text-primary">{match.scoreline}</dd>
        </div>
        <div className="rounded-xl bg-bg px-2 py-3">
          <dt className="text-xs text-muted">xG away</dt>
          <dd className="font-display text-xl font-semibold text-fg">{match.awayXg.toFixed(2)}</dd>
        </div>
      </dl>
      <div className="mt-4 space-y-3">
        <Bar label={`${match.home} win`} value={match.model.home} tone="home" />
        <Bar label="Draw" value={match.model.draw} tone="draw" />
        <Bar label={`${match.away} win`} value={match.model.away} tone="away" />
      </div>
      <div className="mt-4 flex justify-between text-sm text-muted">
        <span>Over 2.5 {pct(match.model.over25)}</span>
        <span>BTTS {pct(match.model.btts)}</span>
      </div>
      {match.market && (
        <p className="mt-3 text-xs text-muted">
          Market ({match.book ?? "book"}): {pct(match.market.home)} / {pct(match.market.draw)} /{" "}
          {pct(match.market.away)}
        </p>
      )}
      {(match.formHome || match.formAway) && (
        <p className="mt-2 text-xs tracking-widest text-muted uppercase">
          Form {match.formHome || "—"} · {match.formAway || "—"}
        </p>
      )}
    </div>
  );
}
