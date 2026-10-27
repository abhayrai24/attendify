import { DEFAULT_SEMESTER_END } from "../config/academic.js";
import { VALID_STATUSES } from "./attendance.js";
import { isValidISODate } from "./dates.js";

export const STORAGE_KEY = "attendify:v2";
export const LEGACY_KEY = "attendifyData";
export const CORRUPT_BACKUP_KEY = "attendify:corrupt-backup";
export const SCHEMA_VERSION = 2;

export const THEMES = ["system", "light", "dark"];
export const PRIORITIES = ["low", "medium", "high"];
export const ASSIGNMENT_STATUSES = ["todo", "in-progress", "done"];

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    settings: {
      name: "",
      target: 75,
      theme: "system",
      semesterEnd: DEFAULT_SEMESTER_END,
      notifications: false,
    },
    marks: {},
    customHolidays: {},
    planner: { until: "", absentDates: [] },
    assignments: [],
    studyTasks: [],
    reminders: [],
    erpImport: null,
  };
}

// ------------------------------------------------------------ validators

const isObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validDate = (v) => (isValidISODate(v) ? v : "");
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);
const positiveInt = (v, fallback, max = 1440) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

function sanitizeMarks(raw) {
  const marks = {};
  if (!isObject(raw)) return marks;
  for (const [date, periods] of Object.entries(raw)) {
    if (!isValidISODate(date) || !isObject(periods)) continue;
    for (const [key, status] of Object.entries(periods)) {
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 && index < 12 && VALID_STATUSES.includes(status)) {
        (marks[date] ||= {})[index] = status;
      }
    }
  }
  return marks;
}

function sanitizeList(raw, mapItem) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!isObject(item)) continue;
    const mapped = mapItem(item);
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    out.push(mapped);
  }
  return out;
}

const withId = (item) => str(item.id, 80) || null;

/** Validate a stored ERP workbook import; returns null if unusable. */
function sanitizeErpImport(raw) {
  if (!isObject(raw) || !Array.isArray(raw.records) || !Array.isArray(raw.subjects)) return null;

  const subjects = [];
  const codes = new Set();
  for (const s of raw.subjects.slice(0, 100)) {
    const code = isObject(s) ? str(s.code, 40) : "";
    if (!code || codes.has(code)) continue;
    codes.add(code);
    subjects.push({
      code,
      name: str(s.name, 80) || code,
      timetableCode: s.timetableCode ? str(s.timetableCode, 40) : null,
      type: s.type === "Lab" ? "Lab" : "Lecture",
    });
  }

  const records = [];
  for (const r of raw.records.slice(0, 5000)) {
    if (!isObject(r) || !isValidISODate(r.date) || !codes.has(r.subjectCode)) continue;
    const lectures = Math.round(Number(r.lectures));
    if (!(lectures >= 1 && lectures <= 12) || !["present", "absent"].includes(r.status)) continue;
    const subject = subjects.find((s) => s.code === r.subjectCode);
    records.push({
      id: `erp-${String(records.length + 1).padStart(4, "0")}`,
      date: r.date,
      subjectCode: r.subjectCode,
      subjectName: subject.name,
      lectures,
      status: r.status,
      type: subject.type,
      source: "erp",
    });
  }
  if (records.length === 0) return null;

  const lastDate = records.reduce((latest, r) => (r.date > latest ? r.date : latest), "");
  return {
    fileName: str(raw.fileName, 120) || "workbook.xlsx",
    importedAt: str(raw.importedAt, 40),
    asOf: validDate(raw.asOf) > lastDate ? raw.asOf : lastDate,
    subjects,
    records,
  };
}

/** Coerce arbitrary data into a valid state. Never throws. */
export function sanitizeState(raw) {
  const base = defaultState();
  if (!isObject(raw)) return base;

  const s = isObject(raw.settings) ? raw.settings : {};
  const target = Math.round(Number(s.target));
  base.settings = {
    name: str(s.name, 60),
    target: Number.isFinite(target) ? Math.min(100, Math.max(1, target)) : 75,
    theme: oneOf(s.theme, THEMES, "system"),
    semesterEnd: validDate(s.semesterEnd) || DEFAULT_SEMESTER_END,
    notifications: s.notifications === true,
  };

  base.marks = sanitizeMarks(raw.marks);
  base.erpImport = sanitizeErpImport(raw.erpImport);

  if (isObject(raw.customHolidays)) {
    for (const [date, name] of Object.entries(raw.customHolidays)) {
      if (isValidISODate(date) && str(name, 80)) base.customHolidays[date] = str(name, 80);
    }
  }

  if (isObject(raw.planner)) {
    base.planner.until = validDate(raw.planner.until);
    base.planner.absentDates = Array.isArray(raw.planner.absentDates)
      ? [...new Set(raw.planner.absentDates.filter(isValidISODate))].sort()
      : [];
  }

  base.assignments = sanitizeList(raw.assignments, (a) => {
    const id = withId(a);
    const title = str(a.title, 120);
    if (!id || !title) return null;
    return {
      id,
      title,
      subjectCode: str(a.subjectCode, 40),
      dueDate: validDate(a.dueDate),
      priority: oneOf(a.priority, PRIORITIES, "medium"),
      status: oneOf(a.status, ASSIGNMENT_STATUSES, "todo"),
      notes: str(a.notes, 1000),
    };
  });

  base.studyTasks = sanitizeList(raw.studyTasks, (t) => {
    const id = withId(t);
    const title = str(t.title, 120);
    if (!id || !title) return null;
    return {
      id,
      title,
      subjectCode: str(t.subjectCode, 40),
      date: validDate(t.date),
      minutes: positiveInt(t.minutes, 30),
      done: t.done === true,
    };
  });

  base.reminders = sanitizeList(raw.reminders, (r) => {
    const id = withId(r);
    const title = str(r.title, 120);
    const date = validDate(r.date);
    if (!id || !title || !date) return null;
    return {
      id,
      title,
      date,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : "09:00",
      done: r.done === true,
      notified: r.notified === true,
    };
  });

  return base;
}

/** Convert the pre-2.0 `attendifyData` blob into the current schema. */
export function migrateLegacy(legacy) {
  const state = defaultState();
  if (isObject(legacy)) {
    // Only the per-period marks are authoritative; the old per-subject
    // counters and history list were derived from them.
    state.marks = sanitizeMarks(legacy.lectureAttendance);
  }
  return state;
}

// ----------------------------------------------------------- persistence

/**
 * Load saved state. Returns { state, warning }. Unreadable data is copied to
 * a backup key so nothing is silently destroyed.
 */
export function loadState(storage) {
  try {
    const current = storage.getItem(STORAGE_KEY);
    if (current) {
      try {
        return { state: sanitizeState(JSON.parse(current)), warning: null };
      } catch {
        storage.setItem(CORRUPT_BACKUP_KEY, current);
        return {
          state: defaultState(),
          warning: "Saved data could not be read. A copy was kept and the app was reset.",
        };
      }
    }

    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy) {
      try {
        return { state: migrateLegacy(JSON.parse(legacy)), warning: null, migrated: true };
      } catch {
        return { state: defaultState(), warning: null };
      }
    }
  } catch {
    return { state: defaultState(), warning: "Browser storage is unavailable; changes will not be saved." };
  }
  return { state: defaultState(), warning: null };
}

export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- backup

export function serializeBackup(state, now = new Date()) {
  return JSON.stringify(
    { app: "attendify", version: SCHEMA_VERSION, exportedAt: now.toISOString(), data: state },
    null,
    2,
  );
}

/** Parse and validate a backup file; throws a readable Error when invalid. */
export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!isObject(parsed) || parsed.app !== "attendify" || !isObject(parsed.data)) {
    throw new Error("That file is not an Attendify backup.");
  }
  return sanitizeState(parsed.data);
}
