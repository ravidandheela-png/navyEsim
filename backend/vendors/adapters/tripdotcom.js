/**
 * Trip.com adapter stub (M8.3).
 *
 * TODO[INTEGRATION]: Implement using Trip.com eSIM API.
 * Docs: https://hd.trip.com/
 *
 * Auth: API key + HMAC signature (Trip.com uses signed requests).
 *
 * vendor row fields used:
 *   vendor.apiBaseUrl        — e.g. "https://api.trip.com/esim/v1"
 *   vendor.apiKey            — API key / access key
 *   vendor.columnMappingJson — field mapping for normalizeVendorPackage
 */

/**
 * Fetches all packages from the Trip.com eSIM API.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ normalized: Object[], errors: string[] }>}
 * @throws {Error} always — not yet implemented
 */
async function fetchPackages(vendor) {
  // TODO[INTEGRATION]: Build HMAC-signed request headers using vendor.apiKey
  // TODO[INTEGRATION]: GET vendor.apiBaseUrl + '/products' (or equivalent endpoint)
  // TODO[INTEGRATION]: call normalizeVendorPackage() on each item using vendor.columnMappingJson
  throw new Error(
    'TODO[INTEGRATION]: Trip.com fetchPackages is not yet implemented. ' +
    'Implement HMAC-signed request to package list endpoint using vendor.apiBaseUrl and vendor.apiKey.'
  );
}

/**
 * Tests connectivity to the Trip.com eSIM API.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function testConnection(vendor) {
  // TODO[INTEGRATION]: Make a lightweight signed request (e.g. GET /ping or /balance)
  return {
    ok:      false,
    message: 'TODO[INTEGRATION]: Trip.com testConnection is not yet implemented.',
  };
}

/**
 * Fetches a single package by ID from Trip.com.
 * @param {Object} vendor - vendor row from DB
 * @param {string} vendorPackageId
 * @returns {Promise<Object|null>}
 */
async function fetchPackageDetail(vendor, vendorPackageId) {
  // TODO[INTEGRATION]: GET vendor.apiBaseUrl + '/products/' + vendorPackageId (signed)
  return null;
}

module.exports = { fetchPackages, testConnection, fetchPackageDetail };
