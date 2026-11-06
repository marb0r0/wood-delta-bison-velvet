interface Props {
  home_win: number;
  draw: number;
  away_win: number;
  over_2_5: number;
  btts_yes: number;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function ProbMetrics({ home_win, draw, away_win, over_2_5, btts_yes }: Props) {
  return (
    <div className="grid-5">
      <div className="metric">
        <div className="metric-label">1 · Casa</div>
        <div className="metric-value home">{pct(home_win)}</div>
      </div>
      <div className="metric">
        <div className="metric-label">X · Empate</div>
        <div className="metric-value draw">{pct(draw)}</div>
      </div>
      <div className="metric">
        <div className="metric-label">2 · Fora</div>
        <div className="metric-value away">{pct(away_win)}</div>
      </div>
      <div className="metric">
        <div className="metric-label">Over 2.5</div>
        <div className="metric-value over">{pct(over_2_5)}</div>
      </div>
      <div className="metric">
        <div className="metric-label">BTTS Sim</div>
        <div className="metric-value btts">{pct(btts_yes)}</div>
      </div>
    </div>
  );
}
