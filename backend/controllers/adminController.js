/**
 * Admin controller — all admin panel operations (JWT protected).
 * M12 Countries, M13 Vendors, M14 Packages, M15 Margin Rules, M16 Orders/Settings.
 */

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const prisma = require('../models/index');

const { syncVendors }               = require('../jobs/syncVendors');
const { runMatchPackages }          = require('../jobs/matchPackages');
const { repriceCanonicalPackages, applyMarginRule } = require('../pricing/marginEngine');
const { parseVendorSheet }          = require('../vendors/sheetParser');
const { upload, handleUploadError } = require('../middleware/upload');

// ── Helper ────────────────────────────────────────────────────────────────────

/** Create a standard 404 error */
function notFound(msg) { const e = new Error(msg); e.status = 404; return e; }
/** Create a standard 400 error */
function badRequest(msg) { const e = new Error(msg); e.status = 400; return e; }

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const admin = await prisma.admin.findUnique({ where: { email } });
    const DUMMY_HASH = '$2b$12$invalidhashpaddingtopreventimingtimingattacks000000000';
    const hashToCompare = admin ? admin.passwordHash : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);
    if (!admin || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.status(200).json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

async function getDashboard(req, res, next) {
  try {
    const [totalOrders, paidOrders, activeCountries, activePackages, last10Orders] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { paymentStatus: 'paid' } }),
        prisma.country.count({ where: { isActive: true } }),
        prisma.canonicalPackage.count({ where: { isActive: true } }),
        prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, paymentStatus: true, totalINR: true, createdAt: true, customerEmail: true },
        }),
      ]);

    const revenueResult = await prisma.order.aggregate({
      _sum: { totalINR: true },
      where: { paymentStatus: 'paid' },
    });

    return res.json({
      totalOrders,
      paidOrders,
      revenueINR: revenueResult._sum.totalINR ?? 0,
      activeCountries,
      activePackages,
      last10Orders,
    });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// M12 — Countries
// ─────────────────────────────────────────────────────────────────────────────

async function getCountries(req, res, next) {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ countries });
  } catch (err) { next(err); }
}

async function createCountry(req, res, next) {
  try {
    const { name, isoCode, flagEmoji, isActive } = req.body;
    if (!name || !isoCode || !flagEmoji) {
      return res.status(400).json({ error: 'name, isoCode, and flagEmoji are required.' });
    }
    const country = await prisma.country.create({
      data: { name, isoCode: isoCode.toUpperCase(), flagEmoji, isActive: isActive ?? true },
    });
    return res.status(201).json({ country });
  } catch (err) { next(err); }
}

async function updateCountry(req, res, next) {
  try {
    const { id } = req.params;
    const { name, isoCode, flagEmoji, isActive } = req.body;
    const country = await prisma.country.update({
      where: { id },
      data: {
        ...(name      !== undefined && { name }),
        ...(isoCode   !== undefined && { isoCode: isoCode.toUpperCase() }),
        ...(flagEmoji !== undefined && { flagEmoji }),
        ...(isActive  !== undefined && { isActive }),
      },
    });
    return res.json({ country });
  } catch (err) { next(err); }
}

async function deleteCountry(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.country.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// M13 — Vendors
// ─────────────────────────────────────────────────────────────────────────────

async function getVendors(req, res, next) {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, slug: true, sourceType: true,
        apiBaseUrl: true, apiAuthType: true, apiAuthHeaderName: true,
        syncFrequencyHours: true, isActive: true,
        lastSyncedAt: true, syncStatus: true, syncErrorMessage: true, createdAt: true,
        // Never expose apiKey
      },
    });
    return res.json({ vendors });
  } catch (err) { next(err); }
}

async function createVendor(req, res, next) {
  try {
    const {
      name, slug, sourceType, apiBaseUrl, apiKey,
      apiAuthType, apiAuthHeaderName, columnMappingJson, syncFrequencyHours, isActive,
    } = req.body;
    if (!name || !slug || !sourceType) {
      return res.status(400).json({ error: 'name, slug, and sourceType are required.' });
    }
    const vendor = await prisma.vendor.create({
      data: {
        name, slug: slug.toLowerCase(),
        sourceType, apiBaseUrl, apiKey,
        apiAuthType, apiAuthHeaderName, columnMappingJson,
        syncFrequencyHours: syncFrequencyHours ?? 0,
        isActive: isActive ?? true,
      },
    });
    // Never return apiKey
    const { apiKey: _k, ...safe } = vendor;
    return res.status(201).json({ vendor: safe });
  } catch (err) { next(err); }
}

async function updateVendor(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name, slug, sourceType, apiBaseUrl, apiKey,
      apiAuthType, apiAuthHeaderName, columnMappingJson, syncFrequencyHours, isActive,
    } = req.body;
    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(name               !== undefined && { name }),
        ...(slug               !== undefined && { slug: slug.toLowerCase() }),
        ...(sourceType         !== undefined && { sourceType }),
        ...(apiBaseUrl         !== undefined && { apiBaseUrl }),
        ...(apiKey             !== undefined && { apiKey }),
        ...(apiAuthType        !== undefined && { apiAuthType }),
        ...(apiAuthHeaderName  !== undefined && { apiAuthHeaderName }),
        ...(columnMappingJson  !== undefined && { columnMappingJson }),
        ...(syncFrequencyHours !== undefined && { syncFrequencyHours }),
        ...(isActive           !== undefined && { isActive }),
      },
    });
    const { apiKey: _k, ...safe } = vendor;
    return res.json({ vendor: safe });
  } catch (err) { next(err); }
}

async function deleteVendor(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.vendor.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) { next(err); }
}

/** POST /api/admin/vendors/:id/sync — trigger manual sync for one vendor */
async function syncVendor(req, res, next) {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return next(notFound('Vendor not found.'));
    if (!vendor.isActive) return res.status(400).json({ error: 'Vendor is not active.' });

    // Run sync for this single vendor by passing a filtered list
    // syncVendors loads all active vendors — we override by calling the pipeline directly
    const { getAdapter }               = require('../vendors');
    const { matchPackages }            = require('../pricing/matchEngine');

    const syncStartedAt = new Date();
    let packagesAdded = 0, packagesUpdated = 0, packagesStale = 0;
    const errors = [];

    try {
      await prisma.vendor.update({ where: { id }, data: { syncStatus: 'syncing' } });
      const adapter  = getAdapter(vendor);
      const rawItems = await adapter.fetchPackages(vendor);
      const items    = Array.isArray(rawItems) ? rawItems : (rawItems?.normalized ?? []);

      for (const item of items) {
        if (!item.vendorPackageId) continue;
        try {
          const existing = await prisma.vendorPackage.findUnique({
            where: { vendorId_vendorPackageId: { vendorId: id, vendorPackageId: item.vendorPackageId } },
          });
          if (!existing) {
            await prisma.vendorPackage.create({ data: {
              vendorId: id, vendorPackageId: item.vendorPackageId,
              vendorCountryCode: item.vendorCountryCode ?? '',
              countryId: item.countryId ?? null,
              name: item.name ?? item.vendorPackageId,
              dataGB: item.dataGB ?? 0, durationDays: item.durationDays ?? 0,
              originalPrice: item.originalPrice ?? 0, originalCurrency: item.originalCurrency ?? 'USD',
              convertedPriceINR: item.convertedPriceINR ?? 0,
              rawPayload: JSON.stringify(item.rawPayload ?? item),
              isActive: true, isMapped: false, lastSeenAt: new Date(),
            }});
            packagesAdded++;
          } else {
            const priceChanged = existing.convertedPriceINR !== (item.convertedPriceINR ?? 0);
            await prisma.vendorPackage.update({ where: { id: existing.id }, data: {
              convertedPriceINR: item.convertedPriceINR ?? existing.convertedPriceINR,
              originalPrice: item.originalPrice ?? existing.originalPrice,
              rawPayload: JSON.stringify(item.rawPayload ?? item),
              isActive: true, lastSeenAt: new Date(),
              isMapped: priceChanged ? false : existing.isMapped,
            }});
            priceChanged ? packagesUpdated++ : packagesStale++;
          }
        } catch (e) { errors.push(e.message); }
      }

      await prisma.syncLog.create({ data: {
        vendorId: id, startedAt: syncStartedAt, finishedAt: new Date(),
        packagesAdded, packagesUpdated, packagesStale, packagesUnmapped: 0,
        errorCount: errors.length, errorDetails: errors.length ? errors.join('; ') : null,
        status: errors.length ? 'partial' : 'success',
      }});
      await prisma.vendor.update({ where: { id }, data: {
        syncStatus: 'success', lastSyncedAt: new Date(), syncErrorMessage: null,
      }});
    } catch (vendorErr) {
      errors.push(vendorErr.message);
      await prisma.syncLog.create({ data: {
        vendorId: id, startedAt: syncStartedAt, finishedAt: new Date(),
        packagesAdded, packagesUpdated, packagesStale, packagesUnmapped: 0,
        errorCount: 1, errorDetails: vendorErr.message, status: 'failed',
      }}).catch(() => {});
      await prisma.vendor.update({ where: { id }, data: {
        syncStatus: 'error', syncErrorMessage: vendorErr.message,
      }}).catch(() => {});
    }

    // Run match + reprice after single-vendor sync
    const matchSummary = await matchPackages(prisma).catch(e => ({ errors: [e.message] }));
    const repriceSummary = await repriceCanonicalPackages(prisma, { reason: 'sync', triggeredBy: `admin_sync_vendor_${id}` }).catch(e => ({ errors: [e.message] }));

    return res.json({
      ok: true,
      packagesAdded, packagesUpdated, packagesStale,
      matchSummary, repriceSummary,
      errors,
    });
  } catch (err) { next(err); }
}

/** POST /api/admin/vendors/:id/upload — upload a vendor sheet */
async function uploadVendorSheet(req, res, next) {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return next(notFound('Vendor not found.'));
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });

    const { parseVendorSheet } = require('../vendors/sheetParser');
    const { normalizeVendorPackage } = require('../vendors/normalizer');

    let mapping = {};
    try { mapping = vendor.columnMappingJson ? JSON.parse(vendor.columnMappingJson) : {}; } catch (_) {}

    const { rows, errors: parseErrors } = await parseVendorSheet(req.file.path, mapping);

    let added = 0, updated = 0, skipped = 0;
    const errors = [...parseErrors];

    for (const row of rows) {
      const normalized = normalizeVendorPackage(row, vendor);
      if (!normalized || !normalized.vendorPackageId) { skipped++; continue; }
      try {
        const existing = await prisma.vendorPackage.findUnique({
          where: { vendorId_vendorPackageId: { vendorId: id, vendorPackageId: normalized.vendorPackageId } },
        });
        if (!existing) {
          await prisma.vendorPackage.create({ data: {
            vendorId: id, ...normalized,
            rawPayload: JSON.stringify(row),
            sourceFile: req.file.originalname,
            isActive: true, isMapped: false, lastSeenAt: new Date(),
          }});
          added++;
        } else {
          await prisma.vendorPackage.update({ where: { id: existing.id }, data: {
            ...normalized, rawPayload: JSON.stringify(row),
            sourceFile: req.file.originalname, lastSeenAt: new Date(),
            isMapped: existing.convertedPriceINR !== normalized.convertedPriceINR ? false : existing.isMapped,
          }});
          updated++;
        }
      } catch (e) { errors.push(e.message); skipped++; }
    }

    return res.json({ ok: true, added, updated, skipped, errors });
  } catch (err) { next(err); }
}

async function getVendorSyncLogs(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const logs = await prisma.syncLog.findMany({
      where: { vendorId: id },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return res.json({ logs });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// M14 — Packages (CanonicalPackage admin)
// ─────────────────────────────────────────────────────────────────────────────

async function getPackages(req, res, next) {
  try {
    const { countryId, isActive, page = '1', limit = '50' } = req.query;
    const take = Math.min(parseInt(limit, 10), 200);
    const skip = (Math.max(parseInt(page, 10), 1) - 1) * take;

    const where = {};
    if (countryId) where.countryId = countryId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [packages, total] = await Promise.all([
      prisma.canonicalPackage.findMany({
        where, skip, take,
        orderBy: [{ countryId: 'asc' }, { dataGB: 'asc' }, { durationDays: 'asc' }],
        include: {
          country: { select: { id: true, name: true, isoCode: true, flagEmoji: true } },
          vendorLinks: {
            include: {
              vendorPackage: {
                select: { id: true, vendorId: true, name: true, convertedPriceINR: true, isActive: true },
              },
            },
          },
        },
      }),
      prisma.canonicalPackage.count({ where }),
    ]);

    return res.json({ packages, total, page: parseInt(page, 10), limit: take });
  } catch (err) { next(err); }
}

async function createPackage(req, res, next) {
  try {
    const { countryId, name, dataGB, durationDays, isActive, badge, sortOrder } = req.body;
    if (!countryId || !name || dataGB === undefined || !durationDays) {
      return res.status(400).json({ error: 'countryId, name, dataGB, and durationDays are required.' });
    }
    const pkg = await prisma.canonicalPackage.create({
      data: {
        countryId, name,
        dataGB: parseFloat(dataGB),
        durationDays: parseInt(durationDays, 10),
        isActive: isActive ?? true,
        badge: badge ?? null,
        sortOrder: sortOrder ?? 0,
      },
    });
    return res.status(201).json({ package: pkg });
  } catch (err) { next(err); }
}

async function updatePackage(req, res, next) {
  try {
    const { id } = req.params;
    const { name, dataGB, durationDays, isActive, badge, sortOrder } = req.body;
    const pkg = await prisma.canonicalPackage.update({
      where: { id },
      data: {
        ...(name         !== undefined && { name }),
        ...(dataGB       !== undefined && { dataGB: parseFloat(dataGB) }),
        ...(durationDays !== undefined && { durationDays: parseInt(durationDays, 10) }),
        ...(isActive     !== undefined && { isActive }),
        ...(badge        !== undefined && { badge }),
        ...(sortOrder    !== undefined && { sortOrder }),
      },
    });
    return res.json({ package: pkg });
  } catch (err) { next(err); }
}

async function deletePackage(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.canonicalPackage.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) { next(err); }
}

async function getUnmatchedPackages(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const packages = await prisma.vendorPackage.findMany({
      where: { isMapped: false, isActive: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { vendor: { select: { id: true, name: true, slug: true } } },
    });
    return res.json({ packages, count: packages.length });
  } catch (err) { next(err); }
}

async function rematchPackages(req, res, next) {
  try {
    const summary = await runMatchPackages(prisma);
    return res.json({ ok: true, summary });
  } catch (err) { next(err); }
}

async function repricePackages(req, res, next) {
  try {
    const { reason = 'rule_change', triggeredBy } = req.body || {};
    const summary = await repriceCanonicalPackages(prisma, {
      reason,
      triggeredBy: triggeredBy || `admin_${req.admin.id}`,
    });
    return res.json({ ok: true, summary });
  } catch (err) { next(err); }
}

/** PUT /api/admin/packages/:id/price — set manual price override */
async function overridePackagePrice(req, res, next) {
  try {
    const { id } = req.params;
    const { manualPriceINR, manualOverrideReason, disable } = req.body;

    if (disable) {
      // Remove override
      const pkg = await prisma.canonicalPackage.update({
        where: { id },
        data: { manualPriceOverride: false, manualPriceINR: null, manualOverrideReason: null },
      });
      return res.json({ package: pkg });
    }

    if (manualPriceINR === undefined || typeof manualPriceINR !== 'number' || manualPriceINR < 0) {
      return res.status(400).json({ error: 'manualPriceINR must be a non-negative number (paise).' });
    }

    const pkg = await prisma.canonicalPackage.update({
      where: { id },
      data: {
        manualPriceOverride: true,
        manualPriceINR,
        manualOverrideReason: manualOverrideReason ?? null,
        finalPriceINR: manualPriceINR,
      },
    });
    return res.json({ package: pkg });
  } catch (err) { next(err); }
}

/** PUT /api/admin/packages/:id/vendor-link/:linkId — enable/disable a vendor link */
async function updateVendorLink(req, res, next) {
  try {
    const { linkId } = req.params;
    const { isDisabledByAdmin } = req.body;
    if (isDisabledByAdmin === undefined) {
      return res.status(400).json({ error: 'isDisabledByAdmin (boolean) is required.' });
    }
    const link = await prisma.canonicalPackageVendorLink.update({
      where: { id: linkId },
      data: { isDisabledByAdmin: Boolean(isDisabledByAdmin) },
    });
    return res.json({ link });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// M15 — Margin Rules
// ─────────────────────────────────────────────────────────────────────────────

async function getMarginRules(req, res, next) {
  try {
    const rules = await prisma.marginRule.findMany({
      orderBy: { priority: 'asc' },
    });
    return res.json({ rules });
  } catch (err) { next(err); }
}

async function createMarginRule(req, res, next) {
  try {
    const {
      name, priority, ruleType, priceMinINR, priceMaxINR,
      canonicalPackageId, marginPercent, roundingRule, isActive,
    } = req.body;
    if (!name || priority === undefined || !ruleType || marginPercent === undefined) {
      return res.status(400).json({ error: 'name, priority, ruleType, and marginPercent are required.' });
    }
    if (!['price_range', 'package_specific', 'global'].includes(ruleType)) {
      return res.status(400).json({ error: 'ruleType must be price_range, package_specific, or global.' });
    }
    const rule = await prisma.marginRule.create({
      data: {
        name, priority: parseInt(priority, 10), ruleType,
        priceMinINR: priceMinINR ?? null,
        priceMaxINR: priceMaxINR ?? null,
        canonicalPackageId: canonicalPackageId ?? null,
        marginPercent: parseFloat(marginPercent),
        roundingRule: roundingRule ?? 'none',
        isActive: isActive ?? true,
      },
    });
    return res.status(201).json({ rule });
  } catch (err) { next(err); }
}

async function updateMarginRule(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name, priority, ruleType, priceMinINR, priceMaxINR,
      canonicalPackageId, marginPercent, roundingRule, isActive,
    } = req.body;
    const rule = await prisma.marginRule.update({
      where: { id },
      data: {
        ...(name               !== undefined && { name }),
        ...(priority           !== undefined && { priority: parseInt(priority, 10) }),
        ...(ruleType           !== undefined && { ruleType }),
        ...(priceMinINR        !== undefined && { priceMinINR }),
        ...(priceMaxINR        !== undefined && { priceMaxINR }),
        ...(canonicalPackageId !== undefined && { canonicalPackageId }),
        ...(marginPercent      !== undefined && { marginPercent: parseFloat(marginPercent) }),
        ...(roundingRule       !== undefined && { roundingRule }),
        ...(isActive           !== undefined && { isActive }),
      },
    });
    return res.json({ rule });
  } catch (err) { next(err); }
}

async function deleteMarginRule(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.marginRule.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) { next(err); }
}

/**
 * POST /api/admin/margin-rules/preview
 * Preview what a set of rules would produce for a given vendor price.
 * Body: { vendorPriceINR, canonicalPackageId? }
 */
async function previewMarginRules(req, res, next) {
  try {
    const { vendorPriceINR, canonicalPackageId = null } = req.body;
    if (typeof vendorPriceINR !== 'number' || vendorPriceINR < 0) {
      return res.status(400).json({ error: 'vendorPriceINR must be a non-negative number (paise).' });
    }
    const rules = await prisma.marginRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });
    try {
      const result = applyMarginRule(vendorPriceINR, rules, canonicalPackageId);
      return res.json({
        vendorPriceINR,
        canonicalPackageId,
        matchedRule: {
          id: result.rule.id, name: result.rule.name,
          ruleType: result.rule.ruleType, priority: result.rule.priority,
        },
        marginPercent:   result.marginPercent,
        marginAmountINR: result.marginAmountINR,
        rawFinalINR:     result.rawFinalINR,
        finalPriceINR:   result.finalPriceINR,
      });
    } catch (e) {
      return res.status(422).json({ error: e.message });
    }
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// M16 — Orders (admin view)
// ─────────────────────────────────────────────────────────────────────────────

async function getOrders(req, res, next) {
  try {
    const { paymentStatus, page = '1', limit = '50' } = req.query;
    const take = Math.min(parseInt(limit, 10), 200);
    const skip = (Math.max(parseInt(page, 10), 1) - 1) * take;
    const where = paymentStatus ? { paymentStatus } : {};
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          canonicalPackage: {
            select: { id: true, name: true, dataGB: true, durationDays: true,
              country: { select: { name: true, isoCode: true } } },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return res.json({ orders, total, page: parseInt(page, 10), limit: take });
  } catch (err) { next(err); }
}

async function getOrderById(req, res, next) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        canonicalPackage: {
          select: { id: true, name: true, dataGB: true, durationDays: true,
            country: { select: { name: true, isoCode: true } } },
        },
      },
    });
    if (!order) return next(notFound('Order not found.'));
    return res.json({ order });
  } catch (err) { next(err); }
}

async function updateOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentReference, esimQrData } = req.body;
    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(paymentStatus    !== undefined && { paymentStatus }),
        ...(paymentReference !== undefined && { paymentReference }),
        ...(esimQrData       !== undefined && { esimQrData }),
      },
    });
    return res.json({ order });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Price history
// ─────────────────────────────────────────────────────────────────────────────

async function getPriceHistory(req, res, next) {
  try {
    const { canonicalPackageId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const history = await prisma.priceHistory.findMany({
      where: { canonicalPackageId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return res.json({ history });
  } catch (err) { next(err); }
}

module.exports = {
  login, getDashboard,
  getCountries, createCountry, updateCountry, deleteCountry,
  getVendors, createVendor, updateVendor, deleteVendor,
  syncVendor, uploadVendorSheet, getVendorSyncLogs,
  getPackages, createPackage, updatePackage, deletePackage,
  getUnmatchedPackages, rematchPackages, repricePackages,
  overridePackagePrice, updateVendorLink,
  getMarginRules, createMarginRule, updateMarginRule, deleteMarginRule, previewMarginRules,
  getOrders, getOrderById, updateOrder,
  getPriceHistory,
};
