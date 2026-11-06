interface Props {
  matrix: number[][];
}

function heat(v: number): string {
  // 0 → dark, higher → green-ish
  const t = Math.min(1, v * 12);
  const r = Math.round(22 + t * 40);
  const g = Math.round(30 + t * 150);
  const b = Math.round(40 + t * 40);
  return `rgb(${r},${g},${b})`;
}

export default function ScoreMatrix({ matrix }: Props) {
  const n = matrix.length;
  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th></th>
            {Array.from({ length: n }, (_, a) => (
              <th key={a}>{a}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, h) => (
            <tr key={h}>
              <th>{h}</th>
              {row.map((v, a) => (
                <td key={a} style={{ background: heat(v), color: v > 0.08 ? "#fff" : undefined }}>
                  {(v * 100).toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>
        Linhas = golos casa · Colunas = golos fora · valores em %
      </p>
    </div>
  );
}
