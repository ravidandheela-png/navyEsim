/**
 * NavyeSIM Express server entry point.
 * Start with: node server.js
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// ── Prisma singleton (do NOT create a new PrismaClient here) ──
const prisma = require('./models/index');

const customersRouter = require('./routes/customers');
const ordersRouter    = require('./routes/orders');
const paymentsRouter  = require('./routes/payments');
const adminRouter     = require('./routes/admin');
const settingsRouter  = require('./routes/settings');
const errorHandler    = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(req.method, req.originalUrl);
  next();
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS || '*',
}));
app.use(express.json());



// ── Routes ──────────────────────────────────────────────────
app.use('/api', customersRouter);          // GET /api/countries, GET /api/packages
app.use('/api/orders', ordersRouter);      // POST /api/orders, GET /api/orders/:id
app.use('/api/payments', paymentsRouter);  // POST /api/payments/webhook
app.use('/api/admin', adminRouter);        // all admin routes (JWT protected)
app.use('/api/settings', settingsRouter);  // GET /api/settings/payment + admin settings

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }));

// ── Global error handler (must be last) ─────────────────────
app.use(errorHandler);

// ── Graceful shutdown helper ─────────────────────────────────
function shutdown(signal, server) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected. Goodbye.');
      process.exit(0);
    } catch (err) {
      console.error('Error during Prisma disconnect:', err);
      process.exit(1);
    }
  });
}

// ── Connect to DB, then start listening ─────────────────────
prisma.$connect()
  .then(() => {
    console.log('Database connected.');

    const server = app.listen(PORT, () => {
      console.log(`NavyeSIM server running on http://localhost:${PORT}`);
    });

    process.on('SIGINT',  () => shutdown('SIGINT',  server));
    process.on('SIGTERM', () => shutdown('SIGTERM', server));
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

module.exports = app;
