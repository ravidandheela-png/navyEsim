/**
 * Payment controller — handles payment webhook.
 * TODO[INTEGRATION]: add real provider signature verification (Razorpay / PhonePe).
 */

/**
 * POST /api/payments/webhook
 * Validates secret header, marks order as paid, triggers eSIM fulfillment stub.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function handleWebhook(req, res, next) {
  // TODO: validate req.headers['x-webhook-secret'] === process.env.PAYMENT_WEBHOOK_SECRET
  // TODO: parse body to get orderId and payment reference
  // TODO: prisma.order.update({ where: { id }, data: { paymentStatus: 'paid', paymentReference } })
  // TODO[INTEGRATION]: trigger eSIM fulfillment from vendor API
  // TODO: log to console / SyncLog
}

module.exports = { handleWebhook };
