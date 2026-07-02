/**
 * Sheet parser — parses CSV/XLSX/XLS files and returns mapped package rows.
 * Uses columnMapping to translate sheet column headers to internal field names.
 *
 * No Prisma. No DB access. No calls to normalizer.js (that is M7.3).
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Supported file extensions
const SUPPORTED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

// Internal field names we extract from each row
const INTERNAL_FIELDS = ['packageId', 'country', 'data', 'duration', 'price', 'currency', 'name'];

/**
 * Checks whether a row object is completely empty
 * (all values are undefined, null, or empty string after trimming).
 * @param {Object} row
 * @returns {boolean}
 */
function isEmptyRow(row) {
  return Object.values(row).every(v => v === undefined || v === null || String(v).trim() === '');
}

/**
 * Parses a CSV or XLSX/XLS file and returns mapped package rows.
 * Does NOT call normalizeVendorPackage — that is a separate step.
 *
 * @param {string} filePath - absolute path to the uploaded file
 * @param {Object} [columnMapping={}] - maps internal field names → sheet column headers
 *   Example:
 *   {
 *     packageId: "Package ID",
 *     country:   "Country",
 *     data:      "Data",
 *     duration:  "Days",
 *     price:     "Price",
 *     currency:  "Currency",
 *     name:      "Name"
 *   }
 * @returns {Promise<{ totalRows: number, parsedRows: number, rows: Object[] }>}
 * @throws {Error} if file does not exist, extension is unsupported, workbook has no sheets, or no data rows found
 */
async function parseVendorSheet(filePath, columnMapping = {}) {
  // ── 1. Validate file exists ────────────────────────────────────────────────
  if (!fs.existsSync(filePath)) {
    throw new Error(`parseVendorSheet: file not found: ${filePath}`);
  }

  // ── 2. Validate extension ──────────────────────────────────────────────────
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(
      `parseVendorSheet: unsupported file extension "${ext}". ` +
      `Supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}`
    );
  }

  // ── 3. Read workbook ───────────────────────────────────────────────────────
  let workbook;
  try {
    workbook = XLSX.readFile(filePath, {
      cellDates: true,   // parse date cells as JS Date objects
      raw:       false,  // format numbers as strings (consistent with CSV behaviour)
    });
  } catch (err) {
    throw new Error(`parseVendorSheet: failed to read file "${filePath}": ${err.message}`);
  }

  // ── 4. Get first worksheet ─────────────────────────────────────────────────
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error(`parseVendorSheet: workbook has no sheets in "${filePath}"`);
  }
  const worksheet = workbook.Sheets[sheetNames[0]];

  // ── 5. Convert worksheet to JSON (header row → keys) ──────────────────────
  // defval: '' ensures missing cells become empty string rather than undefined
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error(`parseVendorSheet: no data rows found in "${filePath}"`);
  }

  // ── 6. Build reverse mapping: sheetHeader → internalField ─────────────────
  // columnMapping = { packageId: "Package ID", country: "Country", ... }
  // reverseMap    = { "Package ID": "packageId", "Country": "country", ... }
  const reverseMap = {};
  for (const [internalField, sheetHeader] of Object.entries(columnMapping)) {
    if (sheetHeader && typeof sheetHeader === 'string') {
      reverseMap[sheetHeader.trim()] = internalField;
    }
  }

  // ── 7. Map each raw row to internal fields ─────────────────────────────────
  const totalRows = rawRows.length;
  const rows = [];

  for (const rawRow of rawRows) {
    // Skip completely empty rows
    if (isEmptyRow(rawRow)) continue;

    const mapped = {};

    // If a columnMapping was provided, use it to extract known fields
    if (Object.keys(reverseMap).length > 0) {
      for (const [sheetHeader, internalField] of Object.entries(reverseMap)) {
        const cellValue = rawRow[sheetHeader];
        mapped[internalField] = (cellValue !== undefined && cellValue !== null)
          ? String(cellValue).trim()
          : undefined;
      }
    } else {
      // No mapping provided — pass through all columns as-is using lowercase keys
      for (const [key, value] of Object.entries(rawRow)) {
        mapped[key.trim()] = value !== undefined && value !== null ? String(value).trim() : undefined;
      }
    }

    // Always include all internal fields (undefined if not mapped)
    const row = {};
    for (const field of INTERNAL_FIELDS) {
      row[field] = mapped[field] !== undefined ? mapped[field] : undefined;
    }

    // If columnMapping was not provided, also carry through any extra keys
    if (Object.keys(reverseMap).length === 0) {
      Object.assign(row, mapped);
    }

    rows.push(row);
  }

  const parsedRows = rows.length;

  return { totalRows, parsedRows, rows };
}

// ── Legacy stub (kept for backward compatibility) ─────────────────────────────

/**
 * @deprecated Use parseVendorSheet() instead.
 */
async function parseSheet(filePath, columnMapping) {
  // TODO: require('xlsx') and read workbook from filePath
  // TODO: iterate rows, apply columnMapping to extract fields
  // TODO: pass each row through normalizer.normalize()
  // TODO: collect parse errors without throwing
  return { rows: [], errors: [] };
}

module.exports = { parseVendorSheet, parseSheet };
