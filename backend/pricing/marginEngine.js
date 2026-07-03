/**
 * Margin engine (M10.1).
 *
 * Applies margin rules to a vendor price and returns the final customer price.
 *
 * RULES:
 *   - All money values are integers in PAISE (1 INR = 100 paise).
 *   - Never mix pricing logic inside route handlers.
 *   - Always log price changes to PriceHistory with a reason (done by caller).
 *
 * No Prisma. No DB writes. Pure computation.
 */

// ── Rounding ──────────────────────────────────────────────────────────────────

/**
 * Applies a rounding rule to a raw price in paise.
 *
 * Supported rules:
 *   "none"         — no rounding, return as-is
 *   "round_up_9"   — round up to the nearest ₹X9 (e.g. ₹1082 → ₹1089, ₹1090 → ₹1099)
 *                    In paise: find the next multiple of 100 ending in 900 paise
 *   "ceil_hundred" — round up to the nearest ₹100 (e.g. ₹1082 → ₹1100)
 *                    In paise: ceil to next multiple of 10000 paise
 *
 * @param {number} rawPriceINR - price in paise (integer)
 * @param {'none'|'round_up_9'|'ceil_hundred'} roundingRule
 * @returns {number} rounded price in paise (integer)
 */
function applyRounding(rawPriceINR, roundingRule) {
  const price = Math.ceil(rawPriceINR); // ensure integer

  switch ((roundingRule || 'none').toLowerCase()) {
    case 'round_up_9': {
      // Target: price ending in ₹X9, i.e. last two digits of rupees = 9
      // In paise: last 3 digits should be 900 (= ₹X9.00)
      // e.g. 108200 paise (₹1082.00) → 108900 paise (₹1089.00)
      //      108900 paise (₹1089.00) → 108900 paise (already ends in 9)
      //      109000 paise (₹1090.00) → 109900 paise (₹1099.00)
      const remainder = price % 10000; // paise within the current ₹100 block
      if (remainder === 9000) return price; // already ends in ₹X9
      if (remainder < 9000) return price - remainder + 9000;
      // remainder > 9000: go to next ₹100 block's ₹X9
      return price - remainder + 10000 + 9000;
    }

    case 'ceil_hundred': {
      // Round up to the nearest ₹100 (= 10000 paise)
      // e.g. 108200 paise (₹1082) → 110000 paise (₹1100)
      //      110000 paise (₹1100) → 110000 paise (already a multiple)
      const rem = price % 10000;
      if (rem === 0) return price;
      return price - rem + 10000;
    }

    case 'none':
    default:
      return price;
  }
}

// ── Rule selection ────────────────────────────────────────────────────────────

/**
 * Selects the best matching margin rule from an array of active rules.
 *
 * Priority order:
 *   1. package_specific — rule.canonicalPackageId === canonicalPackageId
 *   2. price_range      — rule.priceMinINR <= vendorPriceINR <= rule.priceMaxINR,
 *                         sorted by rule.priority ascending (lower = higher priority)
 *   3. global           — rule.ruleType === 'global', sorted by priority ascending
 *
 * @param {number} vendorPriceINR - vendor price in paise
 * @param {Object[]} rules        - active MarginRule rows (any order)
 * @param {string|null} canonicalPackageId
 * @returns {Object|null} the matched rule, or null if none found
 */
function selectRule(vendorPriceINR, rules, canonicalPackageId) {
  if (!Array.isArray(rules) || rules.length === 0) return null;

  // 1. package_specific — sort by priority ascending so the highest-priority rule wins
  //    when multiple package_specific rules exist for the same canonicalPackageId.
  if (canonicalPackageId) {
    const specificRules = rules
      .filter(r => r.ruleType === 'package_specific' && r.canonicalPackageId === canonicalPackageId)
      .sort((a, b) => a.priority - b.priority);
    if (specificRules.length > 0) return specificRules[0];
  }

  // 2. price_range — sort by priority ascending, pick first that matches.
  //    NOTE: overlapping price ranges with the same priority value produce
  //    non-deterministic results. This is a data-quality / admin-validation issue
  //    and should be prevented at the admin UI level.
  const rangeRules = rules
    .filter(r => r.ruleType === 'price_range')
    .sort((a, b) => a.priority - b.priority);

  for (const rule of rangeRules) {
    const min = rule.priceMinINR ?? 0;
    const max = rule.priceMaxINR ?? Infinity;
    if (vendorPriceINR >= min && vendorPriceINR <= max) {
      return rule;
    }
  }

  // 3. global fallback — sort by priority ascending, pick first
  const globalRules = rules
    .filter(r => r.ruleType === 'global')
    .sort((a, b) => a.priority - b.priority);

  if (globalRules.length > 0) return globalRules[0];

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Applies the best matching margin rule to a vendor price.
 *
 * Rule priority:
 *   1. package_specific rule for canonicalPackageId (if provided)
 *   2. price_range rules ordered by priority (ascending)
 *   3. global fallback rule
 *
 * @param {number} vendorPriceINR       - cheapest vendor price in paise (integer)
 * @param {Object[]} rules              - active MarginRule rows from DB
 * @param {string|null} [canonicalPackageId=null] - for package_specific lookup
 * @returns {{
 *   rule:            Object,   — the matched MarginRule row
 *   marginPercent:   number,   — e.g. 8.5
 *   marginAmountINR: number,   — paise (integer, rounded)
 *   rawFinalINR:     number,   — vendorPriceINR + marginAmountINR (before rounding)
 *   finalPriceINR:   number    — after rounding rule applied (paise, integer)
 * }}
 * @throws {Error} if no rule matches
 */
function applyMarginRule(vendorPriceINR, rules, canonicalPackageId = null) {
  // ── 1. Validate inputs ─────────────────────────────────────────────────────
  if (typeof vendorPriceINR !== 'number' || !isFinite(vendorPriceINR) || vendorPriceINR < 0) {
    throw new Error(
      `applyMarginRule: vendorPriceINR must be a non-negative finite number, got ${vendorPriceINR}`
    );
  }

  if (!Array.isArray(rules)) {
    throw new Error('applyMarginRule: rules must be an array of MarginRule objects');
  }

  // ── 2. Select rule ─────────────────────────────────────────────────────────
  const rule = selectRule(vendorPriceINR, rules, canonicalPackageId);

  if (!rule) {
    throw new Error(
      `applyMarginRule: no margin rule matched for vendorPriceINR=${vendorPriceINR} ` +
      `canonicalPackageId=${canonicalPackageId ?? 'none'}. ` +
      `Ensure a global fallback rule exists in the DB.`
    );
  }

  // ── 3. Validate matched rule ───────────────────────────────────────────────
  if (typeof rule.marginPercent !== 'number' || rule.marginPercent < 0) {
    throw new Error(
      `applyMarginRule: matched rule "${rule.id}" has invalid marginPercent=${rule.marginPercent}. ` +
      `marginPercent must be a non-negative number.`
    );
  }

  // ── 4. Compute margin ──────────────────────────────────────────────────────
  const marginPercent   = rule.marginPercent;                              // e.g. 8.5
  const marginAmountINR = Math.round(vendorPriceINR * (marginPercent / 100)); // paise, integer
  const rawFinalINR     = vendorPriceINR + marginAmountINR;                // paise, before rounding

  // ── 5. Apply rounding ──────────────────────────────────────────────────────
  const finalPriceINR = applyRounding(rawFinalINR, rule.roundingRule || 'none');

  return {
    rule,
    marginPercent,
    marginAmountINR,
    rawFinalINR,
    finalPriceINR,
  };
}

// ── Legacy export (kept for backward compatibility) ───────────────────────────

/**
 * @deprecated Use applyMarginRule(vendorPriceINR, rules, canonicalPackageId) instead.
 */
function applyMargin(winningVendorPriceINR, canonicalPackageId, rules) {
  // Delegate to new function with reordered args
  return applyMarginRule(winningVendorPriceINR, rules, canonicalPackageId);
}

module.exports = { applyMarginRule, applyRounding, applyMargin };
