import { SUBJECTS } from "../config/academic.js";
import { isValidISODate } from "./dates.js";
import { excelSerialToISO, readWorkbook, XlsxError } from "./xlsx.js";

const MAX_RECORDS = 5000;

/** Accepts Excel serials plus "YYYY-MM-DD", "DD-MM-YYYY" and "DD/MM/YYYY". */
export function parseCellDate(value) {
  if (typeof value === "number") return excelSerialToISO(value);
  if (typeof value !== "string") return null;
  const text = value.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (m) return isValidISODate(`${m[1]}-${m[2]}-${m[3]}`) ? `${m[1]}-${m[2]}-${m[3]}` : null;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return isValidISODate(iso) ? iso : null;
  }
  return null;
}

function parseStatus(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "p" || text === "present") return "present";
  if (text === "a" || text === "absent") return "absent";
  return null;
}

const normalise = (text) => String(text ?? "").trim().toLowerCase();

/** Find the "Date | No. of Lectures | Attendance" header row of a sheet. */
function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 15); r += 1) {
    const cells = Array.from(rows[r] || [], normalise);
    const date = cells.findIndex((c) => c === "date");
    const lectures = cells.findIndex((c) => c.startsWith("no. of lecture") || c === "lectures");
    const status = cells.findIndex((c) => c === "attendance" || c === "status");
    if (date !== -1 && lectures !== -1 && status !== -1) return { row: r, date, lectures, status };
  }
  return null;
}

function titleName(rows, code) {
  const title = String(rows[0]?.[0] ?? "");
  const prefix = `${code} - `;
  return title.startsWith(prefix) ? title.slice(prefix.length).trim() : "";
}

/**
 * Turn an ERP attendance workbook (one sheet per subject) into the dataset
 * shape used by the app. Throws XlsxError / Error with a readable message.
 */
export async function importErpWorkbook(buffer, fileName = "workbook.xlsx") {
  const sheets = await readWorkbook(buffer);
  const known = Object.fromEntries(SUBJECTS.map((s) => [s.code, s]));
  const subjects = [];
  const records = [];
  const warnings = [];

  for (const sheet of sheets) {
    const header = findHeader(sheet.rows);
    if (!header) continue; // Summary or any other non-detail sheet

    const code = sheet.name.trim();
    const title = titleName(sheet.rows, code);
    const base = known[code];
    const subject = base
      ? { ...base }
      : {
          code,
          name: (title || code).toUpperCase(),
          timetableCode: null,
          type: /\blab\b/i.test(title) ? "Lab" : "Lecture",
        };
    subjects.push(subject);

    for (let r = header.row + 1; r < sheet.rows.length; r += 1) {
      const row = sheet.rows[r];
      if (!row) continue;
      const rawDate = row[header.date];
      const rawLectures = row[header.lectures];
      const rawStatus = row[header.status];
      if (rawDate == null && rawLectures == null && rawStatus == null) continue;

      const date = parseCellDate(rawDate);
      const status = parseStatus(rawStatus);
      const lectures = Number(rawLectures);

      if (!date || !status || !Number.isInteger(lectures) || lectures < 1 || lectures > 12) {
        // Free-text notes under the table (e.g. "Add new dates…") end up here.
        if (rawDate != null && typeof rawDate === "number") {
          warnings.push(`${code} row ${r + 1}: skipped (unreadable lectures or status)`);
        }
        continue;
      }

      records.push({
        date,
        subjectCode: code,
        subjectName: subject.name,
        lectures,
        status,
        type: subject.type,
        source: "erp",
      });
    }
  }

  if (subjects.length === 0) {
    throw new XlsxError(
      "No attendance sheets were found. Each subject sheet needs the columns Date, No. of Lectures and Attendance (P/A).",
    );
  }
  if (records.length === 0) throw new XlsxError("The workbook has no attendance rows.");
  if (records.length > MAX_RECORDS) throw new XlsxError("The workbook has too many rows to import.");

  records.forEach((record, index) => {
    record.id = `erp-${String(index + 1).padStart(4, "0")}`;
  });

  const lastDate = records.reduce((latest, r) => (r.date > latest ? r.date : latest), "");
  const asOfInTitle = /\(as of (\d{2})-(\d{2})-(\d{4})\)/i.exec(String(sheets[0].rows[0]?.[0] ?? ""));
  const titleDate = asOfInTitle ? `${asOfInTitle[3]}-${asOfInTitle[2]}-${asOfInTitle[1]}` : "";

  return {
    fileName,
    asOf: titleDate > lastDate ? titleDate : lastDate,
    subjects,
    records,
    warnings,
    lectureCount: records.reduce((sum, r) => sum + r.lectures, 0),
  };
}
