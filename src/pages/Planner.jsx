import { useState } from "react";
import { CalendarX, Plus, Trash2 } from "lucide-react";
import { Card, PageHeader, Stat } from "../components/ui/primitives.jsx";
import { isWorkingDay, projectAttendance } from "../lib/attendance.js";
import { addDays, formatDate, formatLongDate, parseISODate, toISODate } from "../lib/dates.js";

const endOfMonth = (value) => {
  const d = parseISODate(value);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
import { useActions, useApp } from "../store/context.js";

export default function Planner() {
  const { overall, settings, planner, ctx, holidays, today, erp } = useApp();
  const { setPlanUntil, addPlannedAbsence, removePlannedAbsence, clearPlanner } = useActions();
  const [absentDate, setAbsentDate] = useState("");
  const [error, setError] = useState("");

  const target = settings.target;
  const minDate = addDays(erp.lastDate, 1);
  const until = planner.until;
  const validUntil = until && until >= minDate;

  const projection = validUntil
    ? projectAttendance({
        attended: overall.attended,
        total: overall.total,
        from: minDate,
        to: until,
        absentDates: planner.absentDates.filter((d) => d <= until),
        target,
        ctx,
      })
    : null;

  const addAbsence = (event) => {
    event.preventDefault();
    if (!validUntil) return setError("Choose a “Plan until” date first.");
    if (!absentDate) return setError("Pick the date you plan to be absent.");
    if (absentDate < minDate) return setError("That date is already covered by recorded attendance. Edit it in the Calendar.");
    if (absentDate > until) return setError("The absent date must be on or before the plan-until date.");
    if (!isWorkingDay(absentDate, ctx)) {
      return setError(holidays[absentDate] ? `That is a holiday (${holidays[absentDate]}).` : "That is a weekend; no lectures are scheduled.");
    }
    if (planner.absentDates.includes(absentDate)) return setError("That date is already in your plan.");
    addPlannedAbsence(absentDate);
    setAbsentDate("");
    setError("");
  };

  const shortcuts = [
    { label: "End of this month", date: endOfMonth(today) },
    { label: "Semester end", date: settings.semesterEnd },
  ];

  return (
    <>
      <PageHeader
        title="Attendance planner"
        subtitle="See where you will land if you skip certain days."
        actions={(until || planner.absentDates.length > 0) && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={clearPlanner}>Reset plan</button>
        )}
      />

      <div className="grid-2">
        <Card title="Your plan" subtitle="Assumes you attend every other scheduled lecture.">
          <div className="form">
            <label className="field">
              <span>Plan until</span>
              <input type="date" min={minDate} value={until} onChange={(e) => setPlanUntil(e.target.value)} />
            </label>
            <div className="chips">
              {shortcuts.map((s) => (
                <button key={s.label} type="button" className="chip" disabled={s.date < minDate} onClick={() => setPlanUntil(s.date)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <form className="form" onSubmit={addAbsence} noValidate>
            <label className="field">
              <span>Planned absence</span>
              <div className="field-row">
                <input type="date" min={minDate} max={until || undefined} value={absentDate} onChange={(e) => { setAbsentDate(e.target.value); setError(""); }} />
                <button type="submit" className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Add</button>
              </div>
            </label>
            {error && <p className="field-error" role="alert">{error}</p>}
          </form>

          {planner.absentDates.length > 0 ? (
            <ul className="plain-list">
              {planner.absentDates.map((d) => (
                <li key={d} className="list-row">
                  <span>{formatLongDate(d)}</span>
                  <button type="button" className="icon-btn" aria-label={`Remove ${formatDate(d)}`} onClick={() => removePlannedAbsence(d)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small"><CalendarX size={14} aria-hidden="true" /> No planned absences.</p>
          )}
        </Card>

        <Card title="Projection" subtitle={validUntil ? `Until ${formatDate(until)}` : "Choose a plan-until date"}>
          {!projection ? (
            <p className="muted">
              Pick a date after {formatDate(erp.lastDate)} to see your projected attendance.
            </p>
          ) : (
            <>
              <div className={`notice ${projection.meetsTarget ? "notice-success" : "notice-danger"}`}>
                <strong>{projection.percentage.toFixed(2)}%</strong>{" "}
                {projection.meetsTarget ? "— target maintained" : "— below target"}
                <span className="muted small block">
                  {Math.abs(projection.percentage - target).toFixed(2)}% {projection.percentage >= target ? "above" : "below"} the {target}% target
                </span>
              </div>

              <div className="stat-grid compact">
                <Stat label="Scheduled lectures" value={projection.scheduled} />
                <Stat label="Planned absences" value={projection.missed} />
                <Stat label="Projected total" value={projection.total} />
                <Stat label="Projected attended" value={projection.attended} />
              </div>

              <p className="advice">
                {!projection.canMeetTarget
                  ? `Even attending everything, ${target}% is out of reach by this date.`
                  : projection.extraMissable > 0
                    ? `You could miss ${projection.extraMissable} more ${projection.extraMissable === 1 ? "lecture" : "lectures"} (about ${Math.floor(projection.extraMissable / 8)} full days) before this date and still reach ${target}%.`
                    : projection.meetsTarget
                      ? "You are right at the limit — no further absences are safe."
                      : "Reduce planned absences to get back above target."}
              </p>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
