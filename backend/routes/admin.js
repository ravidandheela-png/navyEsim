const { Router } = require('express');
const router = Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// POST /api/admin/login (no auth required)
router.post('/login', adminController.login);

// All routes below require JWT auth
router.use(auth);

// GET /api/admin/dashboard
router.get('/dashboard', (req, res, next) => {
  // TODO: implement via adminController.getDashboard
  next();
});

// CRUD /api/admin/countries
router.get('/countries', (req, res, next) => { next(); });
router.post('/countries', (req, res, next) => { next(); });
router.put('/countries/:id', (req, res, next) => { next(); });
router.delete('/countries/:id', (req, res, next) => { next(); });

// CRUD /api/admin/vendors
router.get('/vendors', (req, res, next) => { next(); });
router.post('/vendors', (req, res, next) => { next(); });
router.put('/vendors/:id', (req, res, next) => { next(); });
router.delete('/vendors/:id', (req, res, next) => { next(); });
router.post('/vendors/:id/sync', (req, res, next) => { next(); });
router.post('/vendors/:id/upload', (req, res, next) => { next(); });
router.get('/vendors/:id/synclogs', (req, res, next) => { next(); });

// CRUD /api/admin/packages
router.get('/packages', (req, res, next) => { next(); });
router.post('/packages', (req, res, next) => { next(); });
router.put('/packages/:id', (req, res, next) => { next(); });
router.delete('/packages/:id', (req, res, next) => { next(); });
router.get('/packages/unmatched', (req, res, next) => { next(); });
router.post('/packages/rematch', (req, res, next) => { next(); });
router.post('/packages/reprice', (req, res, next) => { next(); });
router.put('/packages/:id/price', (req, res, next) => { next(); });
router.put('/packages/:id/vendor-link/:linkId', (req, res, next) => { next(); });

// CRUD /api/admin/margin-rules
router.get('/margin-rules', (req, res, next) => { next(); });
router.post('/margin-rules', (req, res, next) => { next(); });
router.put('/margin-rules/:id', (req, res, next) => { next(); });
router.delete('/margin-rules/:id', (req, res, next) => { next(); });
router.post('/margin-rules/preview', (req, res, next) => { next(); });

// Orders
router.get('/orders', (req, res, next) => { next(); });
router.get('/orders/:id', (req, res, next) => { next(); });
router.put('/orders/:id', (req, res, next) => { next(); });

// Price history
router.get('/price-history/:canonicalPackageId', (req, res, next) => { next(); });

module.exports = router;
