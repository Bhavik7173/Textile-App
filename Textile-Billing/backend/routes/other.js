const express = require('express');
const Invoice  = require('../models/Invoice');
const Agent    = require('../models/Agent');
const Company  = require('../models/Company');
const Customer = require('../models/Customer');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ─── Stats (with monthly chart data) ─────────────────────────────────────────
const statsRouter = express.Router();
statsRouter.use(authMiddleware, adminOnly);

statsRouter.get('/', async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    // Last 6 months for chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

    const [overall, byStatus, byAgent, thisMonth, monthlyTrend] = await Promise.all([
      Invoice.aggregate([{ $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalAmount:   { $sum: '$totalAmount' },
        paidAmount:    { $sum: '$paidAmount' },
        pendingAmount: { $sum: { $cond: [{ $ne: ['$status','paid'] }, '$balance', 0] } },
      }}]),

      Invoice.aggregate([{ $group: {
        _id:    '$status',
        count:  { $sum: 1 },
        amount: { $sum: '$totalAmount' },
      }}]),

      Invoice.aggregate([
        { $group: {
          _id:          '$agentId',
          agentName:    { $first: '$agentName' },
          invoiceCount: { $sum: 1 },
          totalAmount:  { $sum: '$totalAmount' },
          paidAmount:   { $sum: '$paidAmount' },
        }},
        { $sort: { totalAmount: -1 } },
      ]),

      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: startOfMonth } } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      ]),

      // Monthly revenue for chart (last 6 months)
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: sixMonthsAgo } } },
        { $group: {
          _id: {
            year:  { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
          },
          revenue:  { $sum: '$totalAmount' },
          invoices: { $sum: 1 },
          paid:     { $sum: '$paidAmount' },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const sm = {};
    byStatus.forEach(s => { sm[s._id] = s; });
    const o = overall[0] || {};
    const m = thisMonth[0] || {};

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const chartData = monthlyTrend.map(d => ({
      label:    MONTHS[d._id.month - 1] + ' ' + d._id.year,
      revenue:  d.revenue,
      invoices: d.invoices,
      paid:     d.paid,
    }));

    res.json({
      totalInvoices:     o.totalInvoices || 0,
      totalAmount:       o.totalAmount   || 0,
      paidAmount:        o.paidAmount    || 0,
      pendingAmount:     o.pendingAmount || 0,
      paidCount:         sm.paid?.count    || 0,
      pendingCount:      sm.pending?.count || 0,
      overdueCount:      sm.overdue?.count || 0,
      thisMonthInvoices: m.count  || 0,
      thisMonthAmount:   m.amount || 0,
      chartData,
      agents: byAgent.map(a => ({
        id:           a._id,
        name:         a.agentName,
        invoiceCount: a.invoiceCount,
        totalAmount:  a.totalAmount,
        paidAmount:   a.paidAmount,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

// ─── Agents ───────────────────────────────────────────────────────────────────
const agentsRouter = express.Router();
agentsRouter.use(authMiddleware, adminOnly);

agentsRouter.get('/', async (req, res) => {
  try {
    const agents = await Agent.find({ role: 'agent' }).sort({ name: 1 });
    const stats  = await Invoice.aggregate([{
      $group: { _id: '$agentId', count: { $sum: 1 }, total: { $sum: '$totalAmount' } },
    }]);
    const sm = {};
    stats.forEach(s => { sm[s._id.toString()] = s; });
    res.json({
      agents: agents.map(a => ({
        ...a.toJSON(),
        invoiceCount: sm[a._id.toString()]?.count || 0,
        totalAmount:  sm[a._id.toString()]?.total || 0,
      })),
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

agentsRouter.put('/:id/toggle', async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, role: 'agent' });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    agent.isActive = !agent.isActive;
    await agent.save();
    res.json({ agent });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ─── Company settings ─────────────────────────────────────────────────────────
const companyRouter = express.Router();
companyRouter.use(authMiddleware);

companyRouter.get('/', async (req, res) => {
  try {
    let company = await Company.findOne();
    if (!company) company = await Company.create({ name: 'My Textile Company' });
    res.json({ company });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

companyRouter.put('/', adminOnly, async (req, res) => {
  try {
    const company = await Company.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json({ company });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ─── Auto invoice number ──────────────────────────────────────────────────────
const utilRouter = express.Router();
utilRouter.use(authMiddleware);

utilRouter.get('/next-invoice-no', async (req, res) => {
  try {
    const last = await Invoice.findOne({}, { invoiceNo: 1 }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (last?.invoiceNo) {
      const match = last.invoiceNo.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    res.json({ invoiceNo: `INV-${String(nextNum).padStart(4, '0')}` });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ─── Excel export ─────────────────────────────────────────────────────────────
utilRouter.get('/export/excel', adminOnly, async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.invoiceDate = {};
      if (from) filter.invoiceDate.$gte = new Date(from);
      if (to)   filter.invoiceDate.$lte = new Date(to);
    }

    const invoices = await Invoice.find(filter).sort({ invoiceDate: -1 }).limit(5000);

    // Build CSV (no external library needed)
    const headers = [
      'Invoice No','Order No','Challan No','Invoice Date','Due Date',
      'Agent','Customer','Item','HSN','Pieces','Qty(m)','Rate',
      'Gross Amount','SGST','CGST','IGST','Total Amount',
      'Paid Amount','Balance','Status',
    ];

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '';
    const fmtNum  = (n) => (parseFloat(n) || 0).toFixed(2);

    const rows = invoices.map(inv => [
      inv.invoiceNo, inv.orderNo, inv.challanNo,
      fmtDate(inv.invoiceDate), fmtDate(inv.dueDate),
      inv.agentName, inv.billedToLine1, inv.itemName,
      inv.hsnSac, inv.pieces, fmtNum(inv.quantity), fmtNum(inv.rate),
      fmtNum(inv.grossAmount), fmtNum(inv.sgstAmt), fmtNum(inv.cgstAmt), fmtNum(inv.igstAmt),
      fmtNum(inv.totalAmount), fmtNum(inv.paidAmount), fmtNum(inv.balance),
      inv.status,
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="invoices_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ─── Ledger ───────────────────────────────────────────────────────────────────
const ledgerRouter = express.Router();
ledgerRouter.use(authMiddleware);

ledgerRouter.get('/', async (req, res) => {
  try {
    const ledger = await Invoice.aggregate([
      {
        $group: {
          _id:          '$billedToLine1',
          customerId:   { $first: '$customerId' },
          totalInvoices:{ $sum: 1 },
          totalAmount:  { $sum: '$totalAmount' },
          paidAmount:   { $sum: '$paidAmount' },
          balance:      { $sum: '$balance' },
          lastInvoice:  { $max: '$invoiceDate' },
          overdueCount: { $sum: { $cond: [{ $eq: ['$status','overdue'] }, 1, 0] } },
        },
      },
      { $sort: { balance: -1 } },
    ]);
    res.json({ ledger });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ledger' });
  }
});

module.exports = { statsRouter, agentsRouter, companyRouter, utilRouter, ledgerRouter };
