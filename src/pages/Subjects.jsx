import { useMemo, useState } from "react";
import { RecordsTable } from "../components/RecordsTable.jsx";
import { BandPill, Card, PageHeader, ProgressBar } from "../components/ui/primitives.jsx";
import { attendanceBand, lecturesNeeded, safeBunks } from "../lib/attendance.js";
import { useApp } from "../store/context.js";

const SORTS = {
  name: { label: "Name", fn: (a, b) => a.name.localeCompare(b.name) },
  lowest: { label: "Lowest attendance", fn: (a, b) => a.percentage - b.percentage },
  highest: { label: "Highest attendance", fn: (a, b) => b.percentage - a.percentage },
  total: { label: "Most lectures", fn: (a, b) => b.total - a.total },
};

export default function Subjects() {
  const { subjects, records, settings } = useApp();
  const target = settings.target;
  const [sort, setSort] = useState("lowest");
  const [selectedCode, setSelectedCode] = useState(subjects[0]?.code ?? "");

  const sorted = useMemo(() => [...subjects].sort(SORTS[sort].fn), [subjects, sort]);
  const selected = subjects.find((s) => s.code === selectedCode) ?? subjects[0];
  const selectedRecords = useMemo(
    () => records.filter((r) => r.subjectCode === selected?.code),
    [records, selected],
  );

  return (
    <>
      <PageHeader title="Subjects" subtitle="Attendance, safe bunks and lectures needed for every subject." />

      <Card
        title="Subject-wise attendance"
        subtitle={`${subjects.length} subjects · target ${target}%`}
        actions={
          <label className="inline-field">
            <span className="muted small">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
            </select>
          </label>
        }
      >
        <div className="subject-grid">
          {sorted.map((s) => {
            const band = attendanceBand(s.attended, s.total, target);
            const needed = lecturesNeeded(s.attended, s.total, target);
            const bunks = safeBunks(s.attended, s.total, target);
            return (
              <button
                type="button"
                key={s.code}
                className={`subject-card ${selected?.code === s.code ? "selected" : ""}`}
                onClick={() => setSelectedCode(s.code)}
                aria-pressed={selected?.code === s.code}
              >
                <div className="subject-top">
                  <div>
                    <strong>{s.name}</strong>
                    <span className="muted small block">{s.code} · {s.type}</span>
                  </div>
                  <strong className="subject-pct">{s.percentage.toFixed(1)}%</strong>
                </div>
                <ProgressBar value={s.percentage} target={target} band={band} label={`${s.name} attendance`} />
                <div className="subject-foot">
                  <span className="muted small">{s.attended}/{s.total} attended</span>
                  <BandPill band={band} />
                </div>
                <p className="small subject-hint">
                  {s.total === 0
                    ? "No lectures yet"
                    : needed === 0
                      ? `Can miss ${bunks} more`
                      : needed === null
                        ? "Target unreachable"
                        : `Attend next ${needed} to reach ${target}%`}
                  {s.cancelled > 0 && <span className="muted"> · {s.cancelled} cancelled</span>}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {selected && (
        <Card
          title={`${selected.name} history`}
          subtitle={`${selected.code} — select another subject above`}
        >
          <RecordsTable key={selected.code} records={selectedRecords} showSubject={false} pageSize={10} emptyText="No lectures recorded for this subject yet." />
        </Card>
      )}
    </>
  );
}
