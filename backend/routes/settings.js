const { Router } = require('express');
const router = Router();
const auth = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

// GET /api/settings/payment → public endpoint
router.get('/payment', settingsController.getPaymentConfig);

// Admin settings routes (JWT required)
router.get('/',    auth, settingsController.getSettings);
router.put('/',    auth, settingsController.updateSettings);

// Exchange rates
router.get('/exchange-rates',              auth, settingsController.getExchangeRates);
router.put('/exchange-rates/:currency',    auth, settingsController.updateExchangeRate);
router.post('/exchange-rates/refresh',     auth, settingsController.refreshExchangeRates);
router.post('/reconvert',                  auth, settingsController.reconvertAllPrices);

module.exports = router;
