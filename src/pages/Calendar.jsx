import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DaySchedule } from "../components/DaySchedule.jsx";
import { Card, PageHeader } from "../components/ui/primitives.jsx";
import { dayState, unrecordedPeriods } from "../lib/attendance.js";
import { formatLongDate, parseISODate, toISODate } from "../lib/dates.js";
import { useApp } from "../store/context.js";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar() {
  const { today, ctx, holidays, records } = useApp();
  const [selected, setSelected] = useState(today);
  const [monthStart, setMonthStart] = useState(() => {
    const d = parseISODate(today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDate = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const entry = map.get(r.date) || { present: 0, absent: 0, cancelled: 0 };
      entry[r.status] += 1;
      map.set(r.date, entry);
    }
    return map;
  }, [records]);

  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (monthStart.getDay() + 6) % 7; // Monday-first grid

  const goTo = (offset) => setMonthStart(new Date(year, month + offset, 1));
  const goToToday = () => {
    const d = parseISODate(today);
    setMonthStart(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelected(today);
  };

  const monthLabel = monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Calendar" subtitle="Mark attendance period by period and review any day." />

      <div className="grid-calendar">
        <Card
          title={monthLabel}
          actions={
            <div className="btn-group">
              <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => goTo(-1)}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="btn btn-sm" onClick={goToToday}>Today</button>
              <button type="button" className="icon-btn" aria-label="Next month" onClick={() => goTo(1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          }
        >
          <div className="cal-weekdays" aria-hidden="true">
            {WEEKDAY_HEADERS.map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="cal-grid">
            {Array.from({ length: leading }, (_, i) => <div key={`e${i}`} />)}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = toISODate(new Date(year, month, i + 1));
              const state = dayState(date, ctx, today);
              const counts = byDate.get(date);
              const unmarked = state === "open" && date < today && unrecordedPeriods(date, ctx) > 0;
              const holiday = holidays[date];
              const label = [
                formatLongDate(date),
                holiday,
                state === "off" && !holiday ? "Weekend" : null,
                counts && `${counts.present} present, ${counts.absent} absent`,
                unmarked ? "unmarked lectures" : null,
              ].filter(Boolean).join(", ");

              return (
                <button
                  key={date}
                  type="button"
                  className={[
                    "cal-day",
                    `cal-${state}`,
                    date === today && "cal-today",
                    date === selected && "cal-selected",
                  ].filter(Boolean).join(" ")}
                  aria-label={label}
                  aria-pressed={date === selected}
                  title={holiday || undefined}
                  onClick={() => setSelected(date)}
                >
                  <span className="cal-num">{i + 1}</span>
                  <span className="cal-dots" aria-hidden="true">
                    {counts?.present > 0 && <i className="dot dot-present" />}
                    {counts?.absent > 0 && <i className="dot dot-absent" />}
                    {counts?.cancelled > 0 && <i className="dot dot-cancelled" />}
                    {unmarked && <i className="dot dot-unmarked" />}
                  </span>
                  {holiday && <span className="cal-holiday" aria-hidden="true">{holiday}</span>}
                </button>
              );
            })}
          </div>

          <ul className="legend" aria-label="Legend">
            <li><i className="dot dot-present" /> Present</li>
            <li><i className="dot dot-absent" /> Absent</li>
            <li><i className="dot dot-cancelled" /> Cancelled</li>
            <li><i className="dot dot-unmarked" /> Unmarked</li>
          </ul>
        </Card>

        <Card title={formatLongDate(selected)} subtitle={selected === today ? "Today" : undefined}>
          <DaySchedule date={selected} />
        </Card>
      </div>
    </>
  );
}
