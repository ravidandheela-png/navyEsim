/**
 * Order controller — handles order creation and status polling.
 * RULE: Never return pricing internals in customer-facing responses.
 */

/**
 * POST /api/orders
 * Creates an Order with paymentStatus=pending.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function createOrder(req, res, next) {
  // TODO: validate body { canonicalPackageId, paymentMethod, customerEmail? }
  // TODO: prisma.order.create({ data: { ...body, paymentStatus: 'pending' } })
  // TODO: return { orderId }
}

/**
 * GET /api/orders/:id
 * Returns { paymentStatus, esimQrData } only — no pricing internals.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getOrder(req, res, next) {
  // TODO: prisma.order.findUnique({ where: { id: req.params.id } })
  // TODO: return only { paymentStatus, esimQrData }
}

module.exports = { createOrder, getOrder };
