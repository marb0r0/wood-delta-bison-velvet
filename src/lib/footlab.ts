export type Session = { id: string; date: string; minutes: number; intensity: number };
export type ResultMark = { id: string; date: string; result: "W" | "D" | "L"; opponent: string };

const SESSIONS = "pitchline-sessions";
const RESULTS = "pitchline-results";

export function readSessions(): Session[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSIONS) || "[]") as Session[];
  } catch {
    return [];
  }
}

export function readResults(): ResultMark[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RESULTS) || "[]") as ResultMark[];
  } catch {
    return [];
  }
}

export function writeSessions(rows: Session[]) {
  localStorage.setItem(SESSIONS, JSON.stringify(rows));
}

export function writeResults(rows: ResultMark[]) {
  localStorage.setItem(RESULTS, JSON.stringify(rows));
}

export function computeAcwr(sessions: Session[], asOf = new Date()) {
  const day = (iso: string) => iso.slice(0, 10);
  const asOfIso = asOf.toISOString().slice(0, 10);
  const acuteStart = shift(asOfIso, -7);
  const chronicStart = shift(asOfIso, -28);
  const load = (s: Session) => s.minutes * (s.intensity || 5);
  const inWindow = sessions.filter((s) => day(s.date) >= chronicStart && day(s.date) <= asOfIso);
  const acute = inWindow.filter((s) => day(s.date) >= acuteStart).reduce((sum, s) => sum + load(s), 0) / 7;
  const chronic = inWindow.reduce((sum, s) => sum + load(s), 0) / 28;
  const acwr = chronic === 0 ? 0 : Math.round((acute / chronic) * 100) / 100;
  let flag = "safe";
  let message = "Training load is inside the sustainable band.";
  if (chronic === 0) {
    flag = "insufficient_data";
    message = "Log a few weeks of sessions to unlock the workload score.";
  } else if (acwr < 0.8) {
    flag = "undertrained";
    message = "Load has dropped under your recent baseline.";
  } else if (acwr > 1.3) {
    flag = "high_risk";
    message = "Load has spiked versus the last four weeks. Injury risk is up.";
  }
  return {
    acute: Math.round(acute * 10) / 10,
    chronic: Math.round(chronic * 10) / 10,
    acwr,
    flag,
    message,
  };
}

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function vec(marks: ResultMark[]) {
  return marks.map((m) => (m.result === "W" ? 1 : m.result === "D" ? 0.4 : 0));
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Compare the latest 5 results with earlier windows of 5. */
export function formFingerprint(results: ResultMark[]) {
  const ordered = [...results].sort((a, b) => a.date.localeCompare(b.date));
  if (ordered.length < 10) return null;
  const current = vec(ordered.slice(-5));
  let best = 0;
  let bestStart = "";
  for (let i = 0; i <= ordered.length - 10; i++) {
    const window = vec(ordered.slice(i, i + 5));
    const score = cosine(current, window);
    if (score > best) {
      best = score;
      bestStart = ordered[i].date;
    }
  }
  return { similarity: Math.round(best * 100), since: bestStart };
}

export function sampleMonth(): Session[] {
  const rows: Session[] = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    if (i % 3 === 0) continue;
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const spike = i < 4;
    rows.push({
      id: `sample-${i}`,
      date: d.toISOString().slice(0, 10),
      minutes: spike ? 90 : 55,
      intensity: spike ? 9 : 6,
    });
  }
  return rows;
}
