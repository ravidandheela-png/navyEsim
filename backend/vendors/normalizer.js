/**
 * Normalizer — maps any vendor response to the VendorPackage schema.
 * All adapters must pass their raw data through this before returning.
 */

/**
 * Normalizes a raw vendor package object to the VendorPackage schema.
 * @param {Object} raw - raw package data from vendor API or sheet
 * @param {string} vendorId - DB vendor ID
 * @param {Object} fieldMap - column mapping config (from vendor.columnMappingJson)
 * @returns {Object} normalized VendorPackage-shaped object
 */
function normalize(raw, vendorId, fieldMap = {}) {
  // TODO: map raw fields using fieldMap to VendorPackage schema:
  // { vendorId, vendorPackageId, vendorCountryCode, name, dataGB,
  //   durationDays, originalPrice, originalCurrency, rawPayload }
  return {};
}

module.exports = { normalize };
