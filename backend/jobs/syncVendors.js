/**
 * Sync vendors job — pulls packages from all active vendors.
 * RULE: All vendor sync errors must be caught — never let one vendor
 * failure crash the sync job for other vendors.
 */

/**
 * Syncs packages from all active vendors with syncFrequencyHours > 0.
 * Logs results to SyncLog table.
 * @returns {Promise<void>}
 */
async function syncAllVendors() {
  // TODO: prisma.vendor.findMany({ where: { isActive: true, syncFrequencyHours: { gt: 0 } } })
  // TODO: for each vendor, call getAdapter(vendor.slug).fetchPackages(vendor)
  // TODO: wrap each vendor sync in try/catch — log error, continue to next vendor
  // TODO: upsert VendorPackage rows
  // TODO: write SyncLog entry with status, counts, errors
  // TODO: after all vendors done, trigger matchPackages job
}

module.exports = { syncAllVendors };
