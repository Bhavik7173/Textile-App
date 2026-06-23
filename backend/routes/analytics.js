// backend/routes/analytics.js
// Provides data for all 8 charts + activity feed + reminders + notifications

const express  = require('express');
const Invoice  = require('../models/Invoice');
const Payment  = require('../models/Payment');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const Reminder = require('../models/Reminder');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── 1. Revenue trend (line chart) — daily/weekly/monthly ──────────────────────
router.get('/revenue-trend', async (req, res) => {
  try {
    const { period = 'monthly', months = 6 } = req.query;
    const since = new Date();
    since.setMonth(since.getMonth() - parseInt(months));
    since.setDate(1); since.setHours(0,0,0,0);

    let groupId, labelExpr;
    if (period === 'daily') {
      groupId = { year:{$year:'$invoiceDate'}, month:{$month:'$invoiceDate'}, day:{$dayOfMonth:'$invoiceDate'} };
    } else if (period === 'weekly') {
      groupId = { year:{$year:'$invoiceDate'}, week:{$isoWeek:'$invoiceDate'} };
    } else {
      groupId = { year:{$year:'$invoiceDate'}, month:{$month:'$invoiceDate'} };
    }

    const data = await Invoice.aggregate([
      { $match: { invoiceDate: { $gte: since } } },
      { $group: {
        _id:      groupId,
        revenue:  { $sum: '$totalAmount' },
        invoices: { $sum: 1 },
        paid:     { $sum: '$paidAmount' },
      }},
      { $sort: { '_id.year':1, '_id.month':1, '_id.day':1, '_id.week':1 } },
    ]);

    const formatted = data.map(d => ({
      label: period === 'daily'
        ? `${d._id.day} ${MONTHS[(d._id.month||1)-1]}`
        : period === 'weekly'
        ? `W${d._id.week} ${d._id.year}`
        : `${MONTHS[(d._id.month||1)-1]} ${d._id.year}`,
      revenue:  parseFloat((d.revenue||0).toFixed(2)),
      invoices: d.invoices,
      paid:     parseFloat((d.paid||0).toFixed(2)),
    }));

    res.json({ data: formatted });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── 2. Top 5 customers by revenue ─────────────────────────────────────────────
router.get('/top-customers', async (req, res) => {
  try {
    const data = await Invoice.aggregate([
      { $group: {
        _id:          '$billedToLine1',
        totalAmount:  { $sum: '$totalAmount' },
        paidAmount:   { $sum: '$paidAmount' },
        invoiceCount: { $sum: 1 },
      }},
      { $sort: { totalAmount: -1 } },
      { $limit: 5 },
    ]);
    res.json({ data: data.map(d => ({
      name:         d._id || 'Unknown',
      totalAmount:  parseFloat((d.totalAmount||0).toFixed(2)),
      paidAmount:   parseFloat((d.paidAmount||0).toFixed(2)),
      invoiceCount: d.invoiceCount,
    }))});
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── 3. Invoice status breakdown (donut) ───────────────────────────────────────
router.get('/status-breakdown', async (req, res) => {
  try {
    const data = await Invoice.aggregate([
      { $group: {
        _id:    '$status',
        count:  { $sum: 1 },
        amount: { $sum: '$totalAmount' },
      }},
    ]);
    const map = { paid: 0, pending: 0, overdue: 0 };
    const amt = { paid: 0, pending: 0, overdue: 0 };
    data.forEach(d => { map[d._id] = d.count; amt[d._id] = d.amount; });
    res.json({
      data: [
        { name: 'Paid',    value: map.paid,    amount: amt.paid,    color: '#22c55e' },
        { name: 'Pending', value: map.pending, amount: amt.pending, color: '#f59e0b' },
        { name: 'Overdue', value: map.overdue, amount: amt.overdue, color: '#ef4444' },
      ]
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── 4. Agent performance comparison ───────────────────────────────────────────
router.get('/agent-performance', async (req, res) => {
  try {
    const data = await Invoice.aggregate([
      { $group: {
        _id:          '$agentName',
        totalAmount:  { $sum: '$totalAmount' },
        paidAmount:   { $sum: '$paidAmount' },
        invoiceCount: { $sum: 1 },
      }},
      { $sort: { totalAmount: -1 } },
      { $limit: 8 },
    ]);
    res.json({ data: data.map(d => ({
      name:         d._id || 'Unknown',
      totalAmount:  parseFloat((d.totalAmount||0).toFixed(2)),
      paidAmount:   parseFloat((d.paidAmount||0).toFixed(2)),
      invoiceCount: d.invoiceCount,
    }))});
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── 5. GST breakdown monthly (SGST/CGST/IGST) ────────────────────────────────
router.get('/gst-breakdown', async (req, res) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1); since.setHours(0,0,0,0);

    const data = await Invoice.aggregate([
      { $match: { invoiceDate: { $gte: since } } },
      { $group: {
        _id:   { year:{$year:'$invoiceDate'}, month:{$month:'$invoiceDate'} },
        sgst:  { $sum: '$sgstAmt' },
        cgst:  { $sum: '$cgstAmt' },
        igst:  { $sum: '$igstAmt' },
        total: { $sum: { $add: ['$sgstAmt','$cgstAmt','$igstAmt'] } },
      }},
      { $sort: { '_id.year':1, '_id.month':1 } },
    ]);

    res.json({ data: data.map(d => ({
      label: `${MONTHS[d._id.month-1]} ${d._id.year}`,
      sgst:  parseFloat((d.sgst||0).toFixed(2)),
      cgst:  parseFloat((d.cgst||0).toFixed(2)),
      igst:  parseFloat((d.igst||0).toFixed(2)),
      total: parseFloat((d.total||0).toFixed(2)),
    }))});
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── 6. Item-wise sales chart ───────────────────────────────────────────────────
router.get('/item-sales', async (req, res) => {
  try {
    const data = await Invoice.aggregate([
      { $group: {
        _id:      '$itemName',
        revenue:  { $sum: '$totalAmount' },
        quantity: { $sum: '$quantity' },
        count:    { $sum: 1 },
      }},
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]);
    res.json({ data: data.map(d => ({
      name:     d._id || 'Unknown',
      revenue:  parseFloat((d.revenue||0).toFixed(2)),
      quantity: parseFloat((d.quantity||0).toFixed(2)),
      count:    d.count,
    }))});
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── 7. Payment collection rate ─────────────────────────────────────────────────
router.get('/collection-rate', async (req, res) => {
  try {
    const [agg] = await Invoice.aggregate([
      { $group: {
        _id:         null,
        totalBilled: { $sum: '$totalAmount' },
        totalPaid:   { $sum: '$paidAmount' },
        totalBalance:{ $sum: '$balance' },
        count:       { $sum: 1 },
        paidCount:   { $sum: { $cond: [{ $eq:['$status','paid'] }, 1, 0] } },
      }},
    ]);
    const rate = agg ? Math.round((agg.totalPaid / agg.totalBilled) * 100) : 0;
    res.json({
      rate: rate || 0,
      totalBilled:  agg?.totalBilled  || 0,
      totalPaid:    agg?.totalPaid    || 0,
      totalBalance: agg?.totalBalance || 0,
      count:        agg?.count        || 0,
      paidCount:    agg?.paidCount    || 0,
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── 8. Aging chart (0-30, 31-60, 61-90, 90+ days overdue) ────────────────────
router.get('/aging', async (req, res) => {
  try {
    const now = new Date();
    const invoices = await Invoice.find({
      status: { $ne: 'paid' },
      balance: { $gt: 0 },
      dueDate: { $lt: now },
    }).select('dueDate balance billedToLine1 invoiceNo');

    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const details = { '0-30': [], '31-60': [], '61-90': [], '90+': [] };

    invoices.forEach(inv => {
      if (!inv.dueDate) return;
      const days = Math.floor((now - new Date(inv.dueDate)) / (1000*60*60*24));
      const key  = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
      buckets[key] += inv.balance || 0;
      details[key].push({ invoiceNo: inv.invoiceNo, customer: inv.billedToLine1, days, balance: inv.balance });
    });

    res.json({
      data: Object.entries(buckets).map(([label, amount]) => ({ label, amount: parseFloat(amount.toFixed(2)), count: details[label].length })),
      details,
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── Activity feed ─────────────────────────────────────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json({ activities });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── Notifications (overdue + upcoming reminders) ──────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const now      = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 3);

    const [overdue, reminders] = await Promise.all([
      Invoice.find({ status:'overdue', balance:{ $gt:0 } })
        .select('invoiceNo billedToLine1 balance dueDate')
        .sort({ dueDate:1 }).limit(10),
      Reminder.find({ isDone:false, reminderDate:{ $lte:tomorrow } })
        .sort({ reminderDate:1 }).limit(10),
    ]);

    const notes = [
      ...overdue.map(inv => ({
        id:    inv._id,
        type:  'overdue',
        title: `Invoice ${inv.invoiceNo} overdue`,
        body:  `${inv.billedToLine1} owes ₹${(inv.balance||0).toLocaleString('en-IN')}`,
        date:  inv.dueDate,
        refId: inv._id,
      })),
      ...reminders.map(r => ({
        id:    r._id,
        type:  'reminder',
        title: `Follow up: ${r.invoiceNo}`,
        body:  r.note || `${r.customerName} — ₹${(r.amount||0).toLocaleString('en-IN')}`,
        date:  r.reminderDate,
        refId: r.invoiceId,
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ notifications: notes, count: notes.length });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── Reminders CRUD ────────────────────────────────────────────────────────────
router.get('/reminders', async (req, res) => {
  try {
    const reminders = await Reminder.find({ isDone: false }).sort({ reminderDate: 1 });
    res.json({ reminders });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/reminders', async (req, res) => {
  try {
    const { invoiceId, invoiceNo, customerName, amount, reminderDate, note } = req.body;
    if (!invoiceId || !reminderDate) return res.status(400).json({ error: 'invoiceId and reminderDate required' });
    const r = new Reminder({ invoiceId, invoiceNo, customerName, amount, reminderDate, note, createdBy: req.caller.sub });
    await r.save();
    res.status(201).json({ reminder: r });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/reminders/:id/done', async (req, res) => {
  try {
    const r = await Reminder.findByIdAndUpdate(req.params.id, { isDone: true }, { new: true });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ reminder: r });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/reminders/:id', async (req, res) => {
  try {
    await Reminder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
