# Attendify

Attendance and personal management for students (built around the ABES / AKTU Semester 5 timetable).
Everything runs in the browser and is stored locally — no server or account needed.

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Headline attendance, lectures needed / safe bunks, today's schedule with one-click marking, trend chart, subjects needing attention, upcoming deadlines, unmarked-day alerts |
| **Calendar** | Month view with per-day status dots; mark each period Present / Absent / Cancelled (click again to clear), bulk "all present / all absent / clear day"; ERP-imported days are read-only |
| **Attendance** | Overall figure, adjustable target, full searchable/filterable/paginated record history, CSV export |
| **Subjects** | Per-subject %, status band, lectures needed or bunks available, sortable, per-subject history |
| **Statistics** | Target analysis with earliest date, trend, weekday / month / subject breakdowns, streaks |
| **Planner** | Project attendance to any date with planned absences; shows how many more lectures you can miss |
| **Study planner** | Study sessions by subject/date/duration, weekly bar chart, overdue / today / upcoming grouping |
| **Assignments** | Add / edit / delete, priority, status, due-date countdown, overdue tracking |
| **Reminders** | Date + time reminders, in-app toasts and optional desktop notifications while the app is open |
| **Settings** | Name, target, semester end, light/dark/system theme, custom holidays, **ERP workbook (.xlsx) import**, JSON backup & restore, erase data |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Node's built-in test runner, no extra deps)
npm run lint
npm run build      # static site in dist/
```

Requires Node 20+.

## How attendance is calculated

* **ERP history** is read-only. It ships built in (`src/data/erpAttendance.js`, up to 27 Oct 2026) and can be replaced any time by importing your ERP Excel workbook (below).
* **Your marks** are stored per date and per timetable period; every mark becomes one lecture record.
* Totals = ERP records + your marks. A date covered by ERP data can never be double counted or edited.
* **Cancelled** periods are kept in history but excluded from totals.
* Target maths uses integer comparisons, so exactly-75% is "eligible" with no floating-point drift.
  * Lectures needed: smallest `n` with `(attended+n) / (total+n) ≥ target`.
  * Safe bunks: largest `m` with `attended / (total+m) ≥ target`.

## Project structure

```
src/
  config/      timetable, periods, holidays, navigation
  data/        read-only ERP import
  lib/         pure logic: dates, attendance maths, storage/migration, csv  (unit tested)
  store/       reducer + React context (single source of truth)
  hooks/       theme, hash routing, today's date, reminder notifier
  components/  shared UI, charts, schedule and record views
  pages/       one file per route
  styles/      design tokens + components (light & dark)
tests/         node:test suites for lib/
```

## Importing your ERP Excel workbook

**Settings → ERP attendance data → Import ERP workbook (.xlsx)**

* One sheet per subject, named by subject code (e.g. `BCS501`), with the header row
  `Date | No. of Lectures | Attendance` and one row per entry (`P` = present, `A` = absent).
  A `Summary` sheet is ignored. Dates may be Excel dates or text (`2026-10-27`, `27-10-2026`, `27/10/2026`).
* Add new dates under each table, then re-import — the workbook replaces the previous ERP history.
* Days covered by the workbook become read-only; any marks you made yourself on those days are ignored so nothing is counted twice.
* The file is read entirely in your browser (no upload). The import is stored locally, included in JSON backups, and can be reverted to the built-in data.
* This is different from **Import backup**, which only accepts the `.json` files created by *Download backup*.

## Updating for a new semester

1. Import the new ERP workbook (or replace `src/data/erpAttendance.js` to change the built-in copy).
2. Edit `TIMETABLE`, `PERIOD_TIMINGS`, `DEFAULT_HOLIDAYS` and `SEMESTER_LABEL` in `src/config/academic.js`.
   Timetable slots reference ERP subject codes, so marks and ERP history always line up.
3. `npm test` — the ERP totals test should be updated to the new workbook figures.

## Data & privacy

All data lives in `localStorage` (`attendify:v2`). Use **Settings → Download backup** regularly;
clearing browser data erases it. Data saved by the earlier version (`attendifyData`) is migrated automatically.

## Author

Created by **Abhay Rai** (B.Tech CSE 3rd Year).

