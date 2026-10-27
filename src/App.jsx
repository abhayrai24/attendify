import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Menu, X } from "lucide-react";
import { Sidebar } from "./components/Sidebar.jsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary.jsx";
import { useToast } from "./components/ui/feedback.js";
import { ALL_ROUTES } from "./config/navigation.js";
import { useApp, useActions } from "./store/context.js";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useTheme } from "./hooks/useTheme.js";
import { useReminderNotifier } from "./hooks/useReminderNotifier.js";
import { PAGES } from "./pages/index.js";

export default function App() {
  const { settings, reminders, assignments, unmarkedDays, today, storageWarning, dismissStorageWarning } = useApp();
  const { updateItem } = useActions();
  const toast = useToast();
  const [route] = useHashRoute(ALL_ROUTES, "dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  useTheme(settings.theme);

  const onReminderDue = useCallback(
    (reminder) => {
      toast(`Reminder: ${reminder.title}`, { type: "info", duration: 10000 });
      updateItem("reminders", reminder.id, { notified: true });
    },
    [toast, updateItem],
  );
  useReminderNotifier({ reminders, notificationsEnabled: settings.notifications, onDue: onReminderDue });

  const badges = useMemo(
    () => ({
      calendar: unmarkedDays.length,
      assignments: assignments.filter((a) => a.status !== "done" && a.dueDate && a.dueDate < today).length,
      reminders: reminders.filter((r) => !r.done && r.date <= today).length,
    }),
    [unmarkedDays, assignments, reminders, today],
  );

  const Page = PAGES[route];

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <Sidebar active={route} open={menuOpen} onClose={() => setMenuOpen(false)} badges={badges} />

      <div className="main-content">
        <div className="mobile-bar">
          <button type="button" className="icon-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>
          <strong>Attendify</strong>
        </div>

        {storageWarning && (
          <div className="banner" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{storageWarning}</span>
            <button type="button" className="icon-btn" aria-label="Dismiss warning" onClick={dismissStorageWarning}>
              <X size={16} />
            </button>
          </div>
        )}

        <main id="main" className="page" tabIndex={-1}>
          <ErrorBoundary resetKey={route}>
            <Page />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
