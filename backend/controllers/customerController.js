/**
 * Customer-facing controller (M17 — Public Customer API).
 * RULE: Never expose vendor prices, margins, vendor IDs, or internal data.
 */

const prisma = require('../models/index');

/**
 * GET /api/countries
 * Returns active countries: id, name, isoCode, flagEmoji
 */
async function getCountries(req, res, next) {
  try {
    const countries = await prisma.country.findMany({
      where:   { isActive: true },
      orderBy: { name: 'asc' },
      select:  { id: true, name: true, isoCode: true, flagEmoji: true },
    });
    return res.json({ countries });
  } catch (err) { next(err); }
}

/**
 * GET /api/packages?countryId=X
 * Returns active canonical packages for a country.
 * Public fields: id, name, dataGB, durationDays, priceINR, badge
 * NEVER includes: finalPriceINR by name, vendor prices, margins, vendor IDs,
 *                 winningVendorPriceINR, sortOrder, or any internal fields.
 */
async function getPackages(req, res, next) {
  try {
    const { countryId } = req.query;
    if (!countryId) {
      return res.status(400).json({ error: 'countryId query parameter is required.' });
    }

    const rows = await prisma.canonicalPackage.findMany({
      where: {
        countryId,
        isActive:      true,
        finalPriceINR: { gt: 0 },
      },
      orderBy: [{ sortOrder: 'asc' }, { dataGB: 'asc' }, { durationDays: 'asc' }],
      select: {
        id:            true,
        name:          true,
        dataGB:        true,
        durationDays:  true,
        finalPriceINR: true,  // fetched internally, exposed as priceINR
        badge:         true,
      },
    });

    // Rename finalPriceINR → priceINR so internal field names are never exposed
    const packages = rows.map(({ finalPriceINR, ...rest }) => ({
      ...rest,
      priceINR: finalPriceINR,
    }));

    return res.json({ packages });
  } catch (err) { next(err); }
}

module.exports = { getCountries, getPackages };
