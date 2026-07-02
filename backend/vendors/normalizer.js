/**
 * Normalizer — maps any vendor response to the internal VendorPackage shape.
 * All adapters must pass their raw data through normalizeVendorPackage() before returning.
 *
 * No Prisma. No DB access. Pure data transformation.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pick the first key from `obj` that exists in `candidates`.
 * Returns undefined if none found.
 * @param {Object} obj
 * @param {string[]} candidates
 * @returns {*}
 */
function pick(obj, candidates) {
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return undefined;
}

/**
 * Convert a value to a number.
 * Accepts numbers and numeric strings. Returns NaN for anything else.
 * @param {*} val
 * @returns {number}
 */
function toNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val.trim());
    return n;
  }
  return NaN;
}

/**
 * Parse a data field into GB.
 *
 * Supported formats:
 *   "500MB"  → 0.5
 *   "1GB"    → 1
 *   "1.5GB"  → 1.5
 *   "2 GB"   → 2
 *   "512 MB" → 0.512
 *   1.5      → 1.5  (already a number, treated as GB)
 *   "Unlimited" / "unlimited" → returns { isUnlimited: true }
 *
 * @param {string|number} val
 * @returns {{ dataGB: number, isUnlimited: boolean }}
 */
function parseData(val) {
  if (val === undefined || val === null) {
    return { dataGB: null, isUnlimited: false };
  }

  const str = String(val).trim();

  // Unlimited check (case-insensitive)
  if (/^unlimited$/i.test(str)) {
    return { dataGB: null, isUnlimited: true };
  }

  // Try MB
  const mbMatch = str.match(/^([\d.]+)\s*MB$/i);
  if (mbMatch) {
    return { dataGB: parseFloat(mbMatch[1]) / 1024, isUnlimited: false };
  }

  // Try GB
  const gbMatch = str.match(/^([\d.]+)\s*GB$/i);
  if (gbMatch) {
    return { dataGB: parseFloat(gbMatch[1]), isUnlimited: false };
  }

  // Plain number — treat as GB
  const n = toNumber(str);
  if (!isNaN(n)) {
    return { dataGB: n, isUnlimited: false };
  }

  return { dataGB: null, isUnlimited: false };
}

// ── Currency helpers ──────────────────────────────────────────────────────────

/**
 * Currencies that have no minor unit (1 unit = 1 whole unit, no cents).
 * Source: ISO 4217 zero-decimal currencies.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/**
 * Convert a price value to integer minor units.
 *
 * - Standard currencies (USD, EUR, GBP, AED, SGD, INR, …): multiply by 100, round.
 *   "8.50" → 850,  8.5 → 850,  "30" → 3000
 * - Zero-decimal currencies (JPY, KRW, …): keep as whole integer.
 *   "650" → 650,  650 → 650
 *
 * @param {string|number} rawPrice
 * @param {string} currency - ISO 4217 currency code (already uppercased)
 * @returns {number} integer minor units
 * @throws {Error} if rawPrice cannot be parsed as a finite number
 */
function toMinorUnits(rawPrice, currency) {
  const n = toNumber(rawPrice);
  if (isNaN(n) || !isFinite(n)) {
    throw new Error(`normalizeVendorPackage: price "${rawPrice}" is not a valid number`);
  }
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(n);
  }
  return Math.round(n * 100);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Converts any vendor package object into the internal VendorPackage shape.
 * Does NOT write to the database.
 *
 * @param {Object} rawPackage - raw package data from vendor API or sheet
 * @param {Object} [vendor]   - optional vendor context (not used for transformation, reserved for future use)
 * @returns {{
 *   vendorPackageId: string,
 *   countryCode: string,
 *   name: string|null,
 *   dataGB: number|null,
 *   durationDays: number|null,
 *   originalPrice: number,
 *   originalCurrency: string,
 *   isUnlimited: boolean,
 *   metadata: Object
 * }}
 * @throws {Error} if required fields (id, country, price, currency) are missing
 */
function normalizeVendorPackage(rawPackage, vendor) {
  if (!rawPackage || typeof rawPackage !== 'object') {
    throw new Error('normalizeVendorPackage: rawPackage must be a non-null object');
  }

  // ── 1. Package ID ──────────────────────────────────────────────────────────
  const rawId = pick(rawPackage, ['id', 'packageId', 'productId', 'package_id', 'product_id']);
  if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
    throw new Error('normalizeVendorPackage: package id is missing (checked: id, packageId, productId)');
  }
  const vendorPackageId = String(rawId).trim();

  // ── 2. Country code ────────────────────────────────────────────────────────
  const rawCountry = pick(rawPackage, ['countryCode', 'country', 'iso', 'country_code', 'iso_code']);
  if (rawCountry === undefined || rawCountry === null || String(rawCountry).trim() === '') {
    throw new Error('normalizeVendorPackage: country is missing (checked: countryCode, country, iso)');
  }
  const countryCode = String(rawCountry).trim().toUpperCase();

  // ── 3. Name (optional) ─────────────────────────────────────────────────────
  const rawName = pick(rawPackage, ['name', 'title', 'packageName', 'package_name', 'description']);
  const name = rawName !== undefined ? String(rawName).trim() : null;

  // ── 4. Data / unlimited ────────────────────────────────────────────────────
  const rawData = pick(rawPackage, ['dataGB', 'data', 'volume', 'data_gb', 'data_volume']);
  const { dataGB, isUnlimited: dataIsUnlimited } = parseData(rawData);

  // isUnlimited can also be set explicitly on the raw object
  const rawUnlimited = pick(rawPackage, ['isUnlimited', 'unlimited', 'is_unlimited']);
  const isUnlimited = dataIsUnlimited ||
    rawUnlimited === true ||
    rawUnlimited === 'true' ||
    rawUnlimited === 1;

  // ── 5. Duration ────────────────────────────────────────────────────────────
  const rawDuration = pick(rawPackage, ['durationDays', 'days', 'duration', 'validity', 'duration_days', 'validity_days']);
  const durationDays = rawDuration !== undefined ? toNumber(rawDuration) : null;

  // ── 6. Currency (resolved before price so toMinorUnits can use it) ─────────
  const rawCurrency = pick(rawPackage, ['currency', 'currencyCode', 'originalCurrency', 'currency_code', 'original_currency']);
  if (rawCurrency === undefined || rawCurrency === null || String(rawCurrency).trim() === '') {
    throw new Error('normalizeVendorPackage: currency is missing (checked: currency, currencyCode, originalCurrency)');
  }
  const originalCurrency = String(rawCurrency).trim().toUpperCase();

  // ── 7. Price → integer minor units ────────────────────────────────────────
  // Standard currencies (USD, EUR, AED, …): price × 100, rounded.
  // Zero-decimal currencies (JPY, KRW, …): kept as whole integer.
  const rawPrice = pick(rawPackage, ['price', 'cost', 'originalPrice', 'original_price', 'amount']);
  if (rawPrice === undefined || rawPrice === null) {
    throw new Error('normalizeVendorPackage: price is missing (checked: price, cost, originalPrice)');
  }
  // toMinorUnits throws if rawPrice is not a valid finite number
  const originalPrice = toMinorUnits(rawPrice, originalCurrency);

  // ── 8. Build result ────────────────────────────────────────────────────────
  return {
    vendorPackageId,
    countryCode,
    name,
    dataGB:           isNaN(durationDays) ? null : (dataGB !== null ? dataGB : null),
    durationDays:     (durationDays !== null && !isNaN(durationDays)) ? durationDays : null,
    originalPrice,
    originalCurrency,
    isUnlimited,
    metadata:         rawPackage,   // preserve original raw object verbatim
  };
}

// ── Legacy stub (kept for backward compatibility) ─────────────────────────────

/**
 * @deprecated Use normalizeVendorPackage() instead.
 */
function normalize(raw, vendorId, fieldMap = {}) {
  // TODO: map raw fields using fieldMap to VendorPackage schema:
  // { vendorId, vendorPackageId, vendorCountryCode, name, dataGB,
  //   durationDays, originalPrice, originalCurrency, rawPayload }
  return {};
}

module.exports = { normalizeVendorPackage, normalize };
