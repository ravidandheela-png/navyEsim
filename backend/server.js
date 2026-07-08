/**
 * NavyeSIM Express server entry point.
 * Start with: node server.js
 */

require('dotenv').config();
const path     = require('path');
const express  = require('express');
const cors     = require('cors');
const cron     = require('node-cron');

// ── Prisma singleton (do NOT create a new PrismaClient here) ──
const prisma = require('./models/index');

// ── Jobs ────────────────────────────────────────────────────
const { fetchAndUpdateRates } = require('./jobs/exchangeRates');

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



// ── Serve customer frontend ──────────────────────────────────
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

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

    // ── Exchange rate cron job (M6.3) ──────────────────────────────────────
    const cronEnabled  = process.env.SYNC_CRON_ENABLED === 'true';
    const cronSchedule = process.env.EXCHANGE_RATE_CRON || '0 */6 * * *';

    if (cronEnabled) {
      console.log(`Exchange rate cron enabled: ${cronSchedule}`);

      cron.schedule(cronSchedule, async () => {
        console.log('[exchange-rate-cron] Running exchange rate update…');
        try {
          const summary = await fetchAndUpdateRates(prisma);
          console.log('[exchange-rate-cron] Done:', JSON.stringify(summary));
        } catch (err) {
          // Never crash the server — log and continue
          console.error('[exchange-rate-cron] Unexpected error:', err.message);
        }
      });
    } else {
      console.log('Exchange rate cron disabled.');
    }
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

module.exports = app;
