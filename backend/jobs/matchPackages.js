/**
 * Match packages job (M11) — thin wrapper around pricing/matchEngine.matchPackages.
 *
 * Responsibilities:
 *   1. Load unmapped VendorPackages from DB (handled inside matchEngine).
 *   2. Group into CanonicalPackages and create CanonicalPackageVendorLinks.
 *   3. Recompute cheapest vendor (called internally by matchPackages).
 *
 * This file is intentionally thin — all logic lives in matchEngine.js.
 * Call this job after vendor sync completes.
 */

const { matchPackages } = require('../pricing/matchEngine');

/**
 * Runs the full match pipeline:
 *   - Groups unmapped VendorPackages into CanonicalPackages
 *   - Creates/updates CanonicalPackageVendorLinks
 *   - Marks VendorPackage.isMapped = true
 *   - Recomputes winningVendorPriceINR (via recomputeCheapest inside matchPackages)
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Object[]} [vendorPackages] - optional pre-fetched VendorPackage rows;
 *   if omitted, matchPackages loads all unmapped active packages from DB.
 * @returns {Promise<{
 *   canonicalCreated: number,
 *   linksCreated:     number,
 *   updated:          number,
 *   errors:           string[]
 * }>}
 */
async function runMatchPackages(prisma, vendorPackages) {
  return matchPackages(prisma, vendorPackages);
}

module.exports = { runMatchPackages };
