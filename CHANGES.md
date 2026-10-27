# What changed in this version

## Bugs & design problems fixed

| # | Problem in the original | Fix |
| - | - | - |
| 1 | `App.jsx` was a 900-line component holding timetable, holidays, ERP logic, persistence and every calculation | Split into `config/`, `lib/` (pure, tested), `store/`, `hooks/`, `components/`, `pages/` |
| 2 | Three overlapping sources of truth (`lectureAttendance`, `attendanceHistory`, `subjectAttendance`); the last was saved but never displayed, with stale hard-coded counts | One `marks` map; records and subject totals are derived |
| 3 | Dates parsed with `new Date("2026-08-25")` (UTC) and compared as `toISOString`/mixed strings → off-by-one in some time zones | All dates are local `YYYY-MM-DD` strings (`lib/dates.js`) |
| 4 | Hard-coded dates in logic (`"2026-08-25"` baseline, `"2026-08-26"` in planner, calendar start) | Derived from the ERP data; calendar opens on today |
| 5 | "Today" computed once per render, never refreshed after midnight | `useToday()` refreshes at midnight / tab focus |
| 6 | Percentage tests used floats (`pct < target`) | Integer-safe `meetsTarget`; brute-force tested against definitions |
| 7 | Planner assumed every absence date = 8 lectures even if some periods were already marked; ignored ERP gap days | Projection counts only unrecorded periods per day |
| 8 | Target not saved; typing an empty target set it to 0; planner state lost on refresh | Target, planner and everything else persisted; input validated |
| 9 | Manual marks could not be cleared or marked "class cancelled" | Click an active status to clear; new Cancelled status excluded from totals |
| 10 | Dashboard "Recent Records" showed only manual marks, never the ERP history | Shows all records with source |
| 11 | `alert()` for validation | Inline errors, toasts, accessible confirm dialog |
| 12 | Calendar days were clickable `div`s (no keyboard / screen-reader support) | Real buttons with descriptive labels, `aria-pressed`, skip link, focus styles |
| 13 | Invalid saved data was only backed up on failure; no schema version; multi-tab edits clobbered each other | Versioned schema, sanitising loader, automatic migration from `attendifyData`, cross-tab sync |
| 14 | No error boundary, fixed-width sidebar, 1,857-line stylesheet with duplicated rules | Error boundary, off-canvas mobile sidebar, tokenised light/dark design system |
| 15 | Four sidebar entries opened "This section is not available yet" | Implemented (below) |
| 16 | Template README, package `frontend@0.0.0`, stale `dist/`, `.audit-backups/`, `.freebuff/`, unused assets in the repo | Removed; proper README, name/version, `.gitignore` |
| 17 | No tests | 20 unit tests incl. the ERP workbook totals (370 / 268 / 102) |

## Features added

Study Planner, Assignments, Reminders (with desktop notifications), Settings (profile, target, theme,
custom holidays, JSON backup/restore, erase), dark mode, per-subject advice, statistics charts
(trend, weekday, month, subject), streaks, unmarked-day alerts, CSV export, record search/filter/paging,
bulk day marking, "how many more can I miss" in the planner, hash routing (refresh keeps your page).

## Update: ERP workbook import

* New **Import ERP workbook (.xlsx)** in Settings (and linked from Attendance): reads the ERP Excel file in the browser
  with a small built-in reader (no new dependencies), shows a confirmation with entry/lecture counts, and supports reverting.
* Built-in data refreshed from `Attendance.xlsx`: 288 entries / 389 lectures / 280 present, up to 27 Oct 2026.
* Import format is documented in the README; the real workbook is used as a test fixture and must import to exactly the built-in data.
* Fixed unstyled text inputs and the stacked custom-holiday form.
