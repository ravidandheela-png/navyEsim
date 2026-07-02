const { Router } = require('express');
const router = Router();

// POST /api/payments/webhook → stub: validates secret header, marks order paid
// TODO[INTEGRATION]: add provider signature verification (Razorpay / PhonePe)
router.post('/webhook', (req, res, next) => {
  // TODO: implement via paymentController.handleWebhook
  next();
});

module.exports = router;
