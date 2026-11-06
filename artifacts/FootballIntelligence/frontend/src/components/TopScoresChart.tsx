import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  data: { score: string; probability: number }[];
}

export default function TopScoresChart({ data }: Props) {
  const chartData = data.map((d) => ({
    score: d.score,
    pct: +(d.probability * 100).toFixed(2),
  }));

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="score"
            tick={{ fill: "#8b9bb0", fontSize: 12 }}
            axisLine={{ stroke: "#243041" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8b9bb0", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              background: "#161d27",
              border: "1px solid #243041",
              borderRadius: 8,
              fontSize: 13,
            }}
            formatter={(value: number) => [`${value}%`, "Prob."]}
          />
          <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "#22c55e" : "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
