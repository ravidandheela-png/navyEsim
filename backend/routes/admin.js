const { Router } = require('express');
const router = Router();
const auth = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const adminController = require('../controllers/adminController');

// POST /api/admin/login (no auth required)
router.post('/login', adminController.login);

// All routes below require JWT auth
router.use(auth);

// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// ── M12 Countries ──────────────────────────────────────────────────────────
router.get('/countries',      adminController.getCountries);
router.post('/countries',     adminController.createCountry);
router.put('/countries/:id',  adminController.updateCountry);
router.delete('/countries/:id', adminController.deleteCountry);

// ── M13 Vendors ────────────────────────────────────────────────────────────
router.get('/vendors',                    adminController.getVendors);
router.post('/vendors',                   adminController.createVendor);
router.put('/vendors/:id',                adminController.updateVendor);
router.delete('/vendors/:id',             adminController.deleteVendor);
router.post('/vendors/:id/sync',          adminController.syncVendor);
router.post('/vendors/:id/upload',        upload.single('file'), handleUploadError, adminController.uploadVendorSheet);
router.get('/vendors/:id/synclogs',       adminController.getVendorSyncLogs);

// ── M14 Packages ───────────────────────────────────────────────────────────
// Note: /packages/unmatched and /packages/rematch must come BEFORE /packages/:id
router.get('/packages/unmatched',         adminController.getUnmatchedPackages);
router.post('/packages/rematch',          adminController.rematchPackages);
router.post('/packages/reprice',          adminController.repricePackages);
router.get('/packages',                   adminController.getPackages);
router.post('/packages',                  adminController.createPackage);
router.put('/packages/:id',               adminController.updatePackage);
router.delete('/packages/:id',            adminController.deletePackage);
router.put('/packages/:id/price',         adminController.overridePackagePrice);
router.put('/packages/:id/vendor-link/:linkId', adminController.updateVendorLink);

// ── M15 Margin Rules ───────────────────────────────────────────────────────
// Note: /margin-rules/preview must come BEFORE /margin-rules/:id
router.post('/margin-rules/preview',      adminController.previewMarginRules);
router.get('/margin-rules',               adminController.getMarginRules);
router.post('/margin-rules',              adminController.createMarginRule);
router.put('/margin-rules/:id',           adminController.updateMarginRule);
router.delete('/margin-rules/:id',        adminController.deleteMarginRule);

// ── M16 Orders ─────────────────────────────────────────────────────────────
router.get('/orders',                     adminController.getOrders);
router.get('/orders/:id',                 adminController.getOrderById);
router.put('/orders/:id',                 adminController.updateOrder);

// ── Price history ──────────────────────────────────────────────────────────
router.get('/price-history/:canonicalPackageId', adminController.getPriceHistory);

module.exports = router;
