import { attendanceBand, lecturesNeeded, safeBunks } from "../lib/attendance.js";
import { formatDate } from "../lib/dates.js";
import { BandPill, Card, ProgressBar } from "./ui/primitives.jsx";
import { useApp } from "../store/context.js";

/** Headline attendance figure, progress and what-to-do-next sentence. */
export function OverviewCard() {
  const { overall, settings, latestDate } = useApp();
  const { attended, total, percentage } = overall;
  const target = settings.target;
  const band = attendanceBand(attended, total, target);
  const needed = lecturesNeeded(attended, total, target);
  const bunks = safeBunks(attended, total, target);

  let advice;
  if (total === 0) advice = "No lectures recorded yet.";
  else if (needed === 0) advice = bunks > 0 ? `You can miss ${bunks} more ${bunks === 1 ? "lecture" : "lectures"} and stay at ${target}%.` : `You are exactly at ${target}%. Missing the next lecture drops you below.`;
  else if (needed === null) advice = `${target}% is no longer reachable after recorded absences.`;
  else advice = `Attend the next ${needed} ${needed === 1 ? "lecture" : "lectures"} in a row to reach ${target}%.`;

  return (
    <Card
      title="Overall attendance"
      subtitle={`Calculated up to ${formatDate(latestDate)}`}
      actions={<BandPill band={band} />}
      className="overview"
    >
      <div className="overview-body">
        <div className="overview-figure">
          <span className="big-number">{percentage.toFixed(2)}%</span>
          <span className="muted">
            {attended} of {total} lectures
          </span>
        </div>
        <div className="overview-bar">
          <ProgressBar value={percentage} target={target} band={band} label="Overall attendance" />
          <div className="bar-legend muted small">
            <span>0%</span>
            <span>Target {target}%</span>
            <span>100%</span>
          </div>
          <p className="advice">{advice}</p>
        </div>
      </div>
    </Card>
  );
}
