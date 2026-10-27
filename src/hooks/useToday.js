import { useEffect, useState } from "react";
import { todayISO } from "../lib/dates.js";

/** Today's local date, refreshed at midnight and when the tab regains focus. */
export function useToday() {
  const [today, setToday] = useState(() => todayISO());

  useEffect(() => {
    const refresh = () => setToday(todayISO());
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = setTimeout(refresh, midnight - now);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [today]);

  return today;
}
