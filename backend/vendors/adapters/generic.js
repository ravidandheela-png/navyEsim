/**
 * Generic adapter (M8.1) — configurable for any standard REST API vendor.
 *
 * All config is read from the vendor DB row — no hardcoded URLs or keys.
 * Supports:
 *   - Bearer token auth  (apiAuthType = "bearer")
 *   - API key header     (apiAuthType = "header",  apiAuthHeaderName = "X-Api-Key")
 *   - API key query param(apiAuthType = "query",   apiAuthHeaderName = "api_key")
 *   - No auth            (apiAuthType = "none" or absent)
 *
 * vendor row shape expected:
 * {
 *   id:                 string   (DB id)
 *   name:               string
 *   apiBaseUrl:         string   (e.g. "https://api.vendor.com/v1/packages")
 *   apiKey:             string   (secret — never logged)
 *   apiAuthType:        string   ("bearer" | "header" | "query" | "none")
 *   apiAuthHeaderName:  string   (header name or query param name)
 *   columnMappingJson:  Object   (field mapping for normalizeVendorPackage)
 *   syncIntervalHours:  number
 * }
 *
 * No Prisma. No DB writes. Pure HTTP + normalization.
 */

const { normalizeVendorPackage } = require('../normalizer');

// Default request timeout in ms (overridable via env)
const REQUEST_TIMEOUT_MS = parseInt(process.env.VENDOR_REQUEST_TIMEOUT_MS || '15000', 10);

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Build fetch options (headers + URL) for the given vendor auth config.
 * @param {string} baseUrl
 * @param {Object} vendor
 * @returns {{ url: string, headers: Object }}
 */
function buildRequest(baseUrl, vendor) {
  const headers = {
    'Accept':       'application/json',
    'Content-Type': 'application/json',
  };

  let url = baseUrl;
  const authType = (vendor.apiAuthType || 'none').toLowerCase();

  switch (authType) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${vendor.apiKey}`;
      break;

    case 'header': {
      // Use apiAuthHeaderName as the header name, apiKey as the value
      const headerName = vendor.apiAuthHeaderName || 'X-Api-Key';
      headers[headerName] = vendor.apiKey;
      break;
    }

    case 'query': {
      // Append apiKey as a query parameter named apiAuthHeaderName
      const paramName = vendor.apiAuthHeaderName || 'api_key';
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}${encodeURIComponent(paramName)}=${encodeURIComponent(vendor.apiKey)}`;
      break;
    }

    case 'none':
    default:
      // No auth
      break;
  }

  return { url, headers };
}

// ── Main functions ────────────────────────────────────────────────────────────

/**
 * Fetches packages from a generic REST API vendor and normalizes them.
 *
 * Expects the API to return either:
 *   - An array:  [ { ... }, { ... } ]
 *   - An object with a data/packages/items/results key containing an array
 *
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ normalized: Object[], errors: string[] }>}
 * @throws {Error} if vendor.apiBaseUrl is missing or the HTTP request fails fatally
 */
async function fetchPackages(vendor) {
  if (!vendor || !vendor.apiBaseUrl) {
    throw new Error(`generic adapter: vendor "${vendor?.name}" has no apiBaseUrl configured`);
  }

  const columnMapping = vendor.columnMappingJson || {};
  const { url, headers } = buildRequest(vendor.apiBaseUrl, vendor);

  // ── 1. HTTP request with timeout ──────────────────────────────────────────
  let response;
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `generic adapter: request to "${vendor.apiBaseUrl}" timed out after ${REQUEST_TIMEOUT_MS}ms`
      );
    }
    throw new Error(`generic adapter: network error fetching "${vendor.apiBaseUrl}": ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(
      `generic adapter: HTTP ${response.status} ${response.statusText} from "${vendor.apiBaseUrl}"`
    );
  }

  // ── 2. Parse JSON ─────────────────────────────────────────────────────────
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`generic adapter: invalid JSON from "${vendor.apiBaseUrl}": ${err.message}`);
  }

  // ── 3. Extract array of raw packages ─────────────────────────────────────
  // TODO[INTEGRATION]: if the vendor wraps results in a non-standard key,
  // add vendor.apiResponseKey to the vendor config and use it here.
  let rawPackages;
  if (Array.isArray(data)) {
    rawPackages = data;
  } else if (data && typeof data === 'object') {
    // Try common wrapper keys
    rawPackages =
      data.data      ||
      data.packages  ||
      data.items     ||
      data.results   ||
      data.products  ||
      null;

    if (!Array.isArray(rawPackages)) {
      throw new Error(
        `generic adapter: could not find a packages array in response from "${vendor.apiBaseUrl}". ` +
        `Top-level keys: ${Object.keys(data).join(', ')}`
      );
    }
  } else {
    throw new Error(
      `generic adapter: unexpected response shape from "${vendor.apiBaseUrl}"`
    );
  }

  // ── 4. Normalize each package ─────────────────────────────────────────────
  const normalized = [];
  const errors     = [];

  for (let i = 0; i < rawPackages.length; i++) {
    const raw = rawPackages[i];
    try {
      // Apply columnMapping: remap raw keys to the aliases normalizeVendorPackage understands
      const remapped = applyColumnMapping(raw, columnMapping);
      const pkg      = normalizeVendorPackage(remapped, vendor);
      normalized.push(pkg);
    } catch (err) {
      errors.push(`Row ${i}: ${err.message}`);
    }
  }

  return { normalized, errors };
}

/**
 * Remaps raw package keys using the vendor's columnMappingJson.
 *
 * columnMappingJson maps internal field names → vendor field names:
 *   { "packageId": "id", "country": "iso_country", "price": "cost_usd" }
 *
 * This function inverts that: for each internal field, copy the value from
 * the vendor field name into the internal field name so normalizeVendorPackage
 * can find it.
 *
 * @param {Object} raw           - raw package from vendor API
 * @param {Object} columnMapping - vendor.columnMappingJson
 * @returns {Object}             - raw package with internal field names added
 */
function applyColumnMapping(raw, columnMapping) {
  if (!columnMapping || Object.keys(columnMapping).length === 0) {
    return raw; // no mapping — pass through as-is
  }

  const result = { ...raw }; // keep all original keys (metadata will capture them)
  for (const [internalField, vendorField] of Object.entries(columnMapping)) {
    if (vendorField && Object.prototype.hasOwnProperty.call(raw, vendorField)) {
      result[internalField] = raw[vendorField];
    }
  }
  return result;
}

/**
 * Tests connectivity to the vendor API.
 * Makes a lightweight HEAD request (falls back to GET if HEAD is not supported).
 *
 * @param {Object} vendor - vendor row from DB
 * @returns {Promise<{ ok: boolean, message: string, statusCode?: number }>}
 */
async function testConnection(vendor) {
  if (!vendor || !vendor.apiBaseUrl) {
    return { ok: false, message: 'No apiBaseUrl configured for this vendor.' };
  }

  const { url, headers } = buildRequest(vendor.apiBaseUrl, vendor);

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Try HEAD first — cheaper, no body transfer
    let response = await fetch(url, { method: 'HEAD', headers, signal: controller.signal });

    // Some APIs don't support HEAD — fall back to GET
    if (response.status === 405) {
      response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    }

    clearTimeout(timeoutId);

    if (response.ok) {
      return { ok: true, message: `Connected. HTTP ${response.status}`, statusCode: response.status };
    }
    return {
      ok:         false,
      message:    `HTTP ${response.status} ${response.statusText}`,
      statusCode: response.status,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, message: `Connection timed out after ${REQUEST_TIMEOUT_MS}ms` };
    }
    return { ok: false, message: `Network error: ${err.message}` };
  }
}

/**
 * Fetches a single package by vendor's own ID.
 * TODO[INTEGRATION]: implement if vendor supports single-package fetch endpoint.
 * Requires vendor.apiSinglePackageUrl or a URL template in vendor config.
 *
 * @param {Object} vendor          - vendor row from DB
 * @param {string} vendorPackageId
 * @returns {Promise<Object|null>}
 */
async function fetchPackageDetail(vendor, vendorPackageId) {
  // TODO[INTEGRATION]: build URL from vendor.apiBaseUrl + vendorPackageId
  // e.g. `${vendor.apiBaseUrl}/${vendorPackageId}`
  // Then fetch, normalize, and return the single package.
  return null;
}

module.exports = { fetchPackages, testConnection, fetchPackageDetail };
