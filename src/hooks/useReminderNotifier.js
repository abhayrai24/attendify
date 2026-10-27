import { useEffect } from "react";

/** Fires a toast (and a system notification when allowed) when a reminder is due. */
export function useReminderNotifier({ reminders, notificationsEnabled, onDue }) {
  useEffect(() => {
    const check = () => {
      const now = new Date();
      for (const reminder of reminders) {
        if (reminder.done || reminder.notified) continue;
        const [h, m] = reminder.time.split(":").map(Number);
        const [y, mo, d] = reminder.date.split("-").map(Number);
        if (new Date(y, mo - 1, d, h, m) > now) continue;

        onDue(reminder);
        if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Attendify reminder", { body: reminder.title });
          } catch {
            /* some browsers only allow notifications from a service worker */
          }
        }
      }
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [reminders, notificationsEnabled, onDue]);
}
