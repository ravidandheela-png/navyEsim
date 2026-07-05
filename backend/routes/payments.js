const { Router } = require('express');
const router = Router();
const paymentController = require('../controllers/paymentController');

// POST /api/payments/webhook
// TODO[INTEGRATION]: add provider signature verification (Razorpay / PhonePe)
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
