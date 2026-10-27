// Minimal, dependency-free .xlsx reader. An .xlsx file is a ZIP of XML files;
// this reads just enough of it (sheet names, shared strings, cell values) to
// import tabular data. It works in browsers and Node 18+ (DecompressionStream).

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ENTRY_BYTES = 40 * 1024 * 1024;
const decoder = new TextDecoder("utf-8");

export class XlsxError extends Error {}

// ------------------------------------------------------------------- zip

function findEndOfCentralDirectory(view) {
  const min = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let i = view.byteLength - 22; i >= min; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  throw new XlsxError("This is not a valid .xlsx file (it is not a ZIP archive).");
}

function readZipDirectory(buffer) {
  const view = new DataView(buffer);
  const eocd = findEndOfCentralDirectory(view);
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map();

  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new XlsxError("The .xlsx file is damaged (bad ZIP directory).");
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
    entries.set(name, { method, compressedSize, size, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(buffer, entry) {
  if (entry.size > MAX_ENTRY_BYTES) throw new XlsxError("The spreadsheet is too large to import.");
  const view = new DataView(buffer);
  const start = entry.localOffset;
  if (view.getUint32(start, true) !== 0x04034b50) {
    throw new XlsxError("The .xlsx file is damaged (bad ZIP entry).");
  }
  const dataStart = start + 30 + view.getUint16(start + 26, true) + view.getUint16(start + 28, true);
  const raw = new Uint8Array(buffer, dataStart, entry.compressedSize);

  if (entry.method === 0) return decoder.decode(raw);
  if (entry.method === 8) return decoder.decode(await inflateRaw(raw));
  throw new XlsxError("Unsupported compression in the .xlsx file.");
}

// ------------------------------------------------------------------- xml

const ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&apos;": "'" };
const unescapeXml = (text) =>
  text
    .replace(/&(lt|gt|amp|quot|apos);/g, (m) => ENTITIES[m])
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

const attr = (tag, name) => {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return match ? unescapeXml(match[1]) : null;
};

/** Concatenate every <t> text run inside an XML fragment. */
const textOf = (xml) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join("");

function parseSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
}

function columnIndex(ref) {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

/** Rows as arrays; numbers stay numbers, everything else is a string. */
function parseSheet(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNumber = Number(attr(rowMatch[1], "r"));
    const cells = [];
    for (const cell of (rowMatch[2] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = cell[1];
      const body = cell[2] || "";
      const ref = attr(tag, "r");
      const type = attr(tag, "t");
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let result = null;

      if (type === "s" && value !== undefined) result = sharedStrings[Number(value)] ?? "";
      else if (type === "inlineStr") result = textOf(body);
      else if (type === "str" || type === "e") result = value === undefined ? "" : unescapeXml(value);
      else if (type === "b") result = value === "1";
      else if (value !== undefined && value !== "") result = Number(value);

      if (ref && result !== null) cells[columnIndex(ref)] = result;
    }
    if (cells.length && rowNumber) rows[rowNumber - 1] = cells;
  }
  return rows;
}

// ------------------------------------------------------------------ main

/**
 * Read a workbook. Returns [{ name, rows }] where rows[r][c] is the cell value.
 * Formula cells yield their cached result (or null if Excel never saved one).
 */
export async function readWorkbook(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    throw new XlsxError("The file is empty.");
  }
  if (buffer.byteLength > MAX_FILE_BYTES) throw new XlsxError("The file is larger than 10 MB.");

  const entries = readZipDirectory(buffer);
  const read = async (name) => (entries.has(name) ? readEntry(buffer, entries.get(name)) : null);

  const workbookXml = await read("xl/workbook.xml");
  if (!workbookXml) throw new XlsxError("This ZIP file is not an Excel workbook.");

  const relsXml = (await read("xl/_rels/workbook.xml.rels")) || "";
  const targets = new Map(
    [...relsXml.matchAll(/<Relationship\b([^>]*?)\/?>/g)].map((m) => [attr(m[1], "Id"), attr(m[1], "Target")]),
  );
  const sharedStrings = parseSharedStrings(await read("xl/sharedStrings.xml"));

  const sheets = [];
  for (const m of workbookXml.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const name = attr(m[1], "name");
    const target = targets.get(attr(m[1], "r:id"));
    if (!name || !target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    const xml = await read(path);
    if (xml) sheets.push({ name, rows: parseSheet(xml, sharedStrings) });
  }
  if (sheets.length === 0) throw new XlsxError("No worksheets were found in this file.");
  return sheets;
}

/** Excel serial date (1900 system) → "YYYY-MM-DD", or null. */
export function excelSerialToISO(serial) {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  const ms = Math.round((serial - 25569) * 86400000);
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
