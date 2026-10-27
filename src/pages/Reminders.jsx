import { useState } from "react";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import { Card, EmptyState, PageHeader } from "../components/ui/primitives.jsx";
import { useToast } from "../components/ui/feedback.js";
import { formatDate, relativeDay } from "../lib/dates.js";
import { useActions, useApp } from "../store/context.js";

export default function Reminders() {
  const { reminders, today, settings } = useApp();
  const { addItem, updateItem, removeItem, updateSettings } = useActions();
  const toast = useToast();
  const [form, setForm] = useState({ title: "", date: today, time: "09:00" });

  const supported = typeof Notification !== "undefined";
  const permission = supported ? Notification.permission : "denied";

  const sorted = [...reminders].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const active = sorted.filter((r) => !r.done);
  const completed = sorted.filter((r) => r.done).reverse();

  const submit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title || !form.date) return;
    addItem("reminders", { title, date: form.date, time: form.time, done: false, notified: false });
    setForm({ ...form, title: "" });
    toast("Reminder added.", { type: "success" });
  };

  const toggleNotifications = async () => {
    if (settings.notifications) return updateSettings({ notifications: false });
    if (!supported) return toast("This browser does not support notifications.", { type: "error" });
    const result = permission === "granted" ? "granted" : await Notification.requestPermission();
    if (result === "granted") {
      updateSettings({ notifications: true });
      toast("Desktop notifications enabled.", { type: "success" });
    } else {
      toast("Notification permission was not granted. Reminders will still appear in the app.", { type: "info" });
    }
  };

  const renderRow = (r) => {
    const due = !r.done && `${r.date}T${r.time}` <= `${today}T23:59`;
    return (
      <li key={r.id} className={`item ${r.done ? "item-done" : ""}`}>
        <label className="check">
          <input type="checkbox" checked={r.done} onChange={(e) => updateItem("reminders", r.id, { done: e.target.checked })} />
          <span className="item-main">
            <strong>{r.title}</strong>
            <span className={due && r.date < today ? "text-bad small" : "muted small"}>
              {formatDate(r.date)} at {r.time} · {relativeDay(r.date, today)}
            </span>
          </span>
        </label>
        <button type="button" className="icon-btn" aria-label={`Delete ${r.title}`} onClick={() => removeItem("reminders", r.id)}>
          <Trash2 size={16} />
        </button>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Reminders"
        subtitle="Get nudged in the app — and on your desktop if you allow it — while Attendify is open."
        actions={
          <button type="button" className="btn btn-sm" onClick={toggleNotifications} aria-pressed={settings.notifications}>
            {settings.notifications ? <Bell size={15} aria-hidden="true" /> : <BellOff size={15} aria-hidden="true" />}
            Desktop alerts {settings.notifications ? "on" : "off"}
          </button>
        }
      />

      <Card title="New reminder">
        <form className="form form-grid" onSubmit={submit}>
          <label className="field span-2">
            <span>Reminder</span>
            <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mark today's attendance" />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </label>
          <div className="form-actions span-2">
            <button type="submit" className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Add reminder</button>
          </div>
        </form>
      </Card>

      <Card title="Upcoming" subtitle={`${active.length} active`}>
        {active.length === 0 ? <EmptyState title="No active reminders" /> : <ul className="plain-list">{active.map(renderRow)}</ul>}
      </Card>

      {completed.length > 0 && (
        <Card title="Completed">
          <ul className="plain-list">{completed.map(renderRow)}</ul>
        </Card>
      )}
    </>
  );
}
