import { SUBJECTS } from "../config/academic.js";
import {
  ERP_ATTENDANCE_RECORDS,
  ERP_ATTENDANCE_SOURCE,
  ERP_SUBJECTS,
} from "../data/erpAttendance.js";

/**
 * Wrap raw ERP rows into the dataset the app works with. Subjects from the
 * timetable that have no sheet in the workbook are kept (with zero lectures)
 * so manual marks for them still show up.
 */
export function makeErpDataset({ records, subjects, asOf, fileName, imported = false, importedAt = null }) {
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  for (const known of SUBJECTS) if (!byCode.has(known.code)) byCode.set(known.code, known);

  const lastDate = records.reduce((latest, r) => (r.date > latest ? r.date : latest), "");
  return {
    records,
    subjects: [...byCode.values()],
    dates: new Set(records.map((r) => r.date)),
    lastDate: lastDate || asOf,
    asOf,
    fileName,
    imported,
    importedAt,
    lectureCount: records.reduce((sum, r) => sum + r.lectures, 0),
  };
}

export const BUILTIN_ERP = makeErpDataset({
  records: ERP_ATTENDANCE_RECORDS,
  subjects: ERP_SUBJECTS,
  asOf: ERP_ATTENDANCE_SOURCE.asOf,
  fileName: ERP_ATTENDANCE_SOURCE.workbook,
});
