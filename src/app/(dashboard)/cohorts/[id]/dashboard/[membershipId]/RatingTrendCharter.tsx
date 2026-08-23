type RatingPoint = { weekNumber: number; rating: number };

export function RatingTrendChart({ data }: { data: RatingPoint[] }) {
  if (data.length === 0) {
    return <p className="text-muted text-sm">No feedback logged yet.</p>;
  }

  const width = 480;
  const height = 160;
  const padLeft = 28;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const x = (i: number) =>
    data.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (data.length - 1)) * plotW;
  const y = (rating: number) => padTop + ((5 - rating) / 4) * plotH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.rating)}`).join(" ");
  const baseline = padTop + plotH;
  const areaPath = `${linePath} L ${x(data.length - 1)} ${baseline} L ${x(0)} ${baseline} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" role="img" aria-label="Rating trend by week">
      {[1, 2, 3, 4, 5].map((r) => (
        <g key={r}>
          <line x1={padLeft} x2={width - padRight} y1={y(r)} y2={y(r)} className="stroke-border" strokeWidth={1} />
          <text x={padLeft - 6} y={y(r) + 3} textAnchor="end" fontSize="9" className="fill-muted">
            {r}
          </text>
        </g>
      ))}

      <path d={areaPath} className="fill-accent-soft" />
      <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2} />

      {data.map((d, i) => (
        <g key={d.weekNumber}>
          <circle cx={x(i)} cy={y(d.rating)} r={4} className="fill-primary">
            <title>{`Week ${d.weekNumber}: ${d.rating}/5`}</title>
          </circle>
          <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="9" className="fill-muted">
            Wk {d.weekNumber}
          </text>
        </g>
      ))}
    </svg>
  );
}