import test from "node:test";
import assert from "node:assert/strict";

import { ERP_ATTENDANCE_RECORDS, ERP_SUBJECTS } from "../src/data/erpAttendance.js";
import { BUILTIN_ERP } from "../src/lib/erpData.js";
import {
  buildAllRecords,
  buildManualRecords,
  buildTrend,
  dayState,
  estimateTargetDate,
  findUnmarkedDays,
  lecturesNeeded,
  makeContext,
  meetsTarget,
  overallFromSubjects,
  projectAttendance,
  safeBunks,
  summarizeSubjects,
  unrecordedPeriods,
} from "../src/lib/attendance.js";
import { addDays, eachDate, isValidISODate, startOfWeek, weekdayName } from "../src/lib/dates.js";
import {
  defaultState,
  loadState,
  migrateLegacy,
  parseBackup,
  sanitizeState,
  serializeBackup,
  STORAGE_KEY,
} from "../src/lib/storage.js";
import { toCSV } from "../src/lib/csv.js";
import { DEFAULT_HOLIDAYS, TIMETABLE, PERIODS_PER_DAY } from "../src/config/academic.js";

const ERP_LAST = BUILTIN_ERP.lastDate; // 2026-10-27
const ctx = (marks = {}, holidays = DEFAULT_HOLIDAYS) => makeContext({ marks, holidays, erpDates: BUILTIN_ERP.dates });

// ----------------------------------------------------------------- dates
test("date helpers", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekdayName("2026-10-24"), "Saturday");
  assert.equal(startOfWeek("2026-10-25"), "2026-10-19"); // Sunday -> previous Monday
  assert.deepEqual(eachDate("2026-10-01", "2026-10-03"), ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.equal(isValidISODate("2026-02-30"), false);
  assert.equal(isValidISODate("nope"), false);
});

// ------------------------------------------------------------- ERP data
test("ERP dataset totals match the ERP workbook", () => {
  const expected = {
    "AAI 501": [17, 9, 8], BCS054: [33, 25, 8], BCS055: [33, 20, 13],
    BCS501: [33, 20, 13], BCS502: [36, 26, 10], BCS503: [35, 22, 13],
    BCS551: [10, 8, 2], BCS552: [13, 13, 0], BCS553: [20, 18, 2],
    "HCL Tech.": [32, 30, 2], VACL01: [26, 22, 4], VADSA501: [46, 28, 18],
    VAFSD501: [36, 26, 10], VASQ501: [12, 8, 4], VASS501: [7, 5, 2],
  };
  const summary = summarizeSubjects(ERP_ATTENDANCE_RECORDS, ERP_SUBJECTS);
  for (const s of summary) {
    assert.deepEqual([s.total, s.attended, s.absent], expected[s.code], s.code);
  }
  const overall = overallFromSubjects(summary);
  assert.deepEqual([overall.total, overall.attended, overall.absent], [389, 280, 109]);
  assert.equal(ERP_ATTENDANCE_RECORDS.length, 288);
  assert.equal(ERP_LAST, "2026-10-27");
});

test("every timetable slot maps to a known ERP subject, 8 periods a day", () => {
  const codes = new Set(ERP_SUBJECTS.map((s) => s.code));
  for (const [day, slots] of Object.entries(TIMETABLE)) {
    assert.equal(slots.length, PERIODS_PER_DAY, day);
    for (const slot of slots) assert.ok(codes.has(slot.subjectCode), `${day}: ${slot.subjectCode}`);
  }
});

// ---------------------------------------------------------- calculations
test("lecturesNeeded", () => {
  assert.equal(lecturesNeeded(75, 100, 75), 0);
  assert.equal(lecturesNeeded(280, 389, 75), 47); // (75*389-100*280)/25
});

test("lecturesNeeded is the smallest n that reaches the target", () => {
  for (let total = 1; total <= 60; total++) {
    for (let att = 0; att <= total; att++) {
      for (const target of [50, 60, 75, 80, 90]) {
        const n = lecturesNeeded(att, total, target);
        assert.ok(meetsTarget(att + n, total + n, target), `${att}/${total}@${target}`);
        if (n > 0) assert.ok(!meetsTarget(att + n - 1, total + n - 1, target), `${att}/${total}@${target} minimal`);
      }
    }
  }
});

test("lecturesNeeded at 100%", () => {
  assert.equal(lecturesNeeded(10, 10, 100), 0);
  assert.equal(lecturesNeeded(9, 10, 100), null);
});

test("safeBunks is the largest m that keeps the target", () => {
  for (let total = 1; total <= 60; total++) {
    for (let att = 0; att <= total; att++) {
      for (const target of [50, 75, 80, 90, 100]) {
        const m = safeBunks(att, total, target);
        if (!meetsTarget(att, total, target)) {
          assert.equal(m, 0);
          continue;
        }
        assert.ok(meetsTarget(att, total + m, target), `${att}/${total}@${target}`);
        assert.ok(!meetsTarget(att, total + m + 1, target), `${att}/${total}@${target} max`);
      }
    }
  }
});

test("exactly-at-target is eligible (no float drift)", () => {
  assert.ok(meetsTarget(75, 100, 75));
  assert.ok(meetsTarget(21, 28, 75));
  assert.equal(safeBunks(21, 28, 75), 0);
});

// -------------------------------------------------------------- records
test("manual marks become records and ERP dates are never double counted", () => {
  const erpDate = ERP_ATTENDANCE_RECORDS[0].date;
  const marks = {
    "2026-10-29": { 0: "present", 1: "absent", 2: "cancelled", 99: "present" }, // Thursday
    [erpDate]: { 0: "absent" },
    "2026-10-27": { 0: "absent" }, // covered by the newer ERP rows
    "2026-10-24": { 0: "present" }, // Saturday: no timetable
  };
  const manual = buildManualRecords(marks, BUILTIN_ERP.dates);
  assert.equal(manual.length, 3);
  assert.deepEqual(manual.map((r) => r.subjectCode), ["BCS552", "BCS552", "VACL01"]);

  const all = buildAllRecords(marks, BUILTIN_ERP);
  const summary = summarizeSubjects(all, BUILTIN_ERP.subjects);
  const overall = overallFromSubjects(summary);
  // 389/280 from ERP + 1 present + 1 absent; the cancelled period is excluded.
  assert.deepEqual([overall.attended, overall.total], [281, 391]);
  assert.equal(summary.find((s) => s.code === "VACL01").cancelled, 1);
});

test("trend ends on the overall figure", () => {
  const trend = buildTrend(ERP_ATTENDANCE_RECORDS);
  const last = trend.at(-1);
  assert.deepEqual([last.attended, last.total], [280, 389]);
  assert.ok(trend.every((p, i) => i === 0 || p.date > trend[i - 1].date));
});

// ------------------------------------------------------------- planning
test("dayState", () => {
  const c = ctx();
  assert.equal(dayState("2026-07-22", c, "2026-10-28"), "erp");
  assert.equal(dayState("2026-10-27", c, "2026-10-28"), "erp"); // newest ERP rows
  assert.equal(dayState("2026-10-24", c, "2026-10-28"), "off"); // Saturday
  assert.equal(dayState("2026-11-06", c, "2026-10-28"), "off"); // Diwali
  assert.equal(dayState("2026-10-29", c, "2026-10-28"), "future");
  assert.equal(dayState("2026-10-28", c, "2026-10-28"), "open");
});

test("unrecordedPeriods respects marks, weekends and holidays", () => {
  const c = ctx({ "2026-10-29": { 0: "present", 1: "cancelled" } });
  assert.equal(unrecordedPeriods("2026-10-29", c), 6);
  assert.equal(unrecordedPeriods("2026-10-30", c), 8);
  assert.equal(unrecordedPeriods("2026-10-31", c), 0); // Saturday
  assert.equal(unrecordedPeriods("2026-11-06", c), 0);
  assert.equal(unrecordedPeriods("2026-10-27", c), 0); // ERP-covered
});

test("projectAttendance counts only unrecorded periods of planned absences", () => {
  const c = ctx({ "2026-10-29": { 0: "present", 1: "present" } });
  const result = projectAttendance({
    attended: 280, total: 389, from: "2026-10-29", to: "2026-10-30",
    absentDates: ["2026-10-29"], target: 75, ctx: c,
  });
  assert.equal(result.scheduled, 6 + 8);
  assert.equal(result.missed, 6);
  assert.equal(result.attended, 280 + 14 - 6);
  assert.equal(result.total, 389 + 14);
});

test("projectAttendance extraMissable keeps the target exactly", () => {
  const base = { attended: 280, total: 389, from: "2026-10-28", to: "2026-11-05", target: 75, ctx: ctx() };
  const open = projectAttendance(base);
  assert.ok(open.canMeetTarget && open.extraMissable > 0);
  assert.ok(meetsTarget(open.attended - open.extraMissable, open.total, 75));
  assert.ok(!meetsTarget(open.attended - open.extraMissable - 1, open.total, 75));
});

test("estimateTargetDate / findUnmarkedDays", () => {
  const c = ctx();
  assert.equal(estimateTargetDate(0, "2026-10-28", c), null);
  // 8 periods per day: 9 lectures starting Wednesday 28 Oct need through Thursday 29 Oct.
  assert.equal(estimateTargetDate(9, "2026-10-28", c), "2026-10-29");
  assert.deepEqual(findUnmarkedDays("2026-10-30", c, ERP_LAST), ["2026-10-28", "2026-10-29"]);
  const full = Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i, "present"]));
  assert.deepEqual(findUnmarkedDays("2026-10-30", ctx({ "2026-10-28": full }), ERP_LAST), ["2026-10-29"]);
});

// -------------------------------------------------------------- storage
const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
};

test("legacy v1 data migrates, keeping per-period marks", () => {
  const legacy = {
    lectureAttendance: { "2026-10-26": { 0: "present", 1: "absent" }, bad: { 0: "present" } },
    subjectAttendance: [{ code: "X", name: "X", attended: 1, total: 2 }],
    attendanceHistory: [],
  };
  const state = migrateLegacy(legacy);
  assert.deepEqual(state.marks, { "2026-10-26": { 0: "present", 1: "absent" } });

  const { state: loaded, migrated } = loadState(memoryStorage({ attendifyData: JSON.stringify(legacy) }));
  assert.equal(migrated, true);
  assert.equal(loaded.marks["2026-10-26"][1], "absent");
});

test("corrupt storage is backed up, not lost", () => {
  const storage = memoryStorage({ [STORAGE_KEY]: "{not json" });
  const { state, warning } = loadState(storage);
  assert.deepEqual(state, defaultState());
  assert.ok(warning);
  assert.equal(storage.data["attendify:corrupt-backup"], "{not json");
});

test("sanitizeState drops invalid entries and clamps values", () => {
  const state = sanitizeState({
    settings: { target: 500, theme: "neon", name: "  Abhay  " },
    marks: { "2026-10-26": { 0: "present", 1: "late", x: "present" }, "2026-13-40": { 0: "present" } },
    assignments: [{ id: "a", title: "Lab file", priority: "urgent", dueDate: "bad" }, { id: "b" }, "junk"],
    reminders: [{ id: "r", title: "Pay fees", date: "2026-11-01", time: "25:00" }],
    studyTasks: [{ id: "s", title: "DSA", minutes: -5 }],
  });
  assert.equal(state.settings.target, 100);
  assert.equal(state.settings.theme, "system");
  assert.equal(state.settings.name, "Abhay");
  assert.deepEqual(state.marks, { "2026-10-26": { 0: "present" } });
  assert.equal(state.assignments.length, 1);
  assert.equal(state.assignments[0].priority, "medium");
  assert.equal(state.assignments[0].dueDate, "");
  assert.equal(state.reminders[0].time, "09:00");
  assert.equal(state.studyTasks[0].minutes, 30);
  assert.deepEqual(sanitizeState(null), defaultState());
});

test("backup round trip and rejection of foreign files", () => {
  const state = sanitizeState({ settings: { target: 80 }, marks: { "2026-10-26": { 0: "absent" } } });
  assert.deepEqual(parseBackup(serializeBackup(state)), state);
  assert.throws(() => parseBackup("nope"), /valid JSON/);
  assert.throws(() => parseBackup('{"hello":1}'), /not an Attendify backup/);
});

test("csv escapes quotes and neutralises formulas", () => {
  const csv = toCSV([{ a: 'He said "hi", ok', b: "=1+1" }], [
    { label: "A", value: (r) => r.a },
    { label: "B", value: (r) => r.b },
  ]);
  assert.equal(csv, `A,B\n"He said ""hi"", ok",'=1+1`);
});
