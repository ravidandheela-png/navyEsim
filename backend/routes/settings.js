const { Router } = require('express');
const router = Router();
const auth = require('../middleware/auth');

// GET /api/settings/payment → public endpoint (upiId, upiQrString, googlePayMerchantId)
router.get('/payment', (req, res, next) => {
  // TODO: implement via settingsController.getPaymentConfig
  next();
});

// Admin settings routes (JWT required)
router.get('/', auth, (req, res, next) => { next(); });
router.put('/', auth, (req, res, next) => { next(); });

// Exchange rates
router.get('/exchange-rates', auth, (req, res, next) => { next(); });
router.put('/exchange-rates/:currency', auth, (req, res, next) => { next(); });
router.post('/exchange-rates/refresh', auth, (req, res, next) => { next(); });
router.post('/reconvert', auth, (req, res, next) => { next(); });

module.exports = router;
