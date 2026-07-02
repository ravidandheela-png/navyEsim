const { Router } = require('express');
const router = Router();

// POST /api/orders → create order with status=pending
router.post('/', (req, res, next) => {
  // TODO: implement via orderController.createOrder
  next();
});

// GET /api/orders/:id → paymentStatus + esimQrData only
router.get('/:id', (req, res, next) => {
  // TODO: implement via orderController.getOrder
  next();
});

module.exports = router;
