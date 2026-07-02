/**
 * Settings controller — payment config and exchange rates.
 */

/**
 * GET /api/settings/payment (public)
 * Returns { upiId, upiQrString, googlePayMerchantId }
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getPaymentConfig(req, res, next) {
  // TODO: prisma.settings.findFirst() and return only public payment fields
}

/** @param {import('express').Request} req @param {import('express').Response} res @param {import('express').NextFunction} next */
async function getSettings(req, res, next) { /* TODO */ }
async function updateSettings(req, res, next) { /* TODO */ }

// Exchange rates
async function getExchangeRates(req, res, next) { /* TODO */ }
async function updateExchangeRate(req, res, next) { /* TODO */ }
async function refreshExchangeRates(req, res, next) { /* TODO */ }
async function reconvertAllPrices(req, res, next) { /* TODO */ }

module.exports = {
  getPaymentConfig,
  getSettings, updateSettings,
  getExchangeRates, updateExchangeRate, refreshExchangeRates, reconvertAllPrices,
};
