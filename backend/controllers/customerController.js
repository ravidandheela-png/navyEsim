/**
 * Customer-facing controller.
 * RULE: Never expose vendor prices, margins, vendor IDs, or internal data.
 */

/**
 * GET /api/countries
 * Returns active countries: id, name, isoCode, flagEmoji
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getCountries(req, res, next) {
  // TODO: query prisma.country.findMany({ where: { isActive: true } })
}

/**
 * GET /api/packages?countryId=X
 * Returns active canonical packages: id, name, dataGB, durationDays, priceINR, badge
 * NEVER include vendor prices, margins, vendor IDs
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getPackages(req, res, next) {
  // TODO: query prisma.canonicalPackage.findMany filtered by countryId + isActive
}

module.exports = { getCountries, getPackages };
