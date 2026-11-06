import type { MatchView } from "./football";

export type ValuePick = {
  id: string;
  match: string;
  league: string;
  market: "Home" | "Draw" | "Away";
  model: number;
  decimal: number;
  edge: number;
  stake: number;
};

/** Positive expected value: model probability × decimal odds − 1. Quarter-Kelly stake on a paper bankroll. */
export function valuePicks(matches: MatchView[], bankroll = 100): ValuePick[] {
  const picks: ValuePick[] = [];
  for (const match of matches) {
    if (match.phase === "post" || !match.odds) continue;
    const sides = [
      { market: "Home" as const, model: match.model.home, decimal: match.odds.home },
      { market: "Draw" as const, model: match.model.draw, decimal: match.odds.draw },
      { market: "Away" as const, model: match.model.away, decimal: match.odds.away },
    ];
    for (const side of sides) {
      const edge = side.model * side.decimal - 1;
      if (edge <= 0.02) continue;
      const b = side.decimal - 1;
      const kelly = b > 0 ? (b * side.model - (1 - side.model)) / b : 0;
      const stake = Math.max(0, Math.min(bankroll * 0.05, bankroll * 0.25 * kelly));
      picks.push({
        id: `${match.id}-${side.market}`,
        match: `${match.home} vs ${match.away}`,
        league: match.league,
        market: side.market,
        model: side.model,
        decimal: side.decimal,
        edge,
        stake: Math.round(stake * 100) / 100,
      });
    }
  }
  return picks.sort((a, b) => b.edge - a.edge);
}

/** SportFlow-style blend: market disagreement, xG gap, recent form. */
export function sportFlow(match: MatchView) {
  const marketHome = match.market?.home ?? match.model.home;
  const disagree = match.model.home - marketHome;
  const xgGap = (match.homeXg - match.awayXg) / 3;
  const form = (formScore(match.formHome) - formScore(match.formAway)) / 3;
  const raw = 0.5 * disagree + 0.3 * xgGap + 0.2 * form;
  const score = Math.round(50 + raw * 80);
  return Math.max(0, Math.min(100, score));
}

function formScore(form: string) {
  let pts = 0;
  let n = 0;
  for (const ch of form.toUpperCase()) {
    if (ch === "W") pts += 1;
    else if (ch === "D") pts += 0.4;
    else if (ch === "L") pts += 0;
    else continue;
    n += 1;
  }
  return n ? pts / n : 0.4;
}
