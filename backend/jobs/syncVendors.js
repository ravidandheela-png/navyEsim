/**
 * Vendor sync pipeline (M11).
 *
 * Flow:
 *   1. Load all active vendors from DB.
 *   2. For each vendor:
 *      a. Call getAdapter(vendor).fetchPackages(vendor)
 *      b. Upsert VendorPackage rows
 *      c. Write SyncLog row (success or error)
 *      d. One vendor failure MUST NOT stop other vendors.
 *   3. After all vendors: call matchPackages(prisma)
 *   4. After matching: call repriceCanonicalPackages(prisma, { reason: "sync", triggeredBy: "syncVendors" })
 *   5. Return aggregate summary.
 *
 * RULE: All vendor sync errors must be caught — never let one vendor
 * failure crash the sync job for other vendors.
 *
 * No real API integrations. Adapter stubs will throw TODO[INTEGRATION] errors;
 * those are caught and logged per-vendor.
 */

const { getAdapter }                = require('../vendors');
const { matchPackages }             = require('../pricing/matchEngine');
const { repriceCanonicalPackages }  = require('../pricing/marginEngine');

/**
 * Syncs packages from all active vendors, then runs match + reprice pipeline.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<{
 *   vendorsProcessed: number,
 *   packagesAdded:    number,
 *   packagesUpdated:  number,
 *   packagesStale:    number,
 *   packagesUnmapped: number,
 *   errors:           string[]
 * }>}
 */
async function syncVendors(prisma) {
  if (!prisma || typeof prisma.$connect !== 'function') {
    throw new Error('syncVendors: first argument must be a PrismaClient instance');
  }

  const summary = {
    vendorsProcessed: 0,
    packagesAdded:    0,
    packagesUpdated:  0,
    packagesStale:    0,
    packagesUnmapped: 0,
    errors:           [],
  };

  // ── 1. Load active vendors ─────────────────────────────────────────────────
  let vendors;
  try {
    vendors = await prisma.vendor.findMany({
      where: { isActive: true },
    });
  } catch (err) {
    summary.errors.push(`DB load (vendor) failed: ${err.message}`);
    return summary;
  }

  if (vendors.length === 0) return summary;

  // ── 2. Sync each vendor ────────────────────────────────────────────────────
  for (const vendor of vendors) {
    summary.vendorsProcessed++;

    const syncStartedAt = new Date();
    let vendorPackagesAdded   = 0;
    let vendorPackagesUpdated = 0;
    let vendorPackagesStale   = 0;
    let vendorError           = null;

    // Mark vendor as syncing
    try {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data:  { syncStatus: 'syncing' },
      });
    } catch (_) { /* non-fatal */ }

    try {
      // ── 2a. Fetch packages via adapter ──────────────────────────────────────
      const adapter  = getAdapter(vendor);
      const rawItems = await adapter.fetchPackages(vendor);

      // rawItems may be an array of normalized VendorPackage-shaped objects
      // or { normalized: [], errors: [] } depending on adapter implementation.
      // Normalise to a flat array.
      const items = Array.isArray(rawItems)
        ? rawItems
        : (rawItems?.normalized ?? []);

      // ── 2b. Upsert VendorPackage rows ───────────────────────────────────────
      for (const item of items) {
        if (!item.vendorPackageId) {
          summary.errors.push(
            `Vendor "${vendor.slug}": item missing vendorPackageId, skipped`
          );
          continue;
        }

        try {
          const existing = await prisma.vendorPackage.findUnique({
            where: {
              vendorId_vendorPackageId: {
                vendorId:       vendor.id,
                vendorPackageId: item.vendorPackageId,
              },
            },
          });

          if (!existing) {
            // New package
            await prisma.vendorPackage.create({
              data: {
                vendorId:         vendor.id,
                vendorPackageId:  item.vendorPackageId,
                vendorCountryCode: item.vendorCountryCode ?? '',
                countryId:        item.countryId         ?? null,
                name:             item.name              ?? item.vendorPackageId,
                dataGB:           item.dataGB            ?? 0,
                durationDays:     item.durationDays      ?? 0,
                originalPrice:    item.originalPrice     ?? 0,
                originalCurrency: item.originalCurrency  ?? 'USD',
                convertedPriceINR: item.convertedPriceINR ?? 0,
                rawPayload:       JSON.stringify(item.rawPayload ?? item),
                isActive:         true,
                isMapped:         false,
                lastSeenAt:       new Date(),
              },
            });
            vendorPackagesAdded++;
          } else {
            // Existing package — update price + lastSeenAt
            const priceChanged = existing.convertedPriceINR !== (item.convertedPriceINR ?? 0);
            await prisma.vendorPackage.update({
              where: { id: existing.id },
              data: {
                convertedPriceINR: item.convertedPriceINR ?? existing.convertedPriceINR,
                originalPrice:     item.originalPrice     ?? existing.originalPrice,
                originalCurrency:  item.originalCurrency  ?? existing.originalCurrency,
                countryId:         item.countryId         ?? existing.countryId,
                name:              item.name              ?? existing.name,
                rawPayload:        JSON.stringify(item.rawPayload ?? item),
                isActive:          true,
                lastSeenAt:        new Date(),
                // Reset isMapped if price changed so match engine re-evaluates
                isMapped: priceChanged ? false : existing.isMapped,
              },
            });
            if (priceChanged) {
              vendorPackagesUpdated++;
            } else {
              vendorPackagesStale++;
            }
          }
        } catch (itemErr) {
          summary.errors.push(
            `Vendor "${vendor.slug}" package "${item.vendorPackageId}": upsert failed — ${itemErr.message}`
          );
        }
      }

      // ── 2c. Write SyncLog (success) ─────────────────────────────────────────
      try {
        await prisma.syncLog.create({
          data: {
            vendorId:        vendor.id,
            startedAt:       syncStartedAt,
            finishedAt:      new Date(),
            packagesAdded:   vendorPackagesAdded,
            packagesUpdated: vendorPackagesUpdated,
            packagesStale:   vendorPackagesStale,
            packagesUnmapped: 0, // updated after matchPackages
            errorCount:      0,
            status:          'success',
          },
        });
      } catch (_) { /* SyncLog failure is non-fatal */ }

      // Update vendor sync status
      try {
        await prisma.vendor.update({
          where: { id: vendor.id },
          data: {
            syncStatus:      'success',
            lastSyncedAt:    new Date(),
            syncErrorMessage: null,
          },
        });
      } catch (_) { /* non-fatal */ }

    } catch (vendorErr) {
      // ── 2d. Per-vendor error — log and continue ──────────────────────────────
      vendorError = vendorErr.message;
      summary.errors.push(`Vendor "${vendor.slug}" sync failed: ${vendorErr.message}`);

      try {
        await prisma.syncLog.create({
          data: {
            vendorId:        vendor.id,
            startedAt:       syncStartedAt,
            finishedAt:      new Date(),
            packagesAdded:   vendorPackagesAdded,
            packagesUpdated: vendorPackagesUpdated,
            packagesStale:   vendorPackagesStale,
            packagesUnmapped: 0,
            errorCount:      1,
            errorDetails:    vendorError,
            status:          'failed',
          },
        });
      } catch (_) { /* SyncLog failure is non-fatal */ }

      try {
        await prisma.vendor.update({
          where: { id: vendor.id },
          data: {
            syncStatus:       'error',
            syncErrorMessage: vendorError,
          },
        });
      } catch (_) { /* non-fatal */ }
    }

    summary.packagesAdded   += vendorPackagesAdded;
    summary.packagesUpdated += vendorPackagesUpdated;
    summary.packagesStale   += vendorPackagesStale;
  }

  // ── 3. Run match pipeline ──────────────────────────────────────────────────
  try {
    const matchSummary = await matchPackages(prisma);
    summary.packagesUnmapped = matchSummary.errors.length;
    if (matchSummary.errors.length > 0) {
      for (const e of matchSummary.errors) {
        summary.errors.push(`matchPackages: ${e}`);
      }
    }
  } catch (err) {
    summary.errors.push(`matchPackages failed: ${err.message}`);
  }

  // ── 4. Run reprice pipeline ────────────────────────────────────────────────
  try {
    const repriceSummary = await repriceCanonicalPackages(prisma, {
      reason:      'sync',
      triggeredBy: 'syncVendors',
    });
    if (repriceSummary.errors.length > 0) {
      for (const e of repriceSummary.errors) {
        summary.errors.push(`repriceCanonicalPackages: ${e}`);
      }
    }
  } catch (err) {
    summary.errors.push(`repriceCanonicalPackages failed: ${err.message}`);
  }

  return summary;
}

module.exports = { syncVendors };
