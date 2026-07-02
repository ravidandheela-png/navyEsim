/**
 * Vendor router — loads the correct adapter by vendor.slug.
 * Supported adapters: generic, airalo, esimaccess, tripdotcom.
 */

const generic = require('./adapters/generic');
const airalo = require('./adapters/airalo');
const esimaccess = require('./adapters/esimaccess');
const tripdotcom = require('./adapters/tripdotcom');

const ADAPTERS = {
  generic,
  airalo,
  esimaccess,
  tripdotcom,
};

/**
 * Returns the adapter for a given vendor slug.
 * Falls back to generic adapter if no specific adapter found.
 * @param {string} slug - vendor.slug from DB
 * @returns {{ fetchPackages: Function, testConnection: Function, fetchPackageDetail: Function }}
 */
function getAdapter(slug) {
  return ADAPTERS[slug] || ADAPTERS.generic;
}

module.exports = { getAdapter };
