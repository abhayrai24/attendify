import { BarList } from "../components/charts/BarList.jsx";
import { TrendChart } from "../components/charts/TrendChart.jsx";
import { Card, PageHeader, Stat } from "../components/ui/primitives.jsx";
import {
  attendanceBand,
  buildTrend,
  dayStreaks,
  estimateTargetDate,
  lecturesNeeded,
  monthlyStats,
  safeBunks,
  weekdayStats,
} from "../lib/attendance.js";
import { addDays, formatDate, formatMonth } from "../lib/dates.js";
import { useApp } from "../store/context.js";

export default function Statistics() {
  const { overall, settings, subjects, records, ctx, eligible, erp } = useApp();
  const { attended, total, absent, percentage } = overall;
  const target = settings.target;

  const needed = lecturesNeeded(attended, total, target);
  const bunks = safeBunks(attended, total, target);
  const from = addDays(erp.lastDate, 1);
  const targetDate = needed ? estimateTargetDate(needed, from, ctx) : null;
  const streaks = dayStreaks(records);
  const diff = percentage - target;

  const ranked = subjects
    .filter((s) => s.total > 0)
    .sort((a, b) => a.percentage - b.percentage)
    .map((s) => ({ key: s.code, label: s.name, attended: s.attended, total: s.total, percentage: s.percentage }));

  const months = monthlyStats(records).map((m) => ({ ...m, label: formatMonth(m.key) }));
  const weekdays = weekdayStats(records);
  const band = attendanceBand(attended, total, target);

  return (
    <>
      <PageHeader title="Statistics" subtitle="Where your attendance stands, and how it got there." />

      <section className="stat-grid" aria-label="Key figures">
        <Stat label="Attendance" value={`${percentage.toFixed(2)}%`} hint={`${diff >= 0 ? "+" : ""}${diff.toFixed(2)}% vs target`} tone={eligible ? "good" : "bad"} />
        <Stat label="Present" value={attended} hint={`${total ? ((attended / total) * 100).toFixed(1) : 0}% of lectures`} />
        <Stat label="Absent" value={absent} hint={`${total ? ((absent / total) * 100).toFixed(1) : 0}% of lectures`} />
        <Stat label="Best streak" value={`${streaks.best}d`} hint={`Current ${streaks.current}d`} />
      </section>

      <div className="grid-2">
        <Card title="Target analysis" subtitle={`Target ${target}%`}>
          {needed === null ? (
            <div className="notice notice-danger">
              <strong>Target not reachable.</strong> {target}% is impossible after the recorded absences.
            </div>
          ) : needed === 0 ? (
            <div className="notice notice-success">
              <strong>Target met.</strong> You can still miss <strong>{bunks}</strong> {bunks === 1 ? "lecture" : "lectures"} and stay at {target}%.
            </div>
          ) : (
            <div className="notice notice-warning">
              <strong>{needed} {needed === 1 ? "lecture" : "lectures"} needed.</strong> Attend the next {needed} in a row to reach {target}%.
              {targetDate && <> Earliest date: <strong>{formatDate(targetDate)}</strong>.</>}
            </div>
          )}
          <p className="muted small">Status: {band === "safe" ? "Comfortably above target" : band === "warning" ? "Within 5 points of the target" : band === "low" ? "Below target" : "No data"}.</p>
        </Card>

        <Card title="Trend" subtitle="Cumulative attendance over time">
          <TrendChart points={buildTrend(records)} target={target} />
        </Card>
      </div>

      <div className="grid-2">
        <Card title="By weekday" subtitle="Which days you tend to miss">
          <BarList rows={weekdays} target={target} />
        </Card>
        <Card title="By month">
          <BarList rows={months} target={target} />
        </Card>
      </div>

      <Card title="Subjects, weakest first">
        <BarList rows={ranked} target={target} />
      </Card>
    </>
  );
}
