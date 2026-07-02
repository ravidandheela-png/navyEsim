/**
 * NavyeSIM seed script.
 * Run with: node prisma/seed.js
 *
 * Idempotent — safe to run multiple times.
 * Uses upsert() throughout so re-runs update rather than duplicate.
 * Entire seed is wrapped in a single prisma.$transaction for atomicity.
 *
 * Required env vars:
 *   ADMIN_EMAIL              — admin login email
 *   ADMIN_PASSWORD_INITIAL   — plain-text password (hashed here with bcrypt)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Counters for the summary log */
const counts = {
  admin: 0, countries: 0, vendors: 0,
  vendorPackages: 0, canonicalPackages: 0, vendorLinks: 0,
  marginRules: 0, exchangeRates: 0, priceHistory: 0, orders: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Static seed data
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { isoCode: 'US', name: 'United States',  flagEmoji: '🇺🇸' },
  { isoCode: 'GB', name: 'United Kingdom', flagEmoji: '🇬🇧' },
  { isoCode: 'DE', name: 'Germany',        flagEmoji: '🇩🇪' },
  { isoCode: 'FR', name: 'France',         flagEmoji: '🇫🇷' },
  { isoCode: 'JP', name: 'Japan',          flagEmoji: '🇯🇵' },
  { isoCode: 'SG', name: 'Singapore',      flagEmoji: '🇸🇬' },
  { isoCode: 'AE', name: 'UAE',            flagEmoji: '🇦🇪' },
  { isoCode: 'AU', name: 'Australia',      flagEmoji: '🇦🇺' },
  { isoCode: 'TH', name: 'Thailand',       flagEmoji: '🇹🇭' },
  { isoCode: 'HK', name: 'Hong Kong',      flagEmoji: '🇭🇰' },
];

const VENDORS = [
  {
    slug: 'airalo',
    name: 'Airalo',
    sourceType: 'api',
    apiBaseUrl: 'https://sandbox-partners-api.airalo.com',
    apiKey: 'PLACEHOLDER_AIRALO_API_KEY',
    apiAuthType: 'bearer',
    apiAuthHeaderName: 'Authorization',
    columnMappingJson: null,
    syncFrequencyHours: 6,
  },
  {
    slug: 'esimaccess',
    name: 'eSIM Access',
    sourceType: 'api',
    apiBaseUrl: 'https://api.esimaccess.com',
    apiKey: 'PLACEHOLDER_ESIMACCESS_API_KEY',
    apiAuthType: 'apikey_header',
    apiAuthHeaderName: 'X-API-Key',
    columnMappingJson: null,
    syncFrequencyHours: 6,
  },
  {
    slug: 'sheet-vendor',
    name: 'Sheet Vendor',
    sourceType: 'sheet',
    apiBaseUrl: null,
    apiKey: null,
    apiAuthType: null,
    apiAuthHeaderName: null,
    columnMappingJson: JSON.stringify({
      vendorPackageId: 'Package ID',
      vendorCountryCode: 'Country',
      name: 'Package Name',
      dataGB: 'Data (GB)',
      durationDays: 'Validity (Days)',
      originalPrice: 'Price',
      originalCurrency: 'Currency',
    }),
    syncFrequencyHours: 0,
  },
];

/**
 * 5 canonical package templates per country.
 * dataGB and durationDays define the canonical identity.
 */
const PACKAGE_TEMPLATES = [
  { name: '1 GB / 7 Days',   dataGB: 1,   durationDays: 7  },
  { name: '3 GB / 15 Days',  dataGB: 3,   durationDays: 15 },
  { name: '5 GB / 30 Days',  dataGB: 5,   durationDays: 30 },
  { name: '10 GB / 30 Days', dataGB: 10,  durationDays: 30 },
  { name: '20 GB / 30 Days', dataGB: 20,  durationDays: 30 },
];

/**
 * Exchange rates: 1 unit of foreign currency → INR (major units).
 * Stored as Float in ExchangeRate.toINR.
 */
const EXCHANGE_RATES = [
  { fromCurrency: 'USD', toINR: 83.50 },
  { fromCurrency: 'EUR', toINR: 90.20 },
  { fromCurrency: 'HKD', toINR: 10.70 },
  { fromCurrency: 'GBP', toINR: 105.80 },
  { fromCurrency: 'SGD', toINR: 62.30 },
  { fromCurrency: 'AED', toINR: 22.73 },
];

/**
 * Margin rules as specified in PROJECT_SPEC.md Section 7.
 * priceMinINR / priceMaxINR in paise (1 INR = 100 paise).
 */
const MARGIN_RULES = [
  {
    name: 'Below ₹999',
    priority: 1,
    ruleType: 'price_range',
    priceMinINR: null,
    priceMaxINR: 99900,   // ₹999 in paise
    canonicalPackageId: null,
    marginPercent: 10,
    roundingRule: 'none',
    isActive: true,
  },
  {
    name: '₹1,000 – ₹1,999',
    priority: 2,
    ruleType: 'price_range',
    priceMinINR: 100000,  // ₹1,000 in paise
    priceMaxINR: 199900,  // ₹1,999 in paise
    canonicalPackageId: null,
    marginPercent: 8,
    roundingRule: 'none',
    isActive: true,
  },
  {
    name: '₹2,000 and above',
    priority: 3,
    ruleType: 'price_range',
    priceMinINR: 200000,  // ₹2,000 in paise
    priceMaxINR: null,
    canonicalPackageId: null,
    marginPercent: 7,
    roundingRule: 'none',
    isActive: true,
  },
  {
    name: 'Round-up-9 example',
    priority: 10,
    ruleType: 'price_range',
    priceMinINR: 50000,   // ₹500 in paise
    priceMaxINR: 79900,   // ₹799 in paise
    canonicalPackageId: null,
    marginPercent: 9,
    roundingRule: 'round_up_9',
    isActive: false,      // seeded but inactive — admin can enable
  },
  {
    name: 'Global Fallback',
    priority: 99,
    ruleType: 'global',
    priceMinINR: null,
    priceMaxINR: null,
    canonicalPackageId: null,
    marginPercent: 10,
    roundingRule: 'none',
    isActive: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pricing helpers (mirrors marginEngine logic for seed purposes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the best matching margin rule for a given vendor price (in paise).
 * @param {object[]} rules - sorted margin rules
 * @param {number} vendorPriceINR - in paise
 * @returns {object} matching rule
 */
function findRule(rules, vendorPriceINR) {
  // 1. package_specific — not applicable in seed (no package-specific rules seeded)
  // 2. price_range in priority order
  const priceRange = rules
    .filter(r => r.ruleType === 'price_range' && r.isActive)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of priceRange) {
    const aboveMin = rule.priceMinINR === null || vendorPriceINR >= rule.priceMinINR;
    const belowMax = rule.priceMaxINR === null || vendorPriceINR <= rule.priceMaxINR;
    if (aboveMin && belowMax) return rule;
  }

  // 3. global fallback
  const fallback = rules.find(r => r.ruleType === 'global' && r.isActive);
  if (fallback) return fallback;

  throw new Error('No margin rule matched — global fallback rule is missing or inactive.');
}

/**
 * Apply rounding rule to a raw price in paise.
 * @param {number} rawPaise
 * @param {string} roundingRule
 * @returns {number}
 */
function applyRounding(rawPaise, roundingRule) {
  // Convert to rupees for rounding, then back to paise
  const rupees = rawPaise / 100;
  if (roundingRule === 'round_up_9') {
    // e.g. ₹1082 → ₹1089
    const base = Math.floor(rupees / 10) * 10;
    return (base + 9) * 100 >= rawPaise ? (base + 9) * 100 : (base + 19) * 100;
  }
  if (roundingRule === 'ceil_hundred') {
    // e.g. ₹1082 → ₹1100
    return Math.ceil(rupees / 100) * 100 * 100;
  }
  return rawPaise; // 'none'
}

/**
 * Compute finalPriceINR from vendor price and a margin rule.
 * All values in paise.
 * @param {number} vendorPriceINR - paise
 * @param {object} rule
 * @returns {{ marginAmountINR: number, finalPriceINR: number }}
 */
function computePrice(vendorPriceINR, rule) {
  const marginAmountINR = Math.round(vendorPriceINR * (rule.marginPercent / 100));
  const rawFinal = vendorPriceINR + marginAmountINR;
  const finalPriceINR = applyRounding(rawFinal, rule.roundingRule);
  return { marginAmountINR, finalPriceINR };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // ── Validate env vars ──────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD_INITIAL;

  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL env var is required but not set.');
  }
  if (!adminPassword) {
    throw new Error(
      'ADMIN_PASSWORD_INITIAL env var is required but not set. ' +
      'Set it in backend/.env before running the seed.'
    );
  }

  // ── Hash password BEFORE the transaction (CPU-intensive, must not block tx) ─
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  console.log('Starting seed…\n');

  // ── Run everything in a single transaction ─────────────────────────────────
  await prisma.$transaction(async (tx) => {

    // ── 1. Admin ─────────────────────────────────────────────────────────────
    await tx.admin.upsert({
      where:  { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash },
    });
    counts.admin++;

    // ── 2. Countries ──────────────────────────────────────────────────────────
    const countryRecords = [];
    for (const c of COUNTRIES) {
      const record = await tx.country.upsert({
        where:  { isoCode: c.isoCode },
        update: { name: c.name, flagEmoji: c.flagEmoji, isActive: true },
        create: { name: c.name, isoCode: c.isoCode, flagEmoji: c.flagEmoji, isActive: true },
      });
      countryRecords.push(record);
      counts.countries++;
    }

    // ── 3. Vendors ────────────────────────────────────────────────────────────
    const vendorRecords = [];
    for (const v of VENDORS) {
      const record = await tx.vendor.upsert({
        where:  { slug: v.slug },
        update: {
          name: v.name, sourceType: v.sourceType,
          apiBaseUrl: v.apiBaseUrl, apiKey: v.apiKey,
          apiAuthType: v.apiAuthType, apiAuthHeaderName: v.apiAuthHeaderName,
          columnMappingJson: v.columnMappingJson,
          syncFrequencyHours: v.syncFrequencyHours, isActive: true,
        },
        create: {
          name: v.name, slug: v.slug, sourceType: v.sourceType,
          apiBaseUrl: v.apiBaseUrl, apiKey: v.apiKey,
          apiAuthType: v.apiAuthType, apiAuthHeaderName: v.apiAuthHeaderName,
          columnMappingJson: v.columnMappingJson,
          syncFrequencyHours: v.syncFrequencyHours, isActive: true,
          syncStatus: 'idle',
        },
      });
      vendorRecords.push(record);
      counts.vendors++;
    }

    // ── 4. Exchange Rates ─────────────────────────────────────────────────────
    const rateMap = {}; // currency → toINR (major units)
    for (const r of EXCHANGE_RATES) {
      await tx.exchangeRate.upsert({
        where:  { fromCurrency: r.fromCurrency },
        update: { toINR: r.toINR, source: 'manual', updatedBy: 'admin_manual', appliedAt: new Date() },
        create: {
          fromCurrency: r.fromCurrency, toINR: r.toINR,
          source: 'manual', isPinned: false,
          fetchedAt: new Date(), appliedAt: new Date(),
          updatedBy: 'admin_manual',
        },
      });
      rateMap[r.fromCurrency] = r.toINR;
      counts.exchangeRates++;
    }

    // ── 5. Margin Rules ───────────────────────────────────────────────────────
    const marginRuleRecords = [];
    for (const mr of MARGIN_RULES) {
      // Upsert by name (unique enough for seed purposes)
      const existing = await tx.marginRule.findFirst({ where: { name: mr.name } });
      let record;
      if (existing) {
        record = await tx.marginRule.update({
          where: { id: existing.id },
          data: {
            priority: mr.priority, ruleType: mr.ruleType,
            priceMinINR: mr.priceMinINR, priceMaxINR: mr.priceMaxINR,
            marginPercent: mr.marginPercent, roundingRule: mr.roundingRule,
            isActive: mr.isActive,
          },
        });
      } else {
        record = await tx.marginRule.create({ data: mr });
      }
      marginRuleRecords.push(record);
      counts.marginRules++;
    }

    // ── 6. Canonical Packages + Vendor Packages + Vendor Links ────────────────
    //
    // Vendor price strategy (to demonstrate cheapest-wins):
    //   Vendor 0 (Airalo):       base price in USD cents
    //   Vendor 1 (eSIM Access):  base price × 1.05 (5% more expensive)
    //   Vendor 2 (Sheet Vendor): base price × 1.10 (10% more expensive)
    //
    // Base USD prices per package template (in cents):
    const BASE_PRICES_USD_CENTS = [800, 1500, 2200, 3500, 5500]; // matches PACKAGE_TEMPLATES order
    const USD_TO_INR = rateMap['USD'] || 83.50;

    for (const country of countryRecords) {
      for (let tIdx = 0; tIdx < PACKAGE_TEMPLATES.length; tIdx++) {
        const tmpl = PACKAGE_TEMPLATES[tIdx];
        const baseCents = BASE_PRICES_USD_CENTS[tIdx];

        // Vendor prices in USD cents (minor units)
        const vendorPricesCents = [
          baseCents,
          Math.round(baseCents * 1.05),
          Math.round(baseCents * 1.10),
        ];

        // Convert to paise: cents × USD_TO_INR = paise
        // (1 USD = 100 cents; 1 USD = USD_TO_INR rupees = USD_TO_INR × 100 paise)
        // So: cents × USD_TO_INR = paise  ✓
        const vendorPricesINR = vendorPricesCents.map(c => Math.round(c * USD_TO_INR));

        // Cheapest vendor price (vendor 0 is always cheapest by design)
        const winningVendorPriceINR = Math.min(...vendorPricesINR);

        // Find applicable margin rule
        const rule = findRule(marginRuleRecords, winningVendorPriceINR);
        const { marginAmountINR, finalPriceINR } = computePrice(winningVendorPriceINR, rule);

        // Upsert CanonicalPackage (unique by countryId + dataGB + durationDays)
        const canonicalName = `${country.isoCode} — ${tmpl.name}`;
        const existing = await tx.canonicalPackage.findFirst({
          where: { countryId: country.id, dataGB: tmpl.dataGB, durationDays: tmpl.durationDays },
        });

        let canonical;
        if (existing) {
          canonical = await tx.canonicalPackage.update({
            where: { id: existing.id },
            data: {
              name: canonicalName,
              winningVendorPriceINR,
              marginRuleId: rule.id,
              marginPercent: rule.marginPercent,
              marginAmountINR,
              finalPriceINR,
              isActive: true,
            },
          });
        } else {
          canonical = await tx.canonicalPackage.create({
            data: {
              countryId: country.id,
              name: canonicalName,
              dataGB: tmpl.dataGB,
              durationDays: tmpl.durationDays,
              winningVendorPriceINR,
              marginRuleId: rule.id,
              marginPercent: rule.marginPercent,
              marginAmountINR,
              finalPriceINR,
              manualPriceOverride: false,
              isActive: true,
              sortOrder: tIdx,
            },
          });
          counts.canonicalPackages++;
        }

        // Upsert 3 VendorPackages (one per vendor)
        for (let vIdx = 0; vIdx < vendorRecords.length; vIdx++) {
          const vendor = vendorRecords[vIdx];
          const vpId = `${vendor.slug}-${country.isoCode}-${tmpl.dataGB}gb-${tmpl.durationDays}d`;
          const priceINR = vendorPricesINR[vIdx];

          const vp = await tx.vendorPackage.upsert({
            where: { vendorId_vendorPackageId: { vendorId: vendor.id, vendorPackageId: vpId } },
            update: {
              countryId: country.id,
              vendorCountryCode: country.isoCode,
              name: `${tmpl.name} (${vendor.name})`,
              dataGB: tmpl.dataGB,
              durationDays: tmpl.durationDays,
              originalPrice: vendorPricesCents[vIdx],
              originalCurrency: 'USD',
              convertedPriceINR: priceINR,
              rawPayload: JSON.stringify({ seeded: true, vendor: vendor.slug }),
              isActive: true,
              isMapped: true,
              lastSeenAt: new Date(),
            },
            create: {
              vendorId: vendor.id,
              countryId: country.id,
              vendorPackageId: vpId,
              vendorCountryCode: country.isoCode,
              name: `${tmpl.name} (${vendor.name})`,
              dataGB: tmpl.dataGB,
              durationDays: tmpl.durationDays,
              originalPrice: vendorPricesCents[vIdx],
              originalCurrency: 'USD',
              convertedPriceINR: priceINR,
              rawPayload: JSON.stringify({ seeded: true, vendor: vendor.slug }),
              isActive: true,
              isMapped: true,
              sourceFile: null,
              lastSeenAt: new Date(),
            },
          });
          counts.vendorPackages++;

          // Upsert CanonicalPackageVendorLink
          const isCheapest = priceINR === winningVendorPriceINR;
          const existingLink = await tx.canonicalPackageVendorLink.findUnique({
            where: {
              canonicalPackageId_vendorPackageId: {
                canonicalPackageId: canonical.id,
                vendorPackageId: vp.id,
              },
            },
          });

          if (existingLink) {
            await tx.canonicalPackageVendorLink.update({
              where: { id: existingLink.id },
              data: { vendorPriceINR: priceINR, isCheapest, lastCheckedAt: new Date() },
            });
          } else {
            await tx.canonicalPackageVendorLink.create({
              data: {
                canonicalPackageId: canonical.id,
                vendorPackageId: vp.id,
                vendorPriceINR: priceINR,
                isCheapest,
                isDisabledByAdmin: false,
                lastCheckedAt: new Date(),
              },
            });
            counts.vendorLinks++;
          }
        }

        // ── 7. Price History (1 entry per canonical package) ──────────────────
        const existingHistory = await tx.priceHistory.findFirst({
          where: { canonicalPackageId: canonical.id },
        });
        if (!existingHistory) {
          await tx.priceHistory.create({
            data: {
              canonicalPackageId: canonical.id,
              oldPriceINR: 0,
              newPriceINR: finalPriceINR,
              vendorPriceINR: winningVendorPriceINR,
              exchangeRateUsed: USD_TO_INR,
              marginRuleId: rule.id,
              marginPercent: rule.marginPercent,
              marginAmountINR,
              wasManualOverride: false,
              overrideReason: null,
              reason: 'sync',
              triggeredBy: 'seed',
            },
          });
          counts.priceHistory++;
        }
      }
    }

    // ── 8. Sample Orders ──────────────────────────────────────────────────────
    // Pick the first canonical package (US, 1GB/7days) for both sample orders
    const samplePackage = await tx.canonicalPackage.findFirst({
      where: { country: { isoCode: 'US' }, dataGB: 1, durationDays: 7 },
    });

    if (samplePackage) {
      // Order 1: pending
      const pendingExists = await tx.order.findFirst({
        where: { canonicalPackageId: samplePackage.id, paymentStatus: 'pending', customerEmail: 'demo-pending@navyesim.com' },
      });
      if (!pendingExists) {
        await tx.order.create({
          data: {
            canonicalPackageId: samplePackage.id,
            customerEmail: 'demo-pending@navyesim.com',
            paymentMethod: 'upi',
            paymentStatus: 'pending',
            paymentReference: null,
            esimQrData: null,
            totalINR: samplePackage.finalPriceINR,
          },
        });
        counts.orders++;
      }

      // Order 2: paid with dummy eSIM QR data
      const paidExists = await tx.order.findFirst({
        where: { canonicalPackageId: samplePackage.id, paymentStatus: 'paid', customerEmail: 'demo-paid@navyesim.com' },
      });
      if (!paidExists) {
        await tx.order.create({
          data: {
            canonicalPackageId: samplePackage.id,
            customerEmail: 'demo-paid@navyesim.com',
            paymentMethod: 'googlepay',
            paymentStatus: 'paid',
            paymentReference: 'DEMO_REF_001',
            esimQrData: 'LPA:1$demo.esim.provider$DEMO_ACTIVATION_CODE_12345',
            totalINR: samplePackage.finalPriceINR,
          },
        });
        counts.orders++;
      }
    }

  }); // end $transaction

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('✅ Seed complete!\n');
  console.log('Records created/updated:');
  console.log(`  Admin users:          ${counts.admin}`);
  console.log(`  Countries:            ${counts.countries}`);
  console.log(`  Vendors:              ${counts.vendors}`);
  console.log(`  Exchange rates:       ${counts.exchangeRates}`);
  console.log(`  Margin rules:         ${counts.marginRules}`);
  console.log(`  Canonical packages:   ${counts.canonicalPackages}`);
  console.log(`  Vendor packages:      ${counts.vendorPackages}`);
  console.log(`  Vendor links:         ${counts.vendorLinks}`);
  console.log(`  Price history rows:   ${counts.priceHistory}`);
  console.log(`  Sample orders:        ${counts.orders}`);
  console.log(`\nTotal: ${Object.values(counts).reduce((a, b) => a + b, 0)} records`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
