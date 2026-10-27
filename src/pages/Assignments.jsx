import { useState } from "react";
import { Check, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { SubjectSelect } from "../components/SubjectSelect.jsx";
import { Card, EmptyState, PageHeader, Stat } from "../components/ui/primitives.jsx";
import { useConfirm, useToast } from "../components/ui/feedback.js";
import { getSubject } from "../config/academic.js";
import { formatDate, relativeDay } from "../lib/dates.js";
import { useActions, useApp } from "../store/context.js";

const EMPTY = { title: "", subjectCode: "", dueDate: "", priority: "medium", notes: "" };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const FILTERS = [
  { id: "active", label: "Active" },
  { id: "overdue", label: "Overdue" },
  { id: "done", label: "Completed" },
  { id: "all", label: "All" },
];

export default function Assignments() {
  const { assignments, today } = useApp();
  const { addItem, updateItem, removeItem } = useActions();
  const confirm = useConfirm();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("active");

  const isOverdue = (a) => a.status !== "done" && a.dueDate && a.dueDate < today;
  const counts = {
    active: assignments.filter((a) => a.status !== "done").length,
    overdue: assignments.filter(isOverdue).length,
    done: assignments.filter((a) => a.status === "done").length,
  };

  const visible = assignments
    .filter((a) =>
      filter === "all" ? true : filter === "done" ? a.status === "done" : filter === "overdue" ? isOverdue(a) : a.status !== "done",
    )
    .sort(
      (a, b) =>
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const submit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    if (editingId) {
      updateItem("assignments", editingId, { ...form, title });
      toast("Assignment updated.", { type: "success" });
    } else {
      addItem("assignments", { ...form, title, status: "todo" });
      toast("Assignment added.", { type: "success" });
    }
    reset();
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({ title: a.title, subjectCode: a.subjectCode, dueDate: a.dueDate, priority: a.priority, notes: a.notes });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (a) => {
    const ok = await confirm({ title: "Delete assignment?", message: `“${a.title}” will be removed permanently.`, confirmLabel: "Delete", danger: true });
    if (ok) {
      removeItem("assignments", a.id);
      if (editingId === a.id) reset();
    }
  };

  return (
    <>
      <PageHeader title="Assignments" subtitle="Deadlines, priorities and progress in one list." />

      <section className="stat-grid" aria-label="Assignment summary">
        <Stat label="Active" value={counts.active} />
        <Stat label="Overdue" value={counts.overdue} tone={counts.overdue ? "bad" : undefined} />
        <Stat label="Completed" value={counts.done} tone="good" />
      </section>

      <Card title={editingId ? "Edit assignment" : "New assignment"}>
        <form className="form form-grid" onSubmit={submit}>
          <label className="field span-2">
            <span>Title</span>
            <input required maxLength={120} value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. DBMS lab file" />
          </label>
          <SubjectSelect value={form.subjectCode} onChange={set("subjectCode")} />
          <label className="field">
            <span>Due date</span>
            <input type="date" value={form.dueDate} onChange={(e) => set("dueDate")(e.target.value)} />
          </label>
          <label className="field">
            <span>Priority</span>
            <select value={form.priority} onChange={(e) => set("priority")(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="field span-2">
            <span>Notes</span>
            <textarea rows={2} maxLength={1000} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </label>
          <div className="form-actions span-2">
            <button type="submit" className="btn btn-primary"><Plus size={16} aria-hidden="true" /> {editingId ? "Save changes" : "Add assignment"}</button>
            {editingId && <button type="button" className="btn" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </Card>

      <Card
        title="Your assignments"
        actions={
          <div className="tabs" role="tablist" aria-label="Filter assignments">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={`tab ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {visible.length === 0 ? (
          <EmptyState title="Nothing here">{filter === "done" ? "Completed assignments appear here." : "Add an assignment above."}</EmptyState>
        ) : (
          <ul className="plain-list">
            {visible.map((a) => (
              <li key={a.id} className={`item ${a.status === "done" ? "item-done" : ""}`}>
                <div className="item-main">
                  <strong>{a.title}</strong>
                  <div className="item-meta">
                    <span className={`pill pill-priority-${a.priority}`}>{a.priority}</span>
                    {a.subjectCode && <span className="tag">{getSubject(a.subjectCode).name}</span>}
                    {a.dueDate && (
                      <span className={isOverdue(a) ? "text-bad small" : "muted small"}>
                        {isOverdue(a) ? "Overdue · " : "Due "}
                        {formatDate(a.dueDate)} ({relativeDay(a.dueDate, today).toLowerCase()})
                      </span>
                    )}
                  </div>
                  {a.notes && <p className="muted small">{a.notes}</p>}
                </div>
                <div className="item-actions">
                  {a.status === "done" ? (
                    <button type="button" className="icon-btn" aria-label="Mark as not done" title="Reopen" onClick={() => updateItem("assignments", a.id, { status: "todo" })}>
                      <Undo2 size={17} />
                    </button>
                  ) : (
                    <>
                      <select
                        className="select-sm"
                        aria-label={`Status of ${a.title}`}
                        value={a.status}
                        onChange={(e) => updateItem("assignments", a.id, { status: e.target.value })}
                      >
                        <option value="todo">To do</option>
                        <option value="in-progress">In progress</option>
                      </select>
                      <button type="button" className="icon-btn" aria-label={`Complete ${a.title}`} title="Mark done" onClick={() => updateItem("assignments", a.id, { status: "done" })}>
                        <Check size={17} />
                      </button>
                    </>
                  )}
                  <button type="button" className="icon-btn" aria-label={`Edit ${a.title}`} onClick={() => startEdit(a)}><Pencil size={16} /></button>
                  <button type="button" className="icon-btn" aria-label={`Delete ${a.title}`} onClick={() => remove(a)}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
