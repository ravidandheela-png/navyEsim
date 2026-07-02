/**
 * Match engine skeleton (M9.1).
 *
 * Purpose: groups VendorPackages into CanonicalPackages by matching on
 * (countryCode + dataGB + durationDays), creates CanonicalPackageVendorLinks,
 * and recomputes the cheapest vendor per canonical package.
 *
 * M9.1 scope: input validation + summary shape only. No DB writes yet.
 * DB writes will be added in M9.2.
 *
 * RULE: Never mix pricing logic inside route handlers.
 */

/**
 * Groups unmapped VendorPackages into CanonicalPackages.
 *
 * Matching key: countryCode + dataGB + durationDays
 * - Unlimited packages match on countryCode + isUnlimited + durationDays
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Object[]} [vendorPackages] - optional pre-fetched VendorPackage rows.
 *   If omitted, the engine will query all unmapped packages from DB (M9.2).
 * @returns {Promise<{
 *   canonicalCreated: number,
 *   linksCreated: number,
 *   updated: number,
 *   errors: string[]
 * }>}
 */
async function matchPackages(prisma, vendorPackages) {
  const summary = {
    canonicalCreated: 0,
    linksCreated:     0,
    updated:          0,
    errors:           [],
  };

  // ── Input validation ───────────────────────────────────────────────────────
  if (!prisma || typeof prisma.$connect !== 'function') {
    throw new Error('matchPackages: first argument must be a PrismaClient instance');
  }

  if (vendorPackages !== undefined && !Array.isArray(vendorPackages)) {
    throw new Error('matchPackages: vendorPackages must be an array or undefined');
  }

  // If an explicit array was passed, validate each item has the minimum fields
  if (Array.isArray(vendorPackages)) {
    for (let i = 0; i < vendorPackages.length; i++) {
      const pkg = vendorPackages[i];
      if (!pkg || typeof pkg !== 'object') {
        summary.errors.push(`Item ${i}: not an object, skipped`);
        continue;
      }
      if (!pkg.countryCode && !pkg.vendorCountryCode) {
        summary.errors.push(`Item ${i} (id=${pkg.id}): missing countryCode, skipped`);
      }
    }
  }

  // ── TODO: DB work (M9.2) ───────────────────────────────────────────────────
  // TODO: if vendorPackages is undefined, query prisma.vendorPackage.findMany({ where: { isMapped: false } })
  // TODO: group packages by matchKey = `${countryCode}|${dataGB ?? 'unlimited'}|${durationDays}`
  // TODO: for each group:
  //   - prisma.canonicalPackage.upsert({ where: { matchKey }, ... }) → increment canonicalCreated
  //   - prisma.canonicalPackageVendorLink.upsert({ ... })            → increment linksCreated
  //   - prisma.vendorPackage.update({ where: { id }, data: { isMapped: true } }) → increment updated
  // TODO: call recomputeCheapest(prisma) after all links are created

  return summary;
}

/**
 * Recomputes the cheapest vendor for all active CanonicalPackages.
 * Sets isCheapest=true on the winning link, false on all others.
 * Updates canonicalPackage.winningVendorPriceINR.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<{ updated: number, errors: string[] }>}
 */
async function recomputeCheapest(prisma) {
  if (!prisma || typeof prisma.$connect !== 'function') {
    throw new Error('recomputeCheapest: first argument must be a PrismaClient instance');
  }

  // TODO: query all active CanonicalPackages with their vendor links
  // TODO: for each canonical package:
  //   - filter links where vendor.isActive AND vendorPackage.isActive AND link.isDisabledByAdmin=false
  //   - find MIN(vendorPriceINR) among filtered links
  //   - set isCheapest=true on winner, false on rest
  //   - update canonicalPackage.winningVendorPriceINR = winner.vendorPriceINR

  return { updated: 0, errors: [] };
}

module.exports = { matchPackages, recomputeCheapest };
