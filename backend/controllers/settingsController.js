/**
 * Settings controller (M16 — Settings API).
 * Payment config is served from environment variables (no Settings model in schema).
 */

const prisma = require('../models/index');
const { fetchAndUpdateRates } = require('../jobs/exchangeRates');
const { repriceCanonicalPackages } = require('../pricing/marginEngine');
const { recomputeCheapest } = require('../pricing/matchEngine');

// ─────────────────────────────────────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/settings/payment (public)
 * Returns payment config from environment variables.
 */
async function getPaymentConfig(req, res, next) {
  try {
    return res.json({
      upiId:               process.env.UPI_ID               ?? null,
      upiQrString:         process.env.UPI_QR_STRING         ?? null,
      googlePayMerchantId: process.env.GOOGLEPAY_MERCHANT_ID ?? null,
    });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

async function getSettings(req, res, next) {
  try {
    return res.json({
      exchangeRateBufferPercent: parseFloat(process.env.EXCHANGE_RATE_BUFFER_PERCENT || '0'),
      usdToINRFallback:          parseFloat(process.env.USD_TO_INR_FALLBACK || '83.5'),
      syncCronEnabled:           process.env.SYNC_CRON_ENABLED === 'true',
      exchangeRateCron:          process.env.EXCHANGE_RATE_CRON || '0 */6 * * *',
      uploadMaxSizeMB:           parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10),
    });
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  return res.status(501).json({
    error: 'Settings are managed via environment variables. DB-backed settings not yet implemented.',
  });
}

async function getExchangeRates(req, res, next) {
  try {
    const rates = await prisma.exchangeRate.findMany({ orderBy: { fromCurrency: 'asc' } });
    return res.json({ rates });
  } catch (err) { next(err); }
}

async function updateExchangeRate(req, res, next) {
  try {
    const { currency } = req.params;
    const { toINR, isPinned } = req.body;
    if (typeof toINR !== 'number' || toINR <= 0) {
      return res.status(400).json({ error: 'toINR must be a positive number.' });
    }
    const rate = await prisma.exchangeRate.upsert({
      where:  { fromCurrency: currency.toUpperCase() },
      update: {
        toINR, source: 'manual', updatedBy: 'admin_manual', appliedAt: new Date(),
        ...(isPinned !== undefined && { isPinned: Boolean(isPinned) }),
      },
      create: {
        fromCurrency: currency.toUpperCase(), toINR,
        source: 'manual', isPinned: isPinned ?? false,
        updatedBy: 'admin_manual', fetchedAt: new Date(), appliedAt: new Date(),
      },
    });
    return res.json({ rate });
  } catch (err) { next(err); }
}

async function refreshExchangeRates(req, res, next) {
  try {
    const summary = await fetchAndUpdateRates(prisma);
    return res.json({ ok: true, summary });
  } catch (err) { next(err); }
}

async function reconvertAllPrices(req, res, next) {
  try {
    const rates = await prisma.exchangeRate.findMany();
    const rateMap = {};
    for (const r of rates) rateMap[r.fromCurrency] = r.toINR;

    const vendorPackages = await prisma.vendorPackage.findMany({ where: { isActive: true } });
    let updated = 0;
    const errors = [];

    for (const pkg of vendorPackages) {
      const toINR = rateMap[pkg.originalCurrency];
      if (!toINR) { errors.push(`No rate for ${pkg.originalCurrency} (id=${pkg.id})`); continue; }
      const isJPY = pkg.originalCurrency === 'JPY';
      const convertedPriceINR = isJPY
        ? Math.round(pkg.originalPrice * toINR * 100)
        : Math.round(pkg.originalPrice * toINR);
      try {
        await prisma.vendorPackage.update({ where: { id: pkg.id }, data: { convertedPriceINR, isMapped: false } });
        updated++;
      } catch (e) { errors.push(`id=${pkg.id}: ${e.message}`); }
    }

    const cheapestResult  = await recomputeCheapest(prisma).catch(e => ({ errors: [e.message] }));
    const repriceSummary  = await repriceCanonicalPackages(prisma, {
      reason: 'exchange_rate_update',
      triggeredBy: `admin_${req.admin.id}`,
    }).catch(e => ({ errors: [e.message] }));

    return res.json({ ok: true, vendorPackagesUpdated: updated, errors, cheapestResult, repriceSummary });
  } catch (err) { next(err); }
}

module.exports = {
  getPaymentConfig,
  getSettings, updateSettings,
  getExchangeRates, updateExchangeRate, refreshExchangeRates, reconvertAllPrices,
};
