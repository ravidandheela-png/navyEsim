/**
 * Airalo adapter — Airalo-specific API integration.
 * TODO[INTEGRATION]: Implement using Airalo Partner API.
 * Docs: https://partners.airalo.com/
 */

/**
 * Fetches all packages from Airalo API.
 * @param {Object} vendor - vendor row from DB (contains apiKey, apiBaseUrl)
 * @returns {Promise<Object[]>} normalized VendorPackage array
 */
async function fetchPackages(vendor) {
  // TODO[INTEGRATION]: POST to Airalo OAuth endpoint to get access token
  // TODO[INTEGRATION]: GET /v2/packages with Bearer token
  // TODO: pass each item through normalizer.normalize()
  return [];
}

/**
 * Tests connectivity to Airalo API.
 * @param {Object} vendor
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function testConnection(vendor) {
  // TODO[INTEGRATION]: attempt OAuth token fetch, return ok/message
  return { ok: false, message: 'TODO[INTEGRATION]: Airalo not implemented' };
}

/**
 * Fetches a single Airalo package by ID.
 * @param {Object} vendor
 * @param {string} vendorPackageId
 * @returns {Promise<Object|null>}
 */
async function fetchPackageDetail(vendor, vendorPackageId) {
  // TODO[INTEGRATION]: GET /v2/packages/:id
  return null;
}

module.exports = { fetchPackages, testConnection, fetchPackageDetail };
