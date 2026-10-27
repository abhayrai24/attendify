import { TIMETABLE, getSubject } from "../config/academic.js";
import {
  addDays,
  eachDate,
  isValidISODate,
  isWeekend,
  monthKey,
  weekdayName,
} from "./dates.js";

export const STATUS = Object.freeze({
  PRESENT: "present",
  ABSENT: "absent",
  CANCELLED: "cancelled",
});

export const VALID_STATUSES = Object.values(STATUS);

/** Cancelled classes were never held, so they never count towards totals. */
export const isCounted = (status) =>
  status === STATUS.PRESENT || status === STATUS.ABSENT;

// ---------------------------------------------------------------- basics

export function percentage(attended, total) {
  return total > 0 ? (attended / total) * 100 : 0;
}

/** Integer-safe "is attended/total >= target%" check. */
export function meetsTarget(attended, total, target) {
  return attended * 100 >= target * total;
}

/**
 * Consecutive lectures that must be attended to reach `target`%.
 * 0 when already there, null when unreachable (100% after any absence).
 */
export function lecturesNeeded(attended, total, target) {
  if (meetsTarget(attended, total, target)) return 0;
  if (target >= 100) return null;
  return Math.ceil((target * total - 100 * attended) / (100 - target));
}

/** Lectures that can still be missed while staying at or above `target`%. */
export function safeBunks(attended, total, target) {
  if (!meetsTarget(attended, total, target) || target <= 0) return 0;
  return Math.max(0, Math.floor((attended * 100) / target) - total);
}

export function attendanceBand(attended, total, target) {
  if (total === 0) return "none";
  if (!meetsTarget(attended, total, target)) return "low";
  return percentage(attended, total) < target + 5 ? "warning" : "safe";
}

// --------------------------------------------------------------- context

/**
 * Everything needed to decide how many periods a date has.
 * `holidays` is the merged default + custom holiday map.
 */
export function makeContext({ marks = {}, holidays = {}, erpDates = new Set() } = {}) {
  return { marks, holidays, erpDates };
}

export function isWorkingDay(date, ctx) {
  return !isWeekend(date) && !ctx.holidays[date];
}

export function scheduleFor(date) {
  return TIMETABLE[weekdayName(date)] || [];
}

/** Why a date can/can't be edited: "open" | "erp" | "future" | "off". */
export function dayState(date, ctx, today) {
  if (ctx.erpDates.has(date)) return "erp";
  if (!isWorkingDay(date, ctx)) return "off";
  if (date > today) return "future";
  return "open";
}

/** Periods on a working day that have no mark yet. */
export function unrecordedPeriods(date, ctx) {
  if (ctx.erpDates.has(date) || !isWorkingDay(date, ctx)) return 0;
  const slots = scheduleFor(date);
  const dayMarks = ctx.marks[date] || {};
  return slots.filter((_, index) => dayMarks[index] === undefined).length;
}

// --------------------------------------------------------------- records

export function buildManualRecords(marks, erpDates = new Set()) {
  const records = [];

  for (const date of Object.keys(marks).sort()) {
    if (!isValidISODate(date) || erpDates.has(date)) continue;
    const slots = scheduleFor(date);

    for (const [key, status] of Object.entries(marks[date])) {
      const index = Number(key);
      const slot = slots[index];
      if (!slot || !VALID_STATUSES.includes(status)) continue;
      const subject = getSubject(slot.subjectCode);

      records.push({
        id: `manual-${date}-${index + 1}`,
        date,
        period: index + 1,
        subjectCode: subject.code,
        subjectName: subject.name,
        lectures: 1,
        status,
        type: slot.type === "lab" ? "Lab" : "Lecture",
        source: "manual",
      });
    }
  }

  return records;
}

/** ERP rows plus manual marks (manual marks on ERP-covered dates are ignored). */
export function buildAllRecords(marks, erp) {
  return [...erp.records, ...buildManualRecords(marks, erp.dates)];
}

/** Newest first; within a day, latest period first. */
export function sortRecordsNewestFirst(records) {
  return [...records].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.period || 0) - (a.period || 0) ||
      String(b.id).localeCompare(String(a.id)),
  );
}

// ------------------------------------------------------------- summaries

export function summarizeSubjects(records, subjects) {
  const totals = {};
  for (const record of records) {
    const entry = (totals[record.subjectCode] ||= { attended: 0, total: 0, cancelled: 0 });
    if (record.status === STATUS.CANCELLED) {
      entry.cancelled += record.lectures;
    } else if (isCounted(record.status)) {
      entry.total += record.lectures;
      if (record.status === STATUS.PRESENT) entry.attended += record.lectures;
    }
  }

  return subjects.map((subject) => {
    const t = totals[subject.code] || { attended: 0, total: 0, cancelled: 0 };
    return {
      ...subject,
      attended: t.attended,
      total: t.total,
      cancelled: t.cancelled,
      absent: t.total - t.attended,
      percentage: percentage(t.attended, t.total),
    };
  });
}

export function overallFromSubjects(subjects) {
  const attended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const total = subjects.reduce((sum, s) => sum + s.total, 0);
  return { attended, total, absent: total - attended, percentage: percentage(attended, total) };
}

export function latestRecordDate(records, fallback = "") {
  return records.reduce((latest, r) => (r.date > latest ? r.date : latest), fallback);
}

// ------------------------------------------------------------ statistics

/** Cumulative attendance after each recorded day. */
export function buildTrend(records) {
  const byDate = new Map();
  for (const r of records) {
    if (!isCounted(r.status)) continue;
    const e = byDate.get(r.date) || { attended: 0, total: 0 };
    e.total += r.lectures;
    if (r.status === STATUS.PRESENT) e.attended += r.lectures;
    byDate.set(r.date, e);
  }

  let attended = 0;
  let total = 0;
  return [...byDate.keys()].sort().map((date) => {
    const day = byDate.get(date);
    attended += day.attended;
    total += day.total;
    return { date, attended, total, percentage: percentage(attended, total) };
  });
}

export function weekdayStats(records) {
  const stats = {};
  for (const r of records) {
    if (!isCounted(r.status)) continue;
    const name = weekdayName(r.date);
    const e = (stats[name] ||= { attended: 0, total: 0 });
    e.total += r.lectures;
    if (r.status === STATUS.PRESENT) e.attended += r.lectures;
  }
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    .filter((name) => stats[name])
    .map((name) => ({ label: name, ...stats[name], percentage: percentage(stats[name].attended, stats[name].total) }));
}

export function monthlyStats(records) {
  const stats = {};
  for (const r of records) {
    if (!isCounted(r.status)) continue;
    const key = monthKey(r.date);
    const e = (stats[key] ||= { attended: 0, total: 0 });
    e.total += r.lectures;
    if (r.status === STATUS.PRESENT) e.attended += r.lectures;
  }
  return Object.keys(stats)
    .sort()
    .map((key) => ({ key, ...stats[key], percentage: percentage(stats[key].attended, stats[key].total) }));
}

/** Streaks of recorded days on which every counted lecture was attended. */
export function dayStreaks(records) {
  const days = new Map();
  for (const r of records) {
    if (!isCounted(r.status)) continue;
    const allPresent = days.get(r.date) ?? true;
    days.set(r.date, allPresent && r.status === STATUS.PRESENT);
  }
  let best = 0;
  let run = 0;
  for (const date of [...days.keys()].sort()) {
    run = days.get(date) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current: run, best, daysRecorded: days.size };
}

// -------------------------------------------------------------- planning

/**
 * Project attendance over [from, to], assuming every unrecorded period is
 * attended except those on `absentDates`.
 */
export function projectAttendance({ attended, total, from, to, absentDates = [], target, ctx }) {
  const absent = new Set(absentDates);
  let scheduled = 0;
  let missed = 0;

  for (const date of eachDate(from, to)) {
    const periods = unrecordedPeriods(date, ctx);
    scheduled += periods;
    if (absent.has(date)) missed += periods;
  }

  const projectedAttended = attended + scheduled - missed;
  const projectedTotal = total + scheduled;
  const canMeetTarget = meetsTarget(attended + scheduled, projectedTotal, target);
  const allowedMisses = Math.floor(((attended + scheduled) * 100 - target * projectedTotal) / 100);

  return {
    scheduled,
    missed,
    attended: projectedAttended,
    total: projectedTotal,
    percentage: percentage(projectedAttended, projectedTotal),
    meetsTarget: meetsTarget(projectedAttended, projectedTotal, target),
    canMeetTarget,
    extraMissable: canMeetTarget ? Math.max(0, allowedMisses - missed) : 0,
  };
}

/** First date by which `needed` consecutive lectures could have been attended. */
export function estimateTargetDate(needed, from, ctx, horizonDays = 400) {
  if (!needed || needed <= 0) return null;
  let remaining = needed;
  for (let i = 0; i <= horizonDays; i += 1) {
    const date = addDays(from, i);
    remaining -= unrecordedPeriods(date, ctx);
    if (remaining <= 0) return date;
  }
  return null;
}

/** Past working days after the ERP snapshot that have unmarked periods. */
export function findUnmarkedDays(today, ctx, since) {
  return eachDate(addDays(since, 1), addDays(today, -1)).filter(
    (date) => unrecordedPeriods(date, ctx) > 0,
  );
}
