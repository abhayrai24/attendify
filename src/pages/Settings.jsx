import { useRef, useState } from "react";
import { Download, FileUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Card, PageHeader } from "../components/ui/primitives.jsx";
import { useConfirm, useToast } from "../components/ui/feedback.js";
import { DEFAULT_HOLIDAYS, SEMESTER_LABEL } from "../config/academic.js";
import { ErpImportCard } from "../components/ErpImportCard.jsx";
import { downloadFile } from "../lib/csv.js";
import { formatDate } from "../lib/dates.js";
import { SCHEMA_VERSION, parseBackup, serializeBackup } from "../lib/storage.js";
import { useActions, useApp } from "../store/context.js";
import { isWeekend } from "../lib/dates.js";

export default function Settings() {
  const app = useApp();
  const { settings, customHolidays, today } = app;
  const { updateSettings, addHoliday, removeHoliday, replaceState, resetAll } = useActions();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef(null);
  const [holiday, setHoliday] = useState({ date: "", name: "" });
  const [holidayError, setHolidayError] = useState("");

  const state = {
    version: SCHEMA_VERSION,
    settings: app.settings,
    marks: app.marks,
    customHolidays: app.customHolidays,
    planner: app.planner,
    assignments: app.assignments,
    studyTasks: app.studyTasks,
    reminders: app.reminders,
    erpImport: app.erpImport,
  };

  const exportBackup = () => {
    downloadFile(`attendify-backup-${today}.json`, serializeBackup(state), "application/json");
    toast("Backup downloaded.", { type: "success" });
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const next = parseBackup(await file.text());
      const ok = await confirm({
        title: "Replace current data?",
        message: "Importing a backup replaces everything you have saved in this browser, including attendance marks, tasks and settings.",
        confirmLabel: "Import backup",
        danger: true,
      });
      if (!ok) return;
      replaceState(next);
      toast("Backup imported.", { type: "success" });
    } catch (error) {
      toast(error.message, { type: "error" });
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: "Erase all your data?",
      message: "This deletes your attendance marks, planner, assignments, study sessions, reminders and settings from this browser. Imported ERP history stays. Download a backup first if unsure.",
      confirmLabel: "Erase everything",
      danger: true,
    });
    if (ok) {
      resetAll();
      toast("All data erased.", { type: "info" });
    }
  };

  const submitHoliday = (event) => {
    event.preventDefault();
    const name = holiday.name.trim();
    if (!holiday.date || !name) return setHolidayError("Enter a date and a name.");
    if (DEFAULT_HOLIDAYS[holiday.date]) return setHolidayError("That date is already a college holiday.");
    if (isWeekend(holiday.date)) return setHolidayError("That date is a weekend already.");
    addHoliday(holiday.date, name);
    setHoliday({ date: "", name: "" });
    setHolidayError("");
  };

  const customList = Object.entries(customHolidays).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <PageHeader title="Settings" subtitle="Personalise Attendify and manage your data." />

      <div className="grid-2">
        <Card title="Profile & preferences">
          <div className="form">
            <label className="field">
              <span>Your name</span>
              <input type="text" maxLength={60} value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="Shown in the dashboard greeting" />
            </label>
            <label className="field">
              <span>Attendance target (%)</span>
              <input type="number" min="1" max="100" value={settings.target} onChange={(e) => e.target.value !== "" && updateSettings({ target: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Last teaching day of {SEMESTER_LABEL}</span>
              <input type="date" value={settings.semesterEnd} onChange={(e) => e.target.value && updateSettings({ semesterEnd: e.target.value })} />
            </label>
            <label className="field">
              <span>Theme</span>
              <select value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })}>
                <option value="system">Match system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        </Card>

        <Card title="Your data" subtitle="Backups are .json files made by Attendify. Everything is stored only in this browser.">
          <div className="form">
            <button type="button" className="btn" onClick={exportBackup}><Download size={16} aria-hidden="true" /> Download backup (.json)</button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}><FileUp size={16} aria-hidden="true" /> Import backup (.json)</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
            <button type="button" className="btn btn-danger-outline" onClick={reset}><RotateCcw size={16} aria-hidden="true" /> Erase all data</button>
          </div>
        </Card>
      </div>

      <ErpImportCard />

      <Card title="Custom holidays" subtitle="Days with no lectures that are missing from the college calendar.">
        <form className="field-row" onSubmit={submitHoliday} noValidate>
          <input type="date" aria-label="Holiday date" value={holiday.date} onChange={(e) => { setHoliday({ ...holiday, date: e.target.value }); setHolidayError(""); }} />
          <input type="text" aria-label="Holiday name" maxLength={80} placeholder="Name, e.g. University exam day" value={holiday.name} onChange={(e) => { setHoliday({ ...holiday, name: e.target.value }); setHolidayError(""); }} />
          <button type="submit" className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Add</button>
        </form>
        {holidayError && <p className="field-error" role="alert">{holidayError}</p>}
        {customList.length > 0 && (
          <ul className="plain-list">
            {customList.map(([date, name]) => (
              <li key={date} className="list-row">
                <span><strong>{name}</strong> <span className="muted small">{formatDate(date)}</span></span>
                <button type="button" className="icon-btn" aria-label={`Remove ${name}`} onClick={() => removeHoliday(date)}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
        <details className="details">
          <summary>College holidays ({Object.keys(DEFAULT_HOLIDAYS).length})</summary>
          <ul className="plain-list">
            {Object.entries(DEFAULT_HOLIDAYS).map(([date, name]) => (
              <li key={date} className="list-row"><span>{name}</span><span className="muted small">{formatDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span></li>
            ))}
          </ul>
        </details>
      </Card>

      <Card title="About Attendify" subtitle="Application & developer details">
        <div className="about-info">
          <div>
            <strong>Created by Abhay Rai</strong>
            <p className="muted small">B.Tech CSE 3rd Year</p>
          </div>
          <p className="small muted">
            Designed and built for students to track attendance, calculate safe bunks, and manage academic deadlines offline and privately.
          </p>
          <div className="chips">
            <span className="chip" style={{ cursor: "default" }}>Version 1.0.0</span>
            <span className="chip" style={{ cursor: "default" }}>Offline PWA</span>
            <span className="chip" style={{ cursor: "default" }}>{SEMESTER_LABEL}</span>
          </div>
        </div>
      </Card>
    </>
  );
}
