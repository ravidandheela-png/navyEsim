/**
 * Exchange rates job — fetches live rates from frankfurter.app every 6 hours.
 * Cron schedule: EXCHANGE_RATE_CRON env var (default: "0 *\/6 * * *")
 * After fetch:
 *   1. Update non-pinned ExchangeRate rows
 *   2. Recompute convertedPriceINR for all VendorPackages
 *   3. Re-run cheapest + margin engine
 *   4. Log price changes to PriceHistory with reason="exchange_rate_update"
 */

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD&to=INR,HKD,EUR,GBP,SGD,AED,JPY,AUD,CAD';

/**
 * Fetches latest exchange rates from frankfurter.app and updates DB.
 * Skips pinned rates. Applies optional buffer % from settings.
 * @returns {Promise<{ updated: string[], skipped: string[], errors: string[] }>}
 */
async function fetchAndUpdateRates() {
  // TODO: GET FRANKFURTER_URL
  // TODO: for each currency in response, skip if ExchangeRate.isPinned=true
  // TODO: apply EXCHANGE_RATE_BUFFER_PERCENT: rate * (1 + buffer/100)
  // TODO: upsert ExchangeRate rows with source='frankfurter', updatedBy='auto_cron'
  // TODO: recompute convertedPriceINR for all VendorPackages
  // TODO: re-run recomputeCheapest() + applyMargin()
  // TODO: log price changes to PriceHistory with reason="exchange_rate_update"
  return { updated: [], skipped: [], errors: [] };
}

module.exports = { fetchAndUpdateRates };
