import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { sortRecordsNewestFirst } from "../lib/attendance.js";
import { formatDate } from "../lib/dates.js";
import { EmptyState, StatusBadge } from "./ui/primitives.jsx";

/** Sortable, filterable, paginated attendance records. */
export function RecordsTable({ records, pageSize = 10, filters = true, showSubject = true, emptyText }) {
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => sortRecordsNewestFirst(records), [records]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (source === "all" || r.source === source) &&
        (!q || `${r.subjectName} ${r.subjectCode} ${r.date}`.toLowerCase().includes(q)),
    );
  }, [sorted, status, source, query]);

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages - 1);
  const rows = visible.slice(current * pageSize, (current + 1) * pageSize);

  const change = (setter) => (event) => {
    setter(event.target.value);
    setPage(0);
  };

  return (
    <div>
      {filters && (
        <div className="filters">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Search subject or date" value={query} onChange={change(setQuery)} aria-label="Search records" />
          </label>
          <select value={status} onChange={change(setStatus)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={source} onChange={change(setSource)} aria-label="Filter by source">
            <option value="all">All sources</option>
            <option value="erp">ERP import</option>
            <option value="manual">Marked by me</option>
          </select>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No records found">{emptyText || "Try changing the filters."}</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                {showSubject && <th>Subject</th>}
                <th>Status</th>
                <th>Type</th>
                <th>Lectures</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {formatDate(r.date)}
                    {r.period && <span className="muted small"> · P{r.period}</span>}
                  </td>
                  {showSubject && (
                    <td>
                      <strong>{r.subjectName}</strong>
                      <span className="muted small block">{r.subjectCode}</span>
                    </td>
                  )}
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.type}</td>
                  <td>{r.lectures}</td>
                  <td>{r.source === "erp" ? "ERP" : "Manual"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visible.length > pageSize && (
        <div className="pager">
          <span className="muted small">
            {current * pageSize + 1}–{Math.min(visible.length, (current + 1) * pageSize)} of {visible.length}
          </span>
          <button type="button" className="icon-btn" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
