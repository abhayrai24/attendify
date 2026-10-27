import { Download, FileSpreadsheet } from "lucide-react";
import { OverviewCard } from "../components/OverviewCard.jsx";
import { RecordsTable } from "../components/RecordsTable.jsx";
import { Card, PageHeader } from "../components/ui/primitives.jsx";
import { useToast } from "../components/ui/feedback.js";
import { downloadFile, toCSV } from "../lib/csv.js";
import { sortRecordsNewestFirst } from "../lib/attendance.js";
import { useActions, useApp } from "../store/context.js";

const RECORD_COLUMNS = [
  { label: "Date", value: (r) => r.date },
  { label: "Period", value: (r) => r.period ?? "" },
  { label: "Subject code", value: (r) => r.subjectCode },
  { label: "Subject", value: (r) => r.subjectName },
  { label: "Type", value: (r) => r.type },
  { label: "Status", value: (r) => r.status },
  { label: "Lectures", value: (r) => r.lectures },
  { label: "Source", value: (r) => r.source },
];

export default function Attendance() {
  const { settings, records, erp } = useApp();
  const { updateSettings } = useActions();
  const toast = useToast();

  const exportCsv = () => {
    downloadFile("attendify-records.csv", toCSV(sortRecordsNewestFirst(records), RECORD_COLUMNS), "text/csv");
    toast("Records exported as CSV.", { type: "success" });
  };

  return (
    <>
      <PageHeader title="Attendance" subtitle="Your overall position, target and full record history." />
      <OverviewCard />

      <Card title="Attendance target" subtitle="Used for safe bunks, lectures needed, the planner and subject status.">
        <div className="target-control">
          <input
            type="range"
            min="50"
            max="100"
            step="1"
            value={settings.target}
            onChange={(e) => updateSettings({ target: Number(e.target.value) })}
            aria-label="Target attendance percentage"
          />
          <label className="inline-field">
            <input
              type="number"
              min="1"
              max="100"
              value={settings.target}
              onChange={(e) => e.target.value !== "" && updateSettings({ target: Number(e.target.value) })}
              aria-label="Target percentage"
            />
            <span>%</span>
          </label>
        </div>
      </Card>

      <Card
        title="All records"
        subtitle={`${records.length} entries from ${erp.imported ? "your imported ERP workbook" : "the built-in ERP data"} and your own marks`}
        actions={
          <>
            <a className="btn btn-sm" href="#/settings" title="Update the history from your ERP Excel workbook">
              <FileSpreadsheet size={15} aria-hidden="true" /> Import ERP .xlsx
            </a>
            <button type="button" className="btn btn-sm" onClick={exportCsv}>
              <Download size={15} aria-hidden="true" /> Export CSV
            </button>
          </>
        }
      >
        <RecordsTable records={records} pageSize={12} />
      </Card>
    </>
  );
}
