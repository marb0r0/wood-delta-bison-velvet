import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  computeAcwr,
  formFingerprint,
  readResults,
  readSessions,
  sampleMonth,
  writeResults,
  writeSessions,
  type ResultMark,
  type Session,
} from "@/lib/footlab";

export const Route = createFileRoute("/lab")({
  component: Lab,
});

function Lab() {
  const [sessions, setSessions] = useState<Session[]>(() => readSessions());
  const [results, setResults] = useState<ResultMark[]>(() => readResults());
  const [minutes, setMinutes] = useState(60);
  const [intensity, setIntensity] = useState(6);
  const [opponent, setOpponent] = useState("");
  const [mark, setMark] = useState<ResultMark["result"]>("W");

  const acwr = useMemo(() => computeAcwr(sessions), [sessions]);
  const print = useMemo(() => formFingerprint(results), [results]);

  function addSession() {
    const next = [
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        minutes,
        intensity,
      },
      ...sessions,
    ];
    writeSessions(next);
    setSessions(next);
  }

  function addResult() {
    if (!opponent.trim()) return;
    const next = [
      ...results,
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        result: mark,
        opponent: opponent.trim(),
      },
    ];
    writeResults(next);
    setResults(next);
    setOpponent("");
  }

  function loadSample() {
    const next = sampleMonth();
    writeSessions(next);
    setSessions(next);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="border-b border-line pb-5">
        <Link to="/" className="font-display text-sm font-semibold tracking-[0.22em] text-primary uppercase">
          Pitchline
        </Link>
        <h1 className="font-display mt-2 text-4xl font-bold text-fg">Foot lab</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Workload and form tools from the FootStats idea, kept on this device. No account, no external model key.
        </p>
      </header>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <p className="text-xs tracking-wide text-muted uppercase">Acute / chronic load</p>
        <p className="font-display mt-1 text-5xl font-bold text-fg">{acwr.acwr.toFixed(2)}</p>
        <p className="mt-1 text-sm text-primary">{acwr.flag.replace("_", " ")}</p>
        <p className="mt-2 text-sm text-muted">{acwr.message}</p>
        <p className="mt-3 text-xs text-muted">
          Acute {acwr.acute} · chronic {acwr.chronic} · band 0.8–1.3
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Minutes
            <input
              type="number"
              min={10}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="mt-1 block min-h-11 w-24 rounded-xl border border-line bg-bg px-3 text-fg"
            />
          </label>
          <label className="text-xs text-muted">
            Intensity 1–10
            <input
              type="number"
              min={1}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="mt-1 block min-h-11 w-24 rounded-xl border border-line bg-bg px-3 text-fg"
            />
          </label>
          <button
            type="button"
            onClick={addSession}
            className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink"
          >
            Log session
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="min-h-11 rounded-full border border-line px-4 text-sm text-fg"
          >
            Load sample month
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <p className="text-xs tracking-wide text-muted uppercase">Form fingerprint</p>
        <p className="mt-2 text-sm text-muted">
          {print
            ? `Latest five results match a run starting ${print.since} at ${print.similarity}% similarity.`
            : "Log 10 results to compare the current run with earlier form."}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Opponent
            <input
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="mt-1 block min-h-11 w-44 rounded-xl border border-line bg-bg px-3 text-fg"
            />
          </label>
          <label className="text-xs text-muted">
            Result
            <select
              value={mark}
              onChange={(e) => setMark(e.target.value as ResultMark["result"])}
              className="mt-1 block min-h-11 rounded-xl border border-line bg-bg px-3 text-fg"
            >
              <option value="W">Win</option>
              <option value="D">Draw</option>
              <option value="L">Loss</option>
            </select>
          </label>
          <button
            type="button"
            onClick={addResult}
            className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink"
          >
            Log result
          </button>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-muted">
          {results
            .slice()
            .reverse()
            .slice(0, 8)
            .map((r) => (
              <li key={r.id}>
                {r.date} · {r.result} vs {r.opponent}
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
