import { ERP_SUBJECTS } from "../data/erpAttendance.js";

export const SEMESTER_LABEL = "Semester 5";

/** Default last teaching day; editable in Settings. */
export const DEFAULT_SEMESTER_END = "2027-01-15";

export const PERIOD_TIMINGS = [
  "08:50 - 09:40",
  "09:40 - 10:30",
  "10:40 - 11:30",
  "11:30 - 12:20",
  "12:20 - 01:10",
  "02:00 - 02:50",
  "02:50 - 03:40",
  "03:40 - 04:30",
];

export const PERIODS_PER_DAY = PERIOD_TIMINGS.length;

export const WORKING_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const L = (subjectCode) => ({ subjectCode, type: "lecture" });
const LAB = (subjectCode) => ({ subjectCode, type: "lab" });

// Timetable slots reference ERP subject codes directly, so manual marks and
// imported ERP history always land on the same subject.
export const TIMETABLE = {
  Monday: [
    L("BCS055"), L("BCS503"), L("VACL01"), L("VACL01"),
    L("BCS503"), L("VASQ501"), L("VASQ501"), L("AAI 501"),
  ],
  Tuesday: [
    LAB("BCS553"), LAB("BCS553"), L("BCS054"), L("BCS501"),
    L("BCS054"), L("BCS502"), L("BCS055"), L("BCS503"),
  ],
  Wednesday: [
    L("VADSA501"), L("VADSA501"), L("BCS055"), L("BCS054"),
    L("AAI 501"), L("VAFSD501"), L("VAFSD501"), L("BCS502"),
  ],
  Thursday: [
    LAB("BCS552"), LAB("BCS552"), L("VACL01"), L("VAFSD501"),
    L("VAFSD501"), L("BCS501"), L("VADSA501"), L("VADSA501"),
  ],
  Friday: [
    LAB("BCS551"), LAB("BCS551"), L("VASS501"), L("VADSA501"),
    L("VADSA501"), L("BCS502"), L("BCS503"), L("BCS501"),
  ],
};

// AKTU academic calendar holidays (Semester 5).
export const DEFAULT_HOLIDAYS = {
  "2026-08-11": "Shravan Shivratri",
  "2026-08-15": "Independence Day",
  "2026-08-26": "Eid-e-Milad / Milad-un-Nab",
  "2026-08-28": "Raksha Bandhan",
  "2026-09-04": "Janmashtami",
  "2026-10-02": "Gandhi Jayanti",
  "2026-10-19": "Maha Navami",
  "2026-10-20": "Dussehra",
  "2026-11-06": "Diwali Holiday",
  "2026-11-07": "Diwali Holiday",
  "2026-11-08": "Diwali Holiday",
  "2026-11-09": "Diwali Holiday",
  "2026-11-10": "Diwali Holiday",
  "2026-11-11": "Diwali Holiday",
  "2026-11-24": "Guru Nanak Jayanti",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year",
  "2027-01-26": "Republic Day",
};

export const SUBJECTS = ERP_SUBJECTS;

const subjectsByCode = Object.fromEntries(SUBJECTS.map((s) => [s.code, s]));

export function getSubject(code) {
  return subjectsByCode[code] || { code, name: code, type: "Lecture" };
}
