/**
 * Admin controller — all admin panel operations (JWT protected).
 */

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const prisma = require('../models/index');

/**
 * POST /api/admin/login
 * Validates credentials and returns a signed 24h JWT.
 * Never reveals whether email or password was the incorrect field.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // ── 1. Validate presence ───────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // ── 2. Find admin by email ─────────────────────────────────────────────
    const admin = await prisma.admin.findUnique({ where: { email } });

    // ── 3. Verify password (constant-time compare via bcrypt) ──────────────
    // Always run bcrypt.compare even if admin is null to prevent timing attacks.
    const DUMMY_HASH = '$2b$12$invalidhashpaddingtopreventimingtimingattacks000000000';
    const hashToCompare = admin ? admin.passwordHash : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!admin || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // ── 4. Sign JWT (24h expiry) ───────────────────────────────────────────
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // ── 5. Respond — never include passwordHash ────────────────────────────
    return res.status(200).json({
      token,
      admin: {
        id:    admin.id,
        email: admin.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** @param {import('express').Request} req @param {import('express').Response} res @param {import('express').NextFunction} next */
async function getDashboard(req, res, next) {
  // TODO: return { totalOrders, paidOrders, revenueINR, activeCountries, activePackages, last10Orders }
}

// Countries
/** @param {import('express').Request} req @param {import('express').Response} res @param {import('express').NextFunction} next */
async function getCountries(req, res, next) { /* TODO */ }
async function createCountry(req, res, next) { /* TODO */ }
async function updateCountry(req, res, next) { /* TODO */ }
async function deleteCountry(req, res, next) { /* TODO */ }

// Vendors
async function getVendors(req, res, next) { /* TODO */ }
async function createVendor(req, res, next) { /* TODO */ }
async function updateVendor(req, res, next) { /* TODO */ }
async function deleteVendor(req, res, next) { /* TODO */ }
async function syncVendor(req, res, next) { /* TODO */ }
async function uploadVendorSheet(req, res, next) { /* TODO */ }
async function getVendorSyncLogs(req, res, next) { /* TODO */ }

// Packages
async function getPackages(req, res, next) { /* TODO */ }
async function createPackage(req, res, next) { /* TODO */ }
async function updatePackage(req, res, next) { /* TODO */ }
async function deletePackage(req, res, next) { /* TODO */ }
async function getUnmatchedPackages(req, res, next) { /* TODO */ }
async function rematchPackages(req, res, next) { /* TODO */ }
async function repricePackages(req, res, next) { /* TODO */ }
async function overridePackagePrice(req, res, next) { /* TODO */ }
async function updateVendorLink(req, res, next) { /* TODO */ }

// Margin rules
async function getMarginRules(req, res, next) { /* TODO */ }
async function createMarginRule(req, res, next) { /* TODO */ }
async function updateMarginRule(req, res, next) { /* TODO */ }
async function deleteMarginRule(req, res, next) { /* TODO */ }
async function previewMarginRules(req, res, next) { /* TODO */ }

// Orders
async function getOrders(req, res, next) { /* TODO */ }
async function getOrderById(req, res, next) { /* TODO */ }
async function updateOrder(req, res, next) { /* TODO */ }

// Price history
async function getPriceHistory(req, res, next) { /* TODO */ }

module.exports = {
  login, getDashboard,
  getCountries, createCountry, updateCountry, deleteCountry,
  getVendors, createVendor, updateVendor, deleteVendor,
  syncVendor, uploadVendorSheet, getVendorSyncLogs,
  getPackages, createPackage, updatePackage, deletePackage,
  getUnmatchedPackages, rematchPackages, repricePackages,
  overridePackagePrice, updateVendorLink,
  getMarginRules, createMarginRule, updateMarginRule, deleteMarginRule, previewMarginRules,
  getOrders, getOrderById, updateOrder,
  getPriceHistory,
};
