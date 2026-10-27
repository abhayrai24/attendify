import { useRef, useState } from "react";
import { FileSpreadsheet, RotateCcw } from "lucide-react";
import { Card } from "./ui/primitives.jsx";
import { useConfirm, useToast } from "./ui/feedback.js";
import { importErpWorkbook } from "../lib/erpImport.js";
import { BUILTIN_ERP } from "../lib/erpData.js";
import { formatDate } from "../lib/dates.js";
import { useActions, useApp } from "../store/context.js";

/** Import the ERP attendance workbook (.xlsx) that replaces the built-in history. */
export function ErpImportCard() {
  const { erp, marks } = useApp();
  const { importErp, clearErpImport } = useActions();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      toast("Please choose an Excel .xlsx file (the ERP attendance workbook).", { type: "error" });
      return;
    }

    setBusy(true);
    try {
      const result = await importErpWorkbook(await file.arrayBuffer(), file.name);
      const newDates = new Set(result.records.map((r) => r.date));
      const superseded = Object.keys(marks).filter((d) => newDates.has(d)).length;
      const diff = result.records.length - erp.records.length;

      const ok = await confirm({
        title: "Import this workbook?",
        message:
          `“${file.name}” has ${result.records.length} entries (${result.lectureCount} lectures) up to ` +
          `${formatDate(result.asOf)} across ${result.subjects.length} subjects, ` +
          (diff === 0
            ? "the same number of entries as the current data. "
            : `${Math.abs(diff)} ${diff > 0 ? "more" : "fewer"} ${Math.abs(diff) === 1 ? "entry" : "entries"} than the current data. `) +
          "It replaces the current ERP history." +
          (superseded
            ? ` Your own marks on ${superseded} ${superseded === 1 ? "day" : "days"} now covered by the workbook will be ignored so nothing is counted twice.`
            : ""),
        confirmLabel: "Import workbook",
      });
      if (!ok) return;

      importErp({
        fileName: file.name,
        importedAt: new Date().toISOString(),
        asOf: result.asOf,
        subjects: result.subjects,
        records: result.records,
      });
      toast(
        result.warnings.length
          ? `Imported with ${result.warnings.length} skipped row(s).`
          : `Imported ${result.records.length} entries.`,
        { type: result.warnings.length ? "info" : "success" },
      );
    } catch (error) {
      toast(error.message || "Could not read that file.", { type: "error", duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  const revert = async () => {
    const ok = await confirm({
      title: "Revert to built-in ERP data?",
      message: `The imported workbook “${erp.fileName}” will be removed and the history that ships with Attendify (up to ${formatDate(BUILTIN_ERP.asOf)}) will be used again.`,
      confirmLabel: "Revert",
      danger: true,
    });
    if (ok) {
      clearErpImport();
      toast("Reverted to built-in ERP data.", { type: "info" });
    }
  };

  return (
    <Card
      title="ERP attendance data"
      subtitle="Import your ERP Excel workbook to update the history. Dates it covers are read-only."
    >
      <dl className="kv">
        <div><dt>Source</dt><dd>{erp.imported ? `Imported: ${erp.fileName}` : `Built-in: ${erp.fileName}`}</dd></div>
        <div><dt>Entries</dt><dd>{erp.records.length} ({erp.lectureCount} lectures)</dd></div>
        <div><dt>Up to</dt><dd>{formatDate(erp.asOf)}</dd></div>
        {erp.imported && erp.importedAt && <div><dt>Imported on</dt><dd>{formatDate(erp.importedAt.slice(0, 10))}</dd></div>}
      </dl>

      <div className="btn-row">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          <FileSpreadsheet size={16} aria-hidden="true" /> {busy ? "Reading…" : "Import ERP workbook (.xlsx)"}
        </button>
        {erp.imported && (
          <button type="button" className="btn" onClick={revert}>
            <RotateCcw size={16} aria-hidden="true" /> Use built-in data
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onFile}
        />
      </div>

      <details className="details">
        <summary>Expected format</summary>
        <p className="muted small">
          One sheet per subject, named with the subject code (e.g. <code>BCS501</code>). Each sheet has a header row
          with <code>Date</code>, <code>No. of Lectures</code> and <code>Attendance</code> (P or A), then one row per
          lecture entry. A <code>Summary</code> sheet is ignored. Add new dates under the table and re-import whenever
          your ERP updates.
        </p>
      </details>
    </Card>
  );
}
