/**
 * Payment controller (M18 — Payment Webhook stub).
 * TODO[INTEGRATION]: add real provider signature verification (Razorpay / PhonePe).
 */

const prisma = require('../models/index');

/**
 * POST /api/payments/webhook
 *
 * Headers:
 *   x-webhook-secret: <PAYMENT_WEBHOOK_SECRET>
 *
 * Body:
 *   { orderId, paymentReference, status: "paid"|"failed", esimQrData? }
 */
async function handleWebhook(req, res, next) {
  // ── 1. Validate secret ─────────────────────────────────────────────────────
  const secret         = process.env.PAYMENT_WEBHOOK_SECRET;
  const incomingSecret = req.headers['x-webhook-secret'];

  if (!secret) {
    console.error('[webhook] PAYMENT_WEBHOOK_SECRET not set.');
    return res.status(500).json({ error: 'Webhook secret not configured.' });
  }
  if (!incomingSecret || incomingSecret !== secret) {
    console.warn('[webhook] Invalid x-webhook-secret.');
    return res.status(401).json({ error: 'Unauthorized: invalid webhook secret.' });
  }

  // ── 2. Validate body ───────────────────────────────────────────────────────
  const { orderId, paymentReference, status, esimQrData } = req.body || {};

  if (!orderId)          return res.status(400).json({ error: 'orderId is required.' });
  if (!paymentReference) return res.status(400).json({ error: 'paymentReference is required.' });
  if (!status || !['paid', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'status must be "paid" or "failed".' });
  }

  // ── 3. Find order ──────────────────────────────────────────────────────────
  let order;
  try {
    order = await prisma.order.findUnique({ where: { id: orderId } });
  } catch (err) { return next(err); }

  if (!order) return res.status(404).json({ error: `Order ${orderId} not found.` });

  // ── 4. Idempotency guard ───────────────────────────────────────────────────
  if (order.paymentStatus === 'paid') {
    return res.json({ ok: true, message: 'Already processed.' });
  }

  // ── 5. Update order ────────────────────────────────────────────────────────
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus:    status,
        paymentReference: paymentReference,
        ...(esimQrData !== undefined && { esimQrData }),
      },
    });
  } catch (err) { return next(err); }

  // ── 6. eSIM fulfillment stub ───────────────────────────────────────────────
  if (status === 'paid') {
    // TODO[INTEGRATION]: trigger eSIM provisioning from winning vendor API
    console.log(`[webhook] Order ${orderId} paid. eSIM fulfillment: TODO[INTEGRATION].`);
  }

  return res.json({ ok: true });
}

module.exports = { handleWebhook };
