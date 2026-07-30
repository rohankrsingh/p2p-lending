import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './utils/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import loanRoutes from './routes/loans.js';
import repaymentRoutes from './routes/repayments.js';
import stripeRoutes, { stripeWebhookHandler } from './routes/stripe.js';

// Agenda scheduler
import agenda from './services/agenda.js';
import registerJobs from './services/jobs.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [CLIENT_URL];
// Allow common dev ports
['5173', '5174', '5175', '3000'].forEach((port) => {
  const url = `http://localhost:${port}`;
  if (!allowedOrigins.includes(url)) allowedOrigins.push(url);
});

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // In dev, be permissive
  },
  credentials: true,
}));
app.use(morgan('dev'));

// Stripe webhook needs raw body BEFORE express.json() parses it
// express.raw() only applies to this one route
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/repayments', repaymentRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// ── Start ─────────────────────────────────────────────────────────
connectDB().then(async () => {
  await agenda.start();
  registerJobs(agenda);
  console.log('⏰ Agenda scheduler started');

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
