require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const { connectDB } = require('./shared/db');

const authRoutes      = require('./routes/auth');
const invoiceRoutes   = require('./routes/invoices');
const customerRoutes  = require('./routes/customers');
const paymentRoutes   = require('./routes/payments');
const { statsRouter, agentsRouter, companyRouter, utilRouter, ledgerRouter } = require('./routes/other');
const analyticsRoutes = require('./routes/analytics');
const challanRoutes   = require('./routes/challans');
const firmRoutes      = require('./routes/firms');
const stockRoutes     = require('./routes/stock');
const expenseRoutes   = require('./routes/expenses');
const reportRoutes    = require('./routes/reports');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173','http://localhost:3000'], credentials: true }));
app.use(express.json());

// Logger
app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => {
    const c = res.statusCode < 400 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${c}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${Date.now()-t}ms)`);
  });
  next();
});

app.use('/api/auth',      authRoutes);
app.use('/api/invoices',  invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/stats',     statsRouter);
app.use('/api/agents',    agentsRouter);
app.use('/api/company',   companyRouter);
app.use('/api/util',      utilRouter);
app.use('/api/ledger',    ledgerRouter);
app.use('/api/challans',  challanRoutes);
app.use('/api/firms',     firmRoutes);
app.use('/api/stock',     stockRoutes);
app.use('/api/expenses',  expenseRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log('\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m║  Textile Billing System — Backend Server  ║\x1b[0m');
    console.log('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m');
    console.log(`\n🚀 API: http://localhost:${PORT}/api\n`);
  });
}
start();
