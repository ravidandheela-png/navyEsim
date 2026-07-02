/**
 * Trip.com adapter — Trip.com-specific API integration.
 * TODO[INTEGRATION]: Implement using Trip.com eSIM API.
 * Docs: https://hd.trip.com/
 */

/**
 * Fetches all packages from Trip.com API.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<Object[]>} normalized VendorPackage array
 */
async function fetchPackages(vendor) {
  // TODO[INTEGRATION]: authenticate with vendor.apiKey
  // TODO[INTEGRATION]: GET packages endpoint from vendor.apiBaseUrl
  // TODO: pass each item through normalizer.normalize()
  return [];
}

/**
 * Tests connectivity to Trip.com API.
 * @param {Object} vendor
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function testConnection(vendor) {
  // TODO[INTEGRATION]: make a lightweight authenticated request
  return { ok: false, message: 'TODO[INTEGRATION]: Trip.com not implemented' };
}

/**
 * Fetches a single package by ID from Trip.com.
 * @param {Object} vendor
 * @param {string} vendorPackageId
 * @returns {Promise<Object|null>}
 */
async function fetchPackageDetail(vendor, vendorPackageId) {
  // TODO[INTEGRATION]: GET single package endpoint
  return null;
}

module.exports = { fetchPackages, testConnection, fetchPackageDetail };
