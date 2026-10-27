import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";

import { ERP_ATTENDANCE_RECORDS } from "../src/data/erpAttendance.js";
import { BUILTIN_ERP, makeErpDataset } from "../src/lib/erpData.js";
import { importErpWorkbook, parseCellDate } from "../src/lib/erpImport.js";
import { excelSerialToISO, readWorkbook, XlsxError } from "../src/lib/xlsx.js";
import { sanitizeState } from "../src/lib/storage.js";

const toArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const fixture = () => toArrayBuffer(fs.readFileSync(new URL("./fixtures/Attendance.xlsx", import.meta.url)));

// ---- tiny zip writer so edge cases can be tested without Excel -------------
function makeZip(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, content, method = 8] of files) {
    const nameBuf = Buffer.from(name);
    const raw = Buffer.from(content);
    const data = method === 8 ? zlib.deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return toArrayBuffer(Buffer.concat([...locals, cdBuf, eocd]));
}

const workbookXml = (names) =>
  `<workbook xmlns:r="x"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
const relsXml = (n) =>
  `<Relationships>${Array.from({ length: n }, (_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`;
const cellS = (ref, idx) => `<c r="${ref}" t="s"><v>${idx}</v></c>`;
const cellN = (ref, v) => `<c r="${ref}"><v>${v}</v></c>`;
const cellI = (ref, t) => `<c r="${ref}" t="inlineStr"><is><t>${t}</t></is></c>`;

function syntheticWorkbook(sheetRows) {
  // shared strings: 0 Date, 1 No. of Lectures, 2 Attendance, 3 P, 4 A
  const sst = `<sst>${["Date", "No. of Lectures", "Attendance", "P", "A"].map((t) => `<si><t>${t}</t></si>`).join("")}</sst>`;
  const sheets = Object.entries(sheetRows);
  return makeZip([
    ["xl/workbook.xml", workbookXml(sheets.map(([n]) => n))],
    ["xl/_rels/workbook.xml.rels", relsXml(sheets.length)],
    ["xl/sharedStrings.xml", sst, 0],
    ...sheets.map(([, rows], i) => [`xl/worksheets/sheet${i + 1}.xml`, `<worksheet><sheetData>${rows}</sheetData></worksheet>`]),
  ]);
}

const header = `<row r="3">${cellS("A3", 0)}${cellS("B3", 1)}${cellS("C3", 2)}</row>`;

// --------------------------------------------------------------------- tests
test("imports the real ERP workbook and matches the built-in data exactly", async () => {
  const result = await importErpWorkbook(fixture(), "Attendance.xlsx");
  assert.equal(result.records.length, 288);
  assert.equal(result.lectureCount, 389);
  assert.equal(result.asOf, "2026-10-27");
  assert.equal(result.subjects.length, 15);
  assert.deepEqual(result.warnings, []);

  const key = (r) => [r.date, r.subjectCode, r.lectures, r.status, r.type].join("|");
  assert.deepEqual(result.records.map(key), ERP_ATTENDANCE_RECORDS.map(key));
  assert.equal(result.records.filter((r) => r.status === "present").reduce((s, r) => s + r.lectures, 0), 280);
});

test("readWorkbook lists every sheet with cell values", async () => {
  const sheets = await readWorkbook(fixture());
  assert.equal(sheets[0].name, "Summary");
  assert.equal(sheets.length, 16);
  const aai = sheets.find((s) => s.name === "AAI 501");
  assert.equal(aai.rows[2][0], "Date");
  assert.equal(typeof aai.rows[3][0], "number"); // date serial
  assert.equal(excelSerialToISO(aai.rows[3][0]), "2026-07-22");
});

test("date parsing", () => {
  assert.equal(excelSerialToISO(46225), "2026-07-22");
  assert.equal(parseCellDate("2026-07-22"), "2026-07-22");
  assert.equal(parseCellDate("22-07-2026"), "2026-07-22");
  assert.equal(parseCellDate("22/7/2026"), "2026-07-22");
  assert.equal(parseCellDate("31-02-2026"), null);
  assert.equal(parseCellDate("hello"), null);
  assert.equal(parseCellDate(5), null);
});

test("handles shared strings, inline strings, text dates, lowercase status and stray notes", async () => {
  const buf = syntheticWorkbook({
    "XYZ 101": `<row r="1">${cellI("A1", "XYZ 101 - Data Lab")}</row>${header}
      <row r="4">${cellN("A4", 46225)}${cellN("B4", 2)}${cellS("C4", 3)}</row>
      <row r="5">${cellI("A5", "23-07-2026")}${cellN("B5", 1)}${cellI("C5", "absent")}</row>
      <row r="6">${cellN("A6", 46227)}${cellN("B6", 0)}${cellS("C6", 3)}</row>
      <row r="7">${cellI("A7", "Add new dates in the next empty row")}</row>`,
  });
  const result = await importErpWorkbook(buf);
  assert.deepEqual(result.records.map((r) => [r.date, r.lectures, r.status]), [
    ["2026-07-22", 2, "present"],
    ["2026-07-23", 1, "absent"],
  ]);
  assert.equal(result.subjects[0].name, "DATA LAB");
  assert.equal(result.subjects[0].type, "Lab");
  assert.equal(result.warnings.length, 1); // the 0-lecture row
});

test("rejects files that are not ERP workbooks", async () => {
  await assert.rejects(() => importErpWorkbook(toArrayBuffer(Buffer.from("not a zip at all, just text"))), XlsxError);
  await assert.rejects(() => importErpWorkbook(new ArrayBuffer(0)), /empty/);
  const noSheets = syntheticWorkbook({ Summary: `<row r="1">${cellI("A1", "Total")}</row>` });
  await assert.rejects(() => importErpWorkbook(noSheets), /No attendance sheets/);
  const noRows = syntheticWorkbook({ ABC: header });
  await assert.rejects(() => importErpWorkbook(noRows), /no attendance rows/);
  const zipOnly = makeZip([["hello.txt", "hi"]]);
  await assert.rejects(() => importErpWorkbook(zipOnly), /not an Excel workbook/);
});

test("makeErpDataset keeps timetable subjects that have no sheet", async () => {
  const buf = syntheticWorkbook({
    "BCS501": `${header}<row r="4">${cellN("A4", 46225)}${cellN("B4", 1)}${cellS("C4", 3)}</row>`,
  });
  const result = await importErpWorkbook(buf);
  const dataset = makeErpDataset({ ...result, imported: true });
  assert.equal(dataset.subjects.length, 15); // 1 imported + 14 known without a sheet
  assert.equal(dataset.lastDate, "2026-07-22");
  assert.ok(dataset.dates.has("2026-07-22"));
  assert.equal(BUILTIN_ERP.imported, false);
});

test("stored ERP imports are re-validated", () => {
  const good = {
    fileName: "a.xlsx", importedAt: "2026-10-28T00:00:00Z", asOf: "2026-10-27",
    subjects: [{ code: "AAA", name: "Alpha", type: "Lab" }],
    records: [
      { date: "2026-10-01", subjectCode: "AAA", lectures: 2, status: "present" },
      { date: "2026-10-02", subjectCode: "NOPE", lectures: 1, status: "present" },
      { date: "bad", subjectCode: "AAA", lectures: 1, status: "present" },
      { date: "2026-10-03", subjectCode: "AAA", lectures: 99, status: "present" },
      { date: "2026-10-04", subjectCode: "AAA", lectures: 1, status: "late" },
    ],
  };
  const { erpImport } = sanitizeState({ erpImport: good });
  assert.equal(erpImport.records.length, 1);
  assert.equal(erpImport.records[0].type, "Lab");
  assert.equal(erpImport.asOf, "2026-10-27");
  assert.equal(sanitizeState({ erpImport: { subjects: [], records: [] } }).erpImport, null);
  assert.equal(sanitizeState({ erpImport: "junk" }).erpImport, null);
});
