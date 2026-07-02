/**
 * Exchange rates job — fetches live rates from frankfurter.app every 6 hours.
 * Cron schedule: EXCHANGE_RATE_CRON env var (default: "0 *\/6 * * *")
 * After fetch:
 *   1. Update non-pinned ExchangeRate rows
 *   2. Recompute convertedPriceINR for all VendorPackages
 *   3. Re-run cheapest + margin engine
 *   4. Log price changes to PriceHistory with reason="exchange_rate_update"
 */

// Currencies we care about (all expressed as: 1 USD = X <currency>)
const CURRENCIES = ['EUR', 'GBP', 'SGD', 'AED', 'JPY', 'HKD', 'AUD', 'CAD'];

// Frankfurter base URL — configurable via env, falls back to public API
const FRANKFURTER_BASE = process.env.EXCHANGE_RATE_API_URL || 'https://api.frankfurter.app';

/**
 * Fetches the latest exchange rates from frankfurter.app.
 * Returns rates relative to USD (1 USD = X foreign currency).
 * Does NOT write to the database.
 *
 * @returns {Promise<{ USD: number, EUR: number, GBP: number, SGD: number, AED: number, JPY: number, HKD: number, AUD: number, CAD: number }>}
 * @throws {Error} if the request fails, the response is invalid, or any required rate is missing
 */
async function fetchExchangeRates() {
  const url = `${FRANKFURTER_BASE}/latest?from=USD&to=${CURRENCIES.join(',')}`;

  // ── 1. Fetch from API ──────────────────────────────────────────────────────
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`Exchange rate fetch failed (network error): ${err.message}`);
  }

  // ── 2. Check HTTP status ───────────────────────────────────────────────────
  if (!response.ok) {
    throw new Error(
      `Exchange rate fetch failed: HTTP ${response.status} ${response.statusText} from ${url}`
    );
  }

  // ── 3. Parse JSON ──────────────────────────────────────────────────────────
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Exchange rate response is not valid JSON: ${err.message}`);
  }

  // ── 4. Validate structure ──────────────────────────────────────────────────
  if (!data || typeof data.rates !== 'object' || data.rates === null) {
    throw new Error(
      `Exchange rate response missing "rates" object. Received: ${JSON.stringify(data)}`
    );
  }

  // ── 5. Identify which currencies are present vs missing ───────────────────
  // Do NOT throw — partial results are acceptable. Callers can inspect .missing.
  const missing = CURRENCIES.filter(c => typeof data.rates[c] !== 'number');

  // ── 6. Build and return the rates object ──────────────────────────────────
  // USD is always 1 (it's the base currency we queried from).
  // Only include currencies that were actually returned by the API.
  const rates = { USD: 1, missing };
  for (const currency of CURRENCIES) {
    if (typeof data.rates[currency] === 'number') {
      rates[currency] = data.rates[currency];
    }
  }

  return rates;
}

/**
 * Converts USD-based rates (1 USD = X currency) into INR rates (1 currency = Y INR).
 *
 * Formula:
 *   toINR(currency) = usdToINR / usdToCurrency
 *   e.g. if 1 USD = 83.5 INR and 1 USD = 0.92 EUR → 1 EUR = 83.5 / 0.92 = 90.76 INR
 *
 * For USD itself: toINR(USD) = usdToINR (trivially, since usdToUSD = 1)
 *
 * @param {{ [currency: string]: number }} usdBasedRates - from fetchExchangeRates()
 * @param {number} usdToINR - current 1 USD → INR rate
 * @param {number} bufferPercent - safety margin to add (e.g. 2 → multiply by 1.02)
 * @returns {{ [currency: string]: number }} map of currency → toINR
 */
function convertToINRRates(usdBasedRates, usdToINR, bufferPercent) {
  const multiplier = 1 + (bufferPercent / 100);
  const result = {};
  for (const [currency, usdToCurrency] of Object.entries(usdBasedRates)) {
    // Skip the metadata key injected by fetchExchangeRates
    if (currency === 'missing') continue;
    if (typeof usdToCurrency !== 'number' || usdToCurrency === 0) continue;
    const rawINR = usdToINR / usdToCurrency;
    result[currency] = rawINR * multiplier;
  }
  return result;
}

/**
 * Fetches latest exchange rates from frankfurter.app and writes non-pinned
 * ExchangeRate rows to the database.
 *
 * Does NOT reprice packages — that is M6.3.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<{ updated: number, skippedPinned: number, errors: string[] }>}
 */
async function updateExchangeRates(prisma) {
  const summary = { updated: 0, skippedPinned: 0, errors: [] };

  // ── 1. Fetch live USD-based rates ──────────────────────────────────────────
  let usdBasedRates;
  try {
    usdBasedRates = await fetchExchangeRates();
  } catch (err) {
    summary.errors.push(`fetchExchangeRates failed: ${err.message}`);
    return summary;
  }

  // Report any currencies the API did not return — but continue with the rest
  if (Array.isArray(usdBasedRates.missing) && usdBasedRates.missing.length > 0) {
    for (const c of usdBasedRates.missing) {
      summary.errors.push(`Currency not returned by API, skipped: ${c}`);
    }
  }

  // ── 2. Determine USD → INR base rate ──────────────────────────────────────
  // Priority: existing DB row for USD → env fallback → hardcoded safe default
  let usdToINR;
  try {
    const usdRow = await prisma.exchangeRate.findUnique({ where: { fromCurrency: 'USD' } });
    usdToINR = usdRow ? usdRow.toINR : null;
  } catch (err) {
    summary.errors.push(`DB lookup for USD rate failed: ${err.message}`);
    return summary;
  }

  if (!usdToINR) {
    // Fall back to env var (admin can set this before first cron run)
    const envRate = parseFloat(process.env.USD_TO_INR_FALLBACK);
    usdToINR = !isNaN(envRate) && envRate > 0 ? envRate : 83.50;
  }

  // ── 3. Apply buffer % ─────────────────────────────────────────────────────
  const bufferPercent = parseFloat(process.env.EXCHANGE_RATE_BUFFER_PERCENT) || 0;

  // ── 4. Convert to INR rates ────────────────────────────────────────────────
  const inrRates = convertToINRRates(usdBasedRates, usdToINR, bufferPercent);

  // ── 5. Load all existing ExchangeRate rows to check isPinned ──────────────
  let existingRows;
  try {
    existingRows = await prisma.exchangeRate.findMany();
  } catch (err) {
    summary.errors.push(`DB read of ExchangeRate rows failed: ${err.message}`);
    return summary;
  }
  const pinnedSet = new Set(
    existingRows.filter(r => r.isPinned).map(r => r.fromCurrency)
  );

  // ── 6. Upsert each currency (skip pinned) ─────────────────────────────────
  const now = new Date();

  for (const [currency, toINR] of Object.entries(inrRates)) {
    if (pinnedSet.has(currency)) {
      summary.skippedPinned++;
      continue;
    }

    try {
      await prisma.exchangeRate.upsert({
        where:  { fromCurrency: currency },
        update: {
          toINR,
          source:    'frankfurter',
          updatedBy: 'auto_cron',
          fetchedAt: now,
          appliedAt: now,
        },
        create: {
          fromCurrency: currency,
          toINR,
          source:    'frankfurter',
          isPinned:  false,
          updatedBy: 'auto_cron',
          fetchedAt: now,
          appliedAt: now,
        },
      });
      summary.updated++;
    } catch (err) {
      summary.errors.push(`Failed to upsert ${currency}: ${err.message}`);
    }
  }

  return summary;
}

/**
 * Fetches latest exchange rates from frankfurter.app and updates DB.
 * Skips pinned rates. Applies optional buffer % from settings.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<{ updated: number, skippedPinned: number, errors: string[] }>}
 */
async function fetchAndUpdateRates(prisma) {
  // Delegates to updateExchangeRates — full pipeline (reprice) to be added in M6.3
  return updateExchangeRates(prisma);
}

module.exports = { fetchExchangeRates, updateExchangeRates, fetchAndUpdateRates };
