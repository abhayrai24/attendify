import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SubjectSelect } from "../components/SubjectSelect.jsx";
import { Card, EmptyState, PageHeader, Stat } from "../components/ui/primitives.jsx";
import { getSubject } from "../config/academic.js";
import { addDays, formatDate, formatMinutes, relativeDay, startOfWeek, weekdayName } from "../lib/dates.js";
import { useActions, useApp } from "../store/context.js";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

export default function StudyPlanner() {
  const { studyTasks, today } = useApp();
  const { addItem, updateItem, removeItem } = useActions();
  const [form, setForm] = useState({ title: "", subjectCode: "", date: today, minutes: 60 });

  const weekStart = startOfWeek(today);
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const tasks = studyTasks.filter((t) => t.date === date);
        return {
          date,
          planned: tasks.reduce((s, t) => s + t.minutes, 0),
          done: tasks.filter((t) => t.done).reduce((s, t) => s + t.minutes, 0),
        };
      }),
    [studyTasks, weekStart],
  );
  const maxPlanned = Math.max(60, ...week.map((d) => d.planned));
  const weekPlanned = week.reduce((s, d) => s + d.planned, 0);
  const weekDone = week.reduce((s, d) => s + d.done, 0);

  const groups = useMemo(() => {
    const sorted = [...studyTasks].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    return [
      { id: "overdue", title: "Overdue", tasks: sorted.filter((t) => !t.done && t.date && t.date < today) },
      { id: "today", title: "Today", tasks: sorted.filter((t) => !t.done && t.date === today) },
      { id: "upcoming", title: "Upcoming", tasks: sorted.filter((t) => !t.done && (!t.date || t.date > today)) },
      { id: "done", title: "Completed", tasks: sorted.filter((t) => t.done).reverse() },
    ].filter((g) => g.tasks.length > 0);
  }, [studyTasks, today]);

  const submit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    addItem("studyTasks", { ...form, title, minutes: Number(form.minutes), done: false });
    setForm((f) => ({ ...f, title: "" }));
  };

  return (
    <>
      <PageHeader title="Study planner" subtitle="Plan focused sessions and see how your week is shaping up." />

      <section className="stat-grid" aria-label="This week">
        <Stat label="Planned this week" value={formatMinutes(weekPlanned)} />
        <Stat label="Completed" value={formatMinutes(weekDone)} tone="good" />
        <Stat label="Remaining" value={formatMinutes(weekPlanned - weekDone)} />
      </section>

      <div className="grid-2">
        <Card title="Add a session">
          <form className="form form-grid" onSubmit={submit}>
            <label className="field span-2">
              <span>What will you study?</span>
              <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Revise normalisation" />
            </label>
            <SubjectSelect value={form.subjectCode} onChange={(v) => setForm({ ...form, subjectCode: v })} />
            <label className="field">
              <span>Date</span>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="field">
              <span>Duration</span>
              <select value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })}>
                {DURATIONS.map((m) => <option key={m} value={m}>{formatMinutes(m)}</option>)}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Add session</button>
            </div>
          </form>
        </Card>

        <Card title="This week" subtitle="Planned vs completed study time">
          <ul className="week-bars">
            {week.map((d) => (
              <li key={d.date} className={d.date === today ? "today" : ""}>
                <div className="week-track" title={`${formatMinutes(d.planned)} planned, ${formatMinutes(d.done)} done`}>
                  <div className="week-planned" style={{ height: `${(d.planned / maxPlanned) * 100}%` }}>
                    <div className="week-done" style={{ height: d.planned ? `${(d.done / d.planned) * 100}%` : 0 }} />
                  </div>
                </div>
                <span className="small">{weekdayName(d.date).slice(0, 3)}</span>
                <span className="muted small">{d.planned ? formatMinutes(d.planned) : "—"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {groups.length === 0 ? (
        <Card><EmptyState title="No study sessions yet">Add your first session above.</EmptyState></Card>
      ) : (
        groups.map((group) => (
          <Card key={group.id} title={group.title} subtitle={`${group.tasks.length} ${group.tasks.length === 1 ? "session" : "sessions"}`}>
            <ul className="plain-list">
              {group.tasks.map((t) => (
                <li key={t.id} className={`item ${t.done ? "item-done" : ""}`}>
                  <label className="check">
                    <input type="checkbox" checked={t.done} onChange={(e) => updateItem("studyTasks", t.id, { done: e.target.checked })} />
                    <span className="item-main">
                      <strong>{t.title}</strong>
                      <span className="item-meta">
                        {t.subjectCode && <span className="tag">{getSubject(t.subjectCode).name}</span>}
                        <span className="muted small">{formatMinutes(t.minutes)}</span>
                        {t.date && <span className="muted small">{formatDate(t.date)} · {relativeDay(t.date, today)}</span>}
                      </span>
                    </span>
                  </label>
                  <button type="button" className="icon-btn" aria-label={`Delete ${t.title}`} onClick={() => removeItem("studyTasks", t.id)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </>
  );
}
