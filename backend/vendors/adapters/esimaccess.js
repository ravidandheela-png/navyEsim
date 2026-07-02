/**
 * eSIM Access adapter stub (M8.3).
 *
 * TODO[INTEGRATION]: Implement using eSIM Access API.
 * Docs: https://www.esimaccess.com/
 *
 * Auth: API key passed as a request header (typically "RT-AccessCode").
 *
 * vendor row fields used:
 *   vendor.apiBaseUrl        — e.g. "https://api.esimaccess.com/api/v1"
 *   vendor.apiKey            — access code / API key
 *   vendor.apiAuthHeaderName — header name (default: "RT-AccessCode")
 *   vendor.columnMappingJson — field mapping for normalizeVendorPackage
 */

/**
 * Fetches all packages from the eSIM Access API.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ normalized: Object[], errors: string[] }>}
 * @throws {Error} always — not yet implemented
 */
async function fetchPackages(vendor) {
  // TODO[INTEGRATION]: GET vendor.apiBaseUrl + '/package/list'
  //   Headers: { [vendor.apiAuthHeaderName || 'RT-AccessCode']: vendor.apiKey }
  // TODO[INTEGRATION]: call normalizeVendorPackage() on each item using vendor.columnMappingJson
  throw new Error(
    'TODO[INTEGRATION]: eSIM Access fetchPackages is not yet implemented. ' +
    'Implement authenticated GET to package list endpoint using vendor.apiBaseUrl and vendor.apiKey.'
  );
}

/**
 * Tests connectivity to the eSIM Access API.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function testConnection(vendor) {
  // TODO[INTEGRATION]: Make a lightweight authenticated request (e.g. GET /balance or /ping)
  return {
    ok:      false,
    message: 'TODO[INTEGRATION]: eSIM Access testConnection is not yet implemented.',
  };
}

/**
 * Fetches a single package by ID from eSIM Access.
 * @param {Object} vendor - vendor row from DB
 * @param {string} vendorPackageId
 * @returns {Promise<Object|null>}
 */
async function fetchPackageDetail(vendor, vendorPackageId) {
  // TODO[INTEGRATION]: GET vendor.apiBaseUrl + '/package/' + vendorPackageId
  return null;
}

module.exports = { fetchPackages, testConnection, fetchPackageDetail };
