/**
 * Sheet parser — parses CSV/XLSX files to VendorPackage schema.
 * Uses vendor.columnMappingJson to map columns to fields.
 * Returns { parsed, added, updated, unmapped, errors }.
 */

/**
 * Parses a CSV or XLSX file and returns normalized VendorPackage rows.
 * @param {string} filePath - absolute path to uploaded file
 * @param {Object} columnMapping - vendor.columnMappingJson parsed object
 * @returns {{ rows: Object[], errors: string[] }}
 */
async function parseSheet(filePath, columnMapping) {
  // TODO: require('xlsx') and read workbook from filePath
  // TODO: iterate rows, apply columnMapping to extract fields
  // TODO: pass each row through normalizer.normalize()
  // TODO: collect parse errors without throwing
  return { rows: [], errors: [] };
}

module.exports = { parseSheet };
