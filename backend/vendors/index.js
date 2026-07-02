/**
 * Vendor router (M8.2) — selects the correct adapter by vendor.slug.
 *
 * Supported adapters: airalo, esimaccess, tripdotcom, generic (fallback).
 *
 * Usage:
 *   const { getAdapter } = require('./vendors');
 *   const adapter = getAdapter(vendor);
 *   const { normalized, errors } = await adapter.fetchPackages(vendor);
 */

const generic    = require('./adapters/generic');
const airalo     = require('./adapters/airalo');
const esimaccess = require('./adapters/esimaccess');
const tripdotcom = require('./adapters/tripdotcom');

// Map of slug → adapter module
const ADAPTERS = {
  airalo,
  esimaccess,
  tripdotcom,
  generic,
};

/**
 * Returns the adapter for a given vendor object.
 * Matches on vendor.slug (case-insensitive).
 * Falls back to the generic adapter if no specific adapter is registered.
 *
 * @param {Object} vendor - vendor row from DB (must have .slug and .name)
 * @returns {{ fetchPackages: Function, testConnection: Function, fetchPackageDetail: Function }}
 * @throws {Error} if vendor is null/undefined
 */
function getAdapter(vendor) {
  if (!vendor || typeof vendor !== 'object') {
    throw new Error('getAdapter: vendor must be a non-null object');
  }

  const slug = (vendor.slug || '').toLowerCase().trim();

  if (!slug) {
    // No slug — fall back to generic silently
    return generic;
  }

  const adapter = ADAPTERS[slug];

  if (!adapter) {
    // Unknown slug — fall back to generic
    console.warn(
      `[vendor-router] No specific adapter found for slug "${slug}" ` +
      `(vendor: "${vendor.name}"). Falling back to generic adapter.`
    );
    return generic;
  }

  return adapter;
}

module.exports = { getAdapter, ADAPTERS };
