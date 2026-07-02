/**
 * JWT authentication middleware.
 * Protects all admin routes. Token must be issued with a 24-hour expiry.
 *
 * Flow:
 *   1. Extract Bearer token from Authorization header.
 *   2. Verify JWT signature and expiry using JWT_SECRET.
 *   3. Fetch the admin record from DB using the id in the token payload.
 *   4. Attach admin to req.admin and call next().
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */

const jwt    = require('jsonwebtoken');
const prisma = require('../models/index');

async function auth(req, res, next) {
  // ── 1. Extract token from Authorization header ──────────────────────────
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.slice(7); // remove "Bearer " prefix

  // ── 2. Verify JWT signature and expiry ───────────────────────────────────
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // ── 3. Fetch admin from DB ───────────────────────────────────────────────
  let admin;
  try {
    admin = await prisma.admin.findUnique({
      where: { id: payload.id },
    });
  } catch (err) {
    // DB error — not an auth failure, propagate to global error handler
    return next(err);
  }

  if (!admin) {
    return res.status(401).json({ error: 'Admin not found' });
  }

  // ── 4. Attach admin and proceed ──────────────────────────────────────────
  req.admin = admin;
  next();
}

module.exports = auth;
