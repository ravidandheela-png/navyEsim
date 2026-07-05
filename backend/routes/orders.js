const { Router } = require('express');
const router = Router();
const orderController = require('../controllers/orderController');

// POST /api/orders → create order with status=pending
router.post('/', orderController.createOrder);

// GET /api/orders/:id → paymentStatus + esimQrData only
router.get('/:id', orderController.getOrder);

module.exports = router;
