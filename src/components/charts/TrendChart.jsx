import { useMemo, useState } from "react";
import { formatDate } from "../../lib/dates.js";

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 24, left: 36 };

/** Cumulative attendance line with a dashed target line and hover readout. */
export function TrendChart({ points, target }) {
  const [hover, setHover] = useState(null);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.percentage).concat(target);
    const min = Math.max(0, Math.floor((Math.min(...values) - 5) / 5) * 5);
    const max = Math.min(100, Math.ceil((Math.max(...values) + 2) / 5) * 5);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (i) => PAD.left + (i / (points.length - 1)) * innerW;
    const y = (v) => PAD.top + (1 - (v - min) / (max - min || 1)) * innerH;
    const ticks = [min, (min + max) / 2, max];
    return { x, y, min, max, ticks };
  }, [points, target]);

  if (!geometry) {
    return <p className="muted small">Not enough history to draw a trend yet.</p>;
  }

  const { x, y, ticks } = geometry;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.percentage).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`;
  const active = hover != null ? points[hover] : points.at(-1);

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const px = ratio * W;
    const index = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  };

  return (
    <figure className="chart">
      <figcaption className="chart-readout">
        <strong>{active.percentage.toFixed(1)}%</strong>
        <span className="muted small">
          {formatDate(active.date)} · {active.attended}/{active.total} lectures
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Cumulative attendance trend, currently ${points.at(-1).percentage.toFixed(1)} percent`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={PAD.left - 6} y={y(t) + 4} textAnchor="end">
              {Math.round(t)}%
            </text>
          </g>
        ))}

        <line className="chart-target" x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} />
        <text className="chart-axis" x={W - PAD.right} y={y(target) - 5} textAnchor="end">
          Target {target}%
        </text>

        <path className="chart-area" d={area} />
        <path className="chart-line" d={line} />

        <text className="chart-axis" x={PAD.left} y={H - 6}>{formatDate(points[0].date, { day: "numeric", month: "short" })}</text>
        <text className="chart-axis" x={W - PAD.right} y={H - 6} textAnchor="end">
          {formatDate(points.at(-1).date, { day: "numeric", month: "short" })}
        </text>

        {hover != null && (
          <g>
            <line className="chart-cursor" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} />
            <circle className="chart-dot" cx={x(hover)} cy={y(points[hover].percentage)} r="5" />
          </g>
        )}
      </svg>
    </figure>
  );
}
