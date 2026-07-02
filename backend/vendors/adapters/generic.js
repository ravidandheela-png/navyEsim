/**
 * Generic adapter — configurable for any standard REST API vendor.
 * All config (baseUrl, auth, field mappings) is read from DB.
 * No code changes needed for simple vendors — just admin config.
 */

/**
 * Fetches packages from a generic REST API vendor.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<Object[]>} normalized VendorPackage array
 */
async function fetchPackages(vendor) {
  // TODO[INTEGRATION]: build request using vendor.apiBaseUrl, vendor.apiKey,
  // vendor.apiAuthType, vendor.apiAuthHeaderName
  // TODO: call normalizer.normalize() on each item using vendor.columnMappingJson
  return [];
}

/**
 * Tests connectivity to the vendor API.
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
async function testConnection(vendor) {
  // TODO[INTEGRATION]: make a lightweight request to vendor.apiBaseUrl
  return { ok: false, message: 'TODO[INTEGRATION]: not implemented' };
}

/**
 * Fetches a single package by vendor's own ID.
 * @param {Object} vendor - vendor row from DB
 * @param {string} vendorPackageId
 * @returns {Promise<Object|null>}
 */
async function fetchPackageDetail(vendor, vendorPackageId) {
  // TODO[INTEGRATION]: optional — implement if vendor supports single-package fetch
  return null;
}

module.exports = { fetchPackages, testConnection, fetchPackageDetail };
