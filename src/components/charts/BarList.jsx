import { ProgressBar } from "../ui/primitives.jsx";
import { attendanceBand } from "../../lib/attendance.js";

/** Horizontal bars: label, percentage, "attended/total". */
export function BarList({ rows, target }) {
  return (
    <ul className="bar-list">
      {rows.map((row) => {
        const band = attendanceBand(row.attended, row.total, target);
        return (
          <li key={row.key || row.label}>
            <div className="bar-list-head">
              <span>{row.label}</span>
              <span className="muted small">
                {row.attended}/{row.total}
              </span>
              <strong>{row.percentage.toFixed(1)}%</strong>
            </div>
            <ProgressBar value={row.percentage} target={target} band={band} label={`${row.label} attendance`} />
          </li>
        );
      })}
    </ul>
  );
}
