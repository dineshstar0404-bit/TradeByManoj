require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Route files
const authRoutes    = require('./routes/authRoutes');
const userRoutes    = require('./routes/userRoutes');
const itemRoutes    = require('./routes/itemRoutes');
const billRoutes    = require('./routes/billRoutes');
const contactRoutes = require('./routes/contacts');           // Task 6
const { transactionRoutes, reportRoutes } = require('./routes/otherRoutes');

connectDB().catch((err) => console.error('Startup MongoDB connect failed:', err.message));

const app = express();

// ── Security & logging ────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ──────────────────────────────────────────────────────────
const origins = (process.env.CLIENT_ORIGINS || '*').split(',').map((o) => o.trim());
app.use(cors({ origin: origins.includes('*') ? true : origins, credentials: true }));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting (protect auth + recovery endpoints) ─────────────
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message: { success: false, message: 'Too many attempts, try again later' } });
app.use('/api/auth', authLimiter);

// ── Ensure DB connection is ready before handling requests (serverless-safe) ──
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ success: true, service: 'manoj-traders-backend', status: 'ok', timestamp: new Date() }));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/items',          itemRoutes);
app.use('/api/bills',          billRoutes);
app.use('/api/uploadContacts', contactRoutes);   // Task 6 — POST /api/uploadContacts
app.use('/api/transactions',   transactionRoutes);
app.use('/api/reports',        reportRoutes);

// ── Error handling ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// Only bind a port for local/traditional hosting (Render, Railway, local dev).
// On Vercel this file is imported by api/index.js as a serverless handler instead.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 MANOJ TRADERS backend running on port ${PORT}`));
}

module.exports = app;
