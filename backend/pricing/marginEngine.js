/**
 * Margin engine — applies margin rules to vendor prices, returns finalPriceINR.
 * RULE: All money values stored and computed in INR as integers (paise).
 * RULE: Never mix pricing logic inside route handlers.
 * RULE: Always log price changes to PriceHistory with a reason.
 */

/**
 * Applies the best matching margin rule to a vendor price.
 * Rule priority: package_specific → price_range → global fallback.
 * Throws if no rule matches (should never happen with global fallback seeded).
 *
 * @param {number} winningVendorPriceINR - cheapest vendor price in paise
 * @param {string} canonicalPackageId - for package_specific rule lookup
 * @param {Object[]} rules - active MarginRule rows ordered by priority
 * @returns {{ finalPriceINR: number, marginPercent: number, marginAmountINR: number,
 *             rawFinalINR: number, ruleId: string }}
 */
function applyMargin(winningVendorPriceINR, canonicalPackageId, rules) {
  // TODO: find package_specific rule for canonicalPackageId
  // TODO: find first matching price_range rule
  // TODO: fall back to global rule
  // TODO: throw Error('No margin rule matched') if none found
  // TODO: compute marginAmount = winningVendorPriceINR * (marginPercent / 100)
  // TODO: compute rawFinal = winningVendorPriceINR + marginAmount
  // TODO: apply rounding rule (none | round_up_9 | ceil_hundred)
  return {};
}

/**
 * Applies rounding rule to a raw price in paise.
 * @param {number} rawPriceINR
 * @param {'none'|'round_up_9'|'ceil_hundred'} roundingRule
 * @returns {number}
 */
function applyRounding(rawPriceINR, roundingRule) {
  // TODO: implement rounding logic
  // round_up_9: e.g. 108200 paise (₹1082) → 108900 paise (₹1089)
  // ceil_hundred: e.g. 108200 paise → 110000 paise (₹1100)
  return rawPriceINR;
}

module.exports = { applyMargin, applyRounding };
