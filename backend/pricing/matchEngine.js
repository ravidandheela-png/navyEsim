/**
 * Match engine — groups vendor packages into canonical packages
 * and finds the cheapest vendor per canonical package.
 * RULE: Never mix pricing logic inside route handlers.
 */

/**
 * Groups unmapped VendorPackages into CanonicalPackages by matching
 * on country + dataGB + durationDays.
 * @param {Object[]} vendorPackages - unmapped VendorPackage rows
 * @returns {Promise<{ matched: number, created: number, errors: string[] }>}
 */
async function matchPackages(vendorPackages) {
  // TODO: group vendorPackages by (countryId, dataGB, durationDays)
  // TODO: for each group, find or create CanonicalPackage
  // TODO: upsert CanonicalPackageVendorLink rows
  // TODO: mark vendorPackage.isMapped = true
  return { matched: 0, created: 0, errors: [] };
}

/**
 * Recomputes the cheapest vendor for all active CanonicalPackages.
 * Sets isCheapest=true on winner, false on rest.
 * Updates winningVendorPriceINR on CanonicalPackage.
 * @returns {Promise<void>}
 */
async function recomputeCheapest() {
  // TODO: for each CanonicalPackage, query active vendor links
  // TODO: find MIN(vendorPriceINR) where vendor.isActive AND vendorPackage.isActive
  //       AND link.isDisabledByAdmin=false
  // TODO: set isCheapest=true on winner, false on rest
  // TODO: update canonicalPackage.winningVendorPriceINR
}

module.exports = { matchPackages, recomputeCheapest };
