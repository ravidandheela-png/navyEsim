/**
 * Airalo adapter stub (M8.3).
 *
 * TODO[INTEGRATION]: Implement using Airalo Partner API.
 * Docs: https://partners.airalo.com/
 *
 * Auth flow:
 *   POST /v2/token  { client_id, client_secret }  → { access_token }
 *   GET  /v2/packages  Authorization: Bearer <access_token>
 *
 * vendor row fields used:
 *   vendor.apiBaseUrl        — e.g. "https://partners.airalo.com/api/v2"
 *   vendor.apiKey            — client_secret (client_id stored separately or combined)
 *   vendor.columnMappingJson — field mapping for normalizeVendorPackage
 */

/**
 * Fetches all packages from the Airalo Partner API.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ normalized: Object[], errors: string[] }>}
 * @throws {Error} always — not yet implemented
 */
async function fetchPackages(vendor) {
  // TODO[INTEGRATION]: Step 1 — POST to vendor.apiBaseUrl + '/token' with client credentials
  // TODO[INTEGRATION]: Step 2 — GET vendor.apiBaseUrl + '/packages' with Bearer token
  // TODO[INTEGRATION]: Step 3 — call normalizeVendorPackage() on each item using vendor.columnMappingJson
  throw new Error(
    'TODO[INTEGRATION]: Airalo fetchPackages is not yet implemented. ' +
    'Implement OAuth token fetch + package list call using vendor.apiBaseUrl and vendor.apiKey.'
  );
}

/**
 * Tests connectivity to the Airalo Partner API.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function testConnection(vendor) {
  // TODO[INTEGRATION]: Attempt OAuth token fetch; return ok:true if token received
  return {
    ok:      false,
    message: 'TODO[INTEGRATION]: Airalo testConnection is not yet implemented.',
  };
}

/**
 * Fetches a single Airalo package by vendor package ID.
 * @param {Object} vendor - vendor row from DB
 * @param {string} vendorPackageId
 * @returns {Promise<Object|null>}
 */
async function fetchPackageDetail(vendor, vendorPackageId) {
  // TODO[INTEGRATION]: GET vendor.apiBaseUrl + '/packages/' + vendorPackageId with Bearer token
  return null;
}

module.exports = { fetchPackages, testConnection, fetchPackageDetail };
