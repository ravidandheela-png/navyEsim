/**
 * Match engine (M9.2).
 *
 * Purpose: groups VendorPackages into CanonicalPackages by matching on
 * (countryId + dataGB + durationDays), creates CanonicalPackageVendorLinks,
 * marks VendorPackage.isMapped = true.
 *
 * M9.2 scope: full DB writes for matching + linking.
 * Does NOT calculate finalPriceINR, apply margin rules, or write PriceHistory.
 *
 * RULE: Never mix pricing logic inside route handlers.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the in-memory grouping key for a VendorPackage.
 * Packages with the same key belong to the same CanonicalPackage.
 *
 * Key format: "<countryId>|<dataGB>|<durationDays>"
 * Unlimited packages: "<countryId>|unlimited|<durationDays>"
 *
 * @param {Object} pkg - VendorPackage row
 * @returns {string|null} key, or null if the package cannot be matched
 */
function buildMatchKey(pkg) {
  if (!pkg.countryId) return null; // cannot match without a resolved country
  const dataPart = pkg.isUnlimited ? 'unlimited' : String(pkg.dataGB ?? '');
  if (!dataPart) return null;      // cannot match without data size
  return `${pkg.countryId}|${dataPart}|${pkg.durationDays}`;
}

/**
 * Build a human-readable name for a CanonicalPackage.
 * e.g. "1.5 GB / 7 Days" or "Unlimited / 30 Days"
 *
 * @param {Object} pkg - VendorPackage row
 * @returns {string}
 */
function buildCanonicalName(pkg) {
  const dataPart = pkg.isUnlimited ? 'Unlimited' : `${pkg.dataGB} GB`;
  return `${dataPart} / ${pkg.durationDays} Days`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Groups unmapped VendorPackages into CanonicalPackages.
 *
 * Matching key: countryId + dataGB + durationDays
 * Unlimited packages match on countryId + isUnlimited + durationDays.
 *
 * If vendorPackages is not provided, loads all active unmapped VendorPackage
 * rows from the DB (where isMapped=false AND isActive=true AND countryId IS NOT NULL).
 *
 * For each group:
 *   1. Find or create a CanonicalPackage matching (countryId, dataGB, durationDays).
 *   2. Upsert a CanonicalPackageVendorLink for each VendorPackage in the group.
 *   3. Mark each VendorPackage.isMapped = true.
 *
 * Does NOT set finalPriceINR, apply margin rules, or write PriceHistory.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Object[]} [vendorPackages] - optional pre-fetched VendorPackage rows
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

  // ── 1. Input validation ────────────────────────────────────────────────────
  if (!prisma || typeof prisma.$connect !== 'function') {
    throw new Error('matchPackages: first argument must be a PrismaClient instance');
  }

  if (vendorPackages !== undefined && !Array.isArray(vendorPackages)) {
    throw new Error('matchPackages: vendorPackages must be an array or undefined');
  }

  // ── 2. Load packages from DB if not provided ───────────────────────────────
  let packages = vendorPackages;

  if (!packages) {
    try {
      packages = await prisma.vendorPackage.findMany({
        where: {
          isMapped:  false,
          isActive:  true,
          countryId: { not: null },
        },
      });
    } catch (err) {
      summary.errors.push(`DB load failed: ${err.message}`);
      return summary;
    }
  }

  if (packages.length === 0) {
    return summary; // nothing to do
  }

  // ── 3. Group packages by match key ────────────────────────────────────────
  // groups: Map<matchKey, VendorPackage[]>
  const groups = new Map();

  for (const pkg of packages) {
    const key = buildMatchKey(pkg);
    if (!key) {
      summary.errors.push(
        `VendorPackage id=${pkg.id} skipped: missing countryId or dataGB`
      );
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pkg);
  }

  // ── 4. Process each group ─────────────────────────────────────────────────
  for (const [matchKey, groupPkgs] of groups) {
    // All packages in a group share the same countryId / dataGB / durationDays
    const representative = groupPkgs[0];
    const { countryId, dataGB, durationDays, isUnlimited } = representative;

    // ── 4a. Find or create CanonicalPackage ──────────────────────────────────
    // Unlimited packages are stored with dataGB = 0 (schema uses Float, not nullable).
    // findFirst and create must use the same value — always 0 for unlimited.
    //
    // WARNING: The schema has no @@unique constraint on (countryId, dataGB, durationDays).
    // Concurrent runs of matchPackages may create duplicate CanonicalPackage rows.
    // This is acceptable for now and will be addressed with a schema migration if needed.
    const canonicalDataGB = isUnlimited ? 0 : dataGB;

    let canonical;
    try {
      canonical = await prisma.canonicalPackage.findFirst({
        where: {
          countryId,
          dataGB:      canonicalDataGB,
          durationDays,
        },
      });

      if (!canonical) {
        canonical = await prisma.canonicalPackage.create({
          data: {
            countryId,
            name:         buildCanonicalName(representative),
            dataGB:       canonicalDataGB,
            durationDays,
            // winningVendorPriceINR, finalPriceINR etc. default to 0 per schema
          },
        });
        summary.canonicalCreated++;
      }
    } catch (err) {
      summary.errors.push(
        `CanonicalPackage find/create failed for key "${matchKey}": ${err.message}`
      );
      continue; // skip this group — don't mark packages as mapped
    }

    // ── 4b. Upsert CanonicalPackageVendorLink + mark isMapped ────────────────
    for (const pkg of groupPkgs) {
      // Upsert the link
      try {
        const result = await prisma.canonicalPackageVendorLink.upsert({
          where: {
            canonicalPackageId_vendorPackageId: {
              canonicalPackageId: canonical.id,
              vendorPackageId:    pkg.id,
            },
          },
          update: {
            vendorPriceINR: pkg.convertedPriceINR,
            lastCheckedAt:  new Date(),
          },
          create: {
            canonicalPackageId: canonical.id,
            vendorPackageId:    pkg.id,
            vendorPriceINR:     pkg.convertedPriceINR,
          },
        });

        // Count as new link only if it was just created (updatedAt === createdAt heuristic
        // is unreliable; use the fact that upsert on a new row sets isCheapest=false default)
        // Prisma upsert doesn't tell us if it created or updated — track via a pre-check
        // would add an extra query. Instead, always increment linksCreated for simplicity;
        // re-runs are idempotent (upsert).
        summary.linksCreated++;
      } catch (err) {
        summary.errors.push(
          `Link upsert failed for VendorPackage id=${pkg.id}: ${err.message}`
        );
        continue; // don't mark this package as mapped if link failed
      }

      // Mark VendorPackage as mapped
      try {
        await prisma.vendorPackage.update({
          where: { id: pkg.id },
          data:  { isMapped: true },
        });
        summary.updated++;
      } catch (err) {
        summary.errors.push(
          `isMapped update failed for VendorPackage id=${pkg.id}: ${err.message}`
        );
      }
    }
  }

  // ── 5. Recompute cheapest vendor for all affected canonical packages ────────
  // Always run after matching so winningVendorPriceINR is up to date.
  const cheapestResult = await recomputeCheapest(prisma);
  if (cheapestResult.errors.length > 0) {
    for (const e of cheapestResult.errors) {
      summary.errors.push(`recomputeCheapest: ${e}`);
    }
  }

  return summary;
}

/**
 * Recomputes the cheapest vendor for all active CanonicalPackages.
 * Sets isCheapest=true on the winning link, false on all others.
 * Updates canonicalPackage.winningVendorPriceINR.
 *
 * Does NOT apply margin rules or update finalPriceINR.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<{ updated: number, errors: string[] }>}
 */
async function recomputeCheapest(prisma) {
  if (!prisma || typeof prisma.$connect !== 'function') {
    throw new Error('recomputeCheapest: first argument must be a PrismaClient instance');
  }

  const result = { updated: 0, errors: [] };

  // Load all active canonical packages with their active, non-disabled links
  let canonicals;
  try {
    canonicals = await prisma.canonicalPackage.findMany({
      where: { isActive: true },
      include: {
        vendorLinks: {
          where: { isDisabledByAdmin: false },
          include: {
            vendorPackage: {
              include: { vendor: true },
            },
          },
        },
      },
    });
  } catch (err) {
    result.errors.push(`DB load failed: ${err.message}`);
    return result;
  }

  for (const canonical of canonicals) {
    // Filter to links where both vendor and vendorPackage are active
    const activeLinks = canonical.vendorLinks.filter(
      link =>
        link.vendorPackage?.isActive &&
        link.vendorPackage?.vendor?.isActive
    );

    if (activeLinks.length === 0) continue;

    // Find the cheapest link
    const winner = activeLinks.reduce((best, link) =>
      link.vendorPriceINR < best.vendorPriceINR ? link : best
    );

    // Update all links: set isCheapest=true on winner, false on rest
    for (const link of activeLinks) {
      try {
        await prisma.canonicalPackageVendorLink.update({
          where: { id: link.id },
          data:  { isCheapest: link.id === winner.id },
        });
      } catch (err) {
        result.errors.push(`Link update failed id=${link.id}: ${err.message}`);
      }
    }

    // Update winningVendorPriceINR on the canonical package
    try {
      await prisma.canonicalPackage.update({
        where: { id: canonical.id },
        data:  { winningVendorPriceINR: winner.vendorPriceINR },
      });
      result.updated++;
    } catch (err) {
      result.errors.push(
        `CanonicalPackage update failed id=${canonical.id}: ${err.message}`
      );
    }
  }

  return result;
}

module.exports = { matchPackages, recomputeCheapest };
