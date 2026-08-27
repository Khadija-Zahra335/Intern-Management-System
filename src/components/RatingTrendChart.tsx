type RatingPoint = { weekNumber: number; rating: number };

export function RatingTrendChart({ data, height = 260 }: { data: RatingPoint[]; height?: number }) {
  if (data.length === 0) {
    return <p className="text-muted text-sm">No feedback logged yet.</p>;
  }

  const width = 880;
  const padLeft = 36;
  const padRight = 20;
  const padTop = 16;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const xStep = data.length > 1 ? plotW / (data.length - 1) : 0;
  const yFor = (rating: number) => padTop + plotH - ((rating - 1) / 4) * plotH;
  const points = data.map((d, i) => ({ x: padLeft + i * xStep, y: yFor(d.rating), d }));
  const areaPath =
    points.length > 1
      ? `M ${points[0].x} ${yFor(1)} L ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${
          points[points.length - 1].x
        } ${yFor(1)} Z`
      : "";
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
            className="w-full"
      style={{ height }}
      role="img"
      aria-label="Rating trend by week"
    >
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={yFor(v)}
            y2={yFor(v)}
            className="stroke-border"
            strokeDasharray="4 4"
          />
          <text x={padLeft - 12} y={yFor(v) + 4} textAnchor="end" className="fill-muted text-[11px]">
            {v}
          </text>
        </g>
      ))}
      {areaPath && <path d={areaPath} className="fill-accent-soft" />}
      {linePath && (
        <path d={linePath} fill="none" className="stroke-primary" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} className="fill-primary" />
          <circle cx={p.x} cy={p.y} r={5} className="fill-none stroke-white" strokeWidth={2} />
          <title>{`Week ${p.d.weekNumber}: ${p.d.rating}/5`}</title>
          <text x={p.x} y={height - 8} textAnchor="middle" className="fill-muted text-[11px] font-medium">
            W{p.d.weekNumber}
          </text>
        </g>
      ))}
    </svg>
  );
}