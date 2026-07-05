/**
 * Order controller (M16 / M17) — order creation and status polling.
 * RULE: Never return pricing internals in customer-facing responses.
 */

const prisma = require('../models/index');

const VALID_PAYMENT_METHODS = ['googlepay', 'upi', 'qr'];

/**
 * POST /api/orders
 * Body: { canonicalPackageId, paymentMethod, customerEmail? }
 * Returns: { orderId, totalINR, paymentStatus }
 */
async function createOrder(req, res, next) {
  try {
    const { canonicalPackageId, paymentMethod, customerEmail } = req.body;

    if (!canonicalPackageId) {
      return res.status(400).json({ error: 'canonicalPackageId is required.' });
    }
    if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        error: `paymentMethod must be one of: ${VALID_PAYMENT_METHODS.join(', ')}.`,
      });
    }

    const pkg = await prisma.canonicalPackage.findUnique({
      where:  { id: canonicalPackageId },
      select: { id: true, isActive: true, finalPriceINR: true },
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found.' });
    }
    if (!pkg.isActive) {
      return res.status(400).json({ error: 'Package is not available.' });
    }
    if (!pkg.finalPriceINR || pkg.finalPriceINR <= 0) {
      return res.status(400).json({ error: 'Package price is not set. Please try again later.' });
    }

    const order = await prisma.order.create({
      data: {
        canonicalPackageId,
        paymentMethod,
        customerEmail: customerEmail ?? null,
        paymentStatus: 'pending',
        totalINR:      pkg.finalPriceINR,
      },
    });

    return res.status(201).json({
      orderId:       order.id,
      totalINR:      order.totalINR,
      paymentStatus: order.paymentStatus,
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/orders/:id
 * Returns { orderId, paymentStatus, esimQrData } only — no pricing internals.
 */
async function getOrder(req, res, next) {
  try {
    const order = await prisma.order.findUnique({
      where:  { id: req.params.id },
      select: { id: true, paymentStatus: true, esimQrData: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    return res.json({
      orderId:       order.id,
      paymentStatus: order.paymentStatus,
      esimQrData:    order.esimQrData ?? null,
    });
  } catch (err) { next(err); }
}

module.exports = { createOrder, getOrder };
