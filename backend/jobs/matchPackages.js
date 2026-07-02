/**
 * Match packages job — runs after vendor sync.
 * Groups vendor packages into canonical packages and finds cheapest.
 */

/**
 * Runs the full match + reprice pipeline.
 * 1. Auto-match unmapped VendorPackages to CanonicalPackages.
 * 2. Recompute cheapest vendor per CanonicalPackage.
 * 3. Re-run margin engine on all affected packages.
 * 4. Log price changes to PriceHistory with reason="sync".
 * @returns {Promise<void>}
 */
async function runMatchAndReprice() {
  // TODO: fetch all unmapped VendorPackages
  // TODO: call matchEngine.matchPackages()
  // TODO: call matchEngine.recomputeCheapest()
  // TODO: call marginEngine.applyMargin() for each CanonicalPackage
  // TODO: log price changes to PriceHistory with reason="sync"
}

module.exports = { runMatchAndReprice };
