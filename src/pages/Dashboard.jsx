import { AlertTriangle, ArrowRight, CalendarCheck, Flame } from "lucide-react";
import { DaySchedule } from "../components/DaySchedule.jsx";
import { OverviewCard } from "../components/OverviewCard.jsx";
import { RecordsTable } from "../components/RecordsTable.jsx";
import { TrendChart } from "../components/charts/TrendChart.jsx";
import { Card, EmptyState, PageHeader, Stat } from "../components/ui/primitives.jsx";
import { attendanceBand, buildTrend, dayStreaks, lecturesNeeded, safeBunks } from "../lib/attendance.js";
import { formatDate, formatLongDate, relativeDay } from "../lib/dates.js";
import { useApp } from "../store/context.js";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { overall, settings, subjects, records, today, unmarkedDays, assignments, reminders } = useApp();
  const target = settings.target;

  const trend = buildTrend(records);
  const streaks = dayStreaks(records);
  const bunks = safeBunks(overall.attended, overall.total, target);
  const needed = lecturesNeeded(overall.attended, overall.total, target);

  const atRisk = subjects
    .filter((s) => s.total > 0 && attendanceBand(s.attended, s.total, target) === "low")
    .sort((a, b) => a.percentage - b.percentage);

  const upcoming = assignments
    .filter((a) => a.status !== "done" && a.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  const dueReminders = reminders
    .filter((r) => !r.done)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 3);

  return (
    <>
      <PageHeader
        title={`${greeting()}${settings.name ? `, ${settings.name}` : ""}`}
        subtitle={formatLongDate(today)}
      />

      {unmarkedDays.length > 0 && (
        <a className="notice notice-warning" href="#/calendar">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            {unmarkedDays.length === 1 ? "1 past day has" : `${unmarkedDays.length} past days have`} unmarked lectures
            ({unmarkedDays.slice(-3).map((d) => formatDate(d, { day: "numeric", month: "short" })).join(", ")}). Mark them in the calendar.
          </span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      )}

      <section className="stat-grid" aria-label="Summary">
        <Stat
          label="Attendance"
          value={`${overall.percentage.toFixed(2)}%`}
          hint={overall.percentage >= target ? "At or above target" : "Below target"}
          tone={overall.attended * 100 >= target * overall.total ? "good" : "bad"}
        />
        <Stat label="Attended" value={overall.attended} hint="Lectures present" />
        <Stat label="Total lectures" value={overall.total} hint={`${overall.absent} missed`} />
        <Stat
          label={needed ? "Needed for target" : "Safe bunks"}
          value={needed === null ? "—" : needed || bunks}
          hint={needed ? "Lectures in a row" : "Lectures you can miss"}
        />
      </section>

      <OverviewCard />

      <div className="grid-2">
        <Card
          title="Today"
          subtitle={formatLongDate(today)}
          actions={<a className="link" href="#/calendar">Open calendar</a>}
        >
          <DaySchedule date={today} />
        </Card>

        <div className="stack">
          <Card title="Attendance trend" subtitle="Cumulative, from imported ERP history and your marks">
            <TrendChart points={trend} target={target} />
            <p className="muted small streak">
              <Flame size={15} aria-hidden="true" /> Current full-attendance streak: <strong>{streaks.current}</strong> {streaks.current === 1 ? "day" : "days"} · best {streaks.best}
            </p>
          </Card>

          <Card title="Needs attention" subtitle={`Subjects below ${target}%`}>
            {atRisk.length === 0 ? (
              <EmptyState title="All subjects are on track" icon={CalendarCheck} />
            ) : (
              <ul className="plain-list">
                {atRisk.slice(0, 5).map((s) => (
                  <li key={s.code} className="list-row">
                    <div>
                      <strong>{s.name}</strong>
                      <span className="muted small block">
                        {s.attended}/{s.total} · needs {lecturesNeeded(s.attended, s.total, target)} more
                      </span>
                    </div>
                    <strong className="text-bad">{s.percentage.toFixed(1)}%</strong>
                  </li>
                ))}
              </ul>
            )}
            {atRisk.length > 5 && <a className="link" href="#/subjects">View all {atRisk.length}</a>}
          </Card>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Upcoming assignments" actions={<a className="link" href="#/assignments">All</a>}>
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing due">Add assignments to keep track of deadlines.</EmptyState>
          ) : (
            <ul className="plain-list">
              {upcoming.map((a) => (
                <li key={a.id} className="list-row">
                  <strong>{a.title}</strong>
                  <span className={a.dueDate < today ? "text-bad small" : "muted small"}>{relativeDay(a.dueDate, today)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Reminders" actions={<a className="link" href="#/reminders">All</a>}>
          {dueReminders.length === 0 ? (
            <EmptyState title="No active reminders" />
          ) : (
            <ul className="plain-list">
              {dueReminders.map((r) => (
                <li key={r.id} className="list-row">
                  <strong>{r.title}</strong>
                  <span className="muted small">{relativeDay(r.date, today)} · {r.time}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent records" actions={<a className="link" href="#/attendance">View all</a>}>
        <RecordsTable records={records} pageSize={6} filters={false} />
      </Card>
    </>
  );
}
