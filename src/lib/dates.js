// Date helpers. All dates are handled as local "YYYY-MM-DD" strings so that
// time zones never shift a lecture onto the wrong day.

const pad = (n) => String(n).padStart(2, "0");

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return toISODate(parseISODate(value)) === value;
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

export function addDays(value, amount) {
  const date = parseISODate(value);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

export function weekdayName(value) {
  return WEEKDAY_NAMES[parseISODate(value).getDay()];
}

export function isWeekend(value) {
  const day = parseISODate(value).getDay();
  return day === 0 || day === 6;
}

export function daysBetween(from, to) {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86400000);
}

/** Inclusive list of dates from `from` to `to`. */
export function eachDate(from, to) {
  const dates = [];
  if (from > to) return dates;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    dates.push(d);
  }
  return dates;
}

/** Monday of the week containing `value`. */
export function startOfWeek(value) {
  const day = parseISODate(value).getDay();
  return addDays(value, day === 0 ? -6 : 1 - day);
}

export function monthKey(value) {
  return value.slice(0, 7);
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!isValidISODate(value)) return "—";
  return parseISODate(value).toLocaleDateString("en-IN", options);
}

export function formatLongDate(value) {
  return formatDate(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonth(key) {
  return parseISODate(`${key}-01`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

/** "Today", "Tomorrow", "in 3 days", "2 days ago". */
export function relativeDay(value, today) {
  const diff = daysBetween(today, value);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
}

export function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
