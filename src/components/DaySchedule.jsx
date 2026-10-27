import { CheckCheck, Eraser, Lock } from "lucide-react";
import { PERIOD_TIMINGS } from "../config/academic.js";
import { getSubject } from "../config/academic.js";
import { dayState, scheduleFor, STATUS } from "../lib/attendance.js";
import { useActions, useApp } from "../store/context.js";
import { EmptyState, StatusBadge } from "./ui/primitives.jsx";
import { relativeDay } from "../lib/dates.js";

const OPTIONS = [
  { status: STATUS.PRESENT, label: "Present" },
  { status: STATUS.ABSENT, label: "Absent" },
  { status: STATUS.CANCELLED, label: "Class cancelled" },
];

/** The timetable for one date, with controls when the date is editable. */
export function DaySchedule({ date }) {
  const { ctx, holidays, marks, today, erp } = useApp();
  const { mark, markDay } = useActions();

  const state = dayState(date, ctx, today);
  const slots = scheduleFor(date);
  const dayMarks = marks[date] || {};

  if (state === "erp") {
    const records = erp.records.filter((r) => r.date === date);
    return (
      <div className="day-schedule">
        <p className="notice notice-info">
          <Lock size={16} aria-hidden="true" /> Imported from the ERP workbook — read only.
        </p>
        <ul className="plain-list">
          {records.map((r) => (
            <li key={r.id} className="list-row">
              <div>
                <strong>{r.subjectName}</strong>
                <span className="muted small"> {r.subjectCode} · {r.lectures} {r.lectures === 1 ? "lecture" : "lectures"}</span>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (state === "off") {
    const reason = holidays[date];
    return (
      <EmptyState title={reason || "Weekend"}>No lectures are scheduled on this day.</EmptyState>
    );
  }

  const editable = state === "open";

  return (
    <div className="day-schedule">
      {editable ? (
        <div className="day-bulk">
          <button type="button" className="btn btn-sm" onClick={() => markDay(date, slots.length, STATUS.PRESENT)}>
            <CheckCheck size={15} aria-hidden="true" /> All present
          </button>
          <button type="button" className="btn btn-sm" onClick={() => markDay(date, slots.length, STATUS.ABSENT)}>
            All absent
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => markDay(date, slots.length, null)}>
            <Eraser size={15} aria-hidden="true" /> Clear day
          </button>
        </div>
      ) : (
        <p className="notice notice-info">
          Upcoming ({relativeDay(date, today).toLowerCase()}) — attendance can be marked once the day arrives.
        </p>
      )}

      <ul className="plain-list">
        {slots.map((slot, index) => {
          const subject = getSubject(slot.subjectCode);
          const current = dayMarks[index];
          return (
            <li key={index} className="period-row">
              <div className="period-no">P{index + 1}</div>
              <div className="period-info">
                <strong>{subject.name}</strong>
                <span className="muted small">
                  {PERIOD_TIMINGS[index]} · {subject.code}
                  {slot.type === "lab" && <span className="tag">Lab</span>}
                </span>
              </div>

              {editable ? (
                <div className="segmented" role="group" aria-label={`Period ${index + 1} ${subject.name}`}>
                  {OPTIONS.map((option) => (
                    <button
                      key={option.status}
                      type="button"
                      className={`seg seg-${option.status}`}
                      aria-pressed={current === option.status}
                      title={current === option.status ? "Click again to clear" : option.label}
                      onClick={() => mark(date, index, current === option.status ? null : option.status)}
                    >
                      {option.status === STATUS.CANCELLED ? "Cancelled" : option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="pill pill-none">Upcoming</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
