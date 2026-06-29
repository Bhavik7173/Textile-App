const express  = require('express');
const Invoice  = require('../models/Invoice');
const Payment  = require('../models/Payment');
const Expense  = require('../models/Expense');
const Firm     = require('../models/Firm');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
const fmtNum  = (n) => (parseFloat(n)||0).toFixed(2);

// ── GET /reports/firm-summary?firmId=&from=&to= ───────────────────────────────
router.get('/firm-summary', async (req, res) => {
  try {
    const { firmId, from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(new Date(to).setHours(23,59,59,999));

    const firms = firmId ? [await Firm.findById(firmId)] : await Firm.find().sort({ name: 1 });

    const summaries = await Promise.all(firms.filter(Boolean).map(async (firm) => {
      const filter = { firmId: firm._id };
      if (Object.keys(dateFilter).length) filter.invoiceDate = dateFilter;

      const [inv, exp] = await Promise.all([
        Invoice.aggregate([
          { $match: filter },
          { $group: {
            _id: null,
            count:        { $sum: 1 },
            totalAmount:  { $sum: '$totalAmount' },
            paidAmount:   { $sum: '$paidAmount' },
            balance:      { $sum: '$balance' },
            totalCgst:    { $sum: '$cgstAmt' },
            totalSgst:    { $sum: '$sgstAmt' },
            totalIgst:    { $sum: '$igstAmt' },
            totalTaxable: { $sum: '$grossAmount' },
            pendingCount: { $sum: { $cond: [{ $eq: ['$status','pending'] }, 1, 0] } },
            overdueCount: { $sum: { $cond: [{ $eq: ['$status','overdue'] }, 1, 0] } },
          }}
        ]),
        Expense.aggregate([
          { $match: { firmId: firm._id, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) }},
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
      ]);

      const i = inv[0] || { count:0, totalAmount:0, paidAmount:0, balance:0, totalCgst:0, totalSgst:0, totalIgst:0, totalTaxable:0, pendingCount:0, overdueCount:0 };
      const totalExpense = exp[0]?.total || 0;
      const profit = i.totalAmount - totalExpense;

      // Monthly breakdown
      const monthly = await Invoice.aggregate([
        { $match: filter },
        { $group: {
          _id: { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } },
          amount: { $sum: '$totalAmount' },
          count:  { $sum: 1 },
        }},
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]);

      return {
        firm: { _id: firm._id, name: firm.name, color: firm.color, gstNo: firm.gstNo },
        invoices: i.count,
        totalSales: i.totalAmount,
        paidAmount: i.paidAmount,
        balance: i.balance,
        totalTaxable: i.totalTaxable,
        totalCgst: i.totalCgst,
        totalSgst: i.totalSgst,
        totalIgst: i.totalIgst,
        totalTax: i.totalCgst + i.totalSgst + i.totalIgst,
        totalExpense,
        profit,
        pendingCount: i.pendingCount,
        overdueCount: i.overdueCount,
        monthly: monthly.map(m => ({
          label: `${String(m._id.month).padStart(2,'0')}/${m._id.year}`,
          amount: m.amount, count: m.count,
        })),
      };
    }));

    res.json({ summaries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ── GET /reports/due-alerts ───────────────────────────────────────────────────
router.get('/due-alerts', async (req, res) => {
  try {
    const { firmId } = req.query;
    const today = new Date();
    const in7   = new Date(today); in7.setDate(in7.getDate() + 7);

    const filter = {
      status: { $ne: 'paid' },
      dueDate: { $ne: null },
    };
    if (firmId) filter.firmId = firmId;

    const [overdue, dueSoon] = await Promise.all([
      Invoice.find({ ...filter, dueDate: { $lt: today } })
        .sort({ dueDate: 1 }).limit(50)
        .select('invoiceNo billedToLine1 totalAmount balance dueDate firmId status'),
      Invoice.find({ ...filter, dueDate: { $gte: today, $lte: in7 } })
        .sort({ dueDate: 1 }).limit(50)
        .select('invoiceNo billedToLine1 totalAmount balance dueDate firmId status'),
    ]);

    const overdueTotal   = overdue.reduce((s,i)  => s + (i.balance||i.totalAmount), 0);
    const dueSoonTotal   = dueSoon.reduce((s,i)  => s + (i.balance||i.totalAmount), 0);

    res.json({ overdue, dueSoon, overdueTotal, dueSoonTotal });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── GET /reports/customer-ledger?customer=&firmId= ────────────────────────────
router.get('/customer-ledger', async (req, res) => {
  try {
    const { customer, firmId } = req.query;
    if (!customer) return res.status(400).json({ error: 'customer name required' });

    const filter = { billedToLine1: { $regex: customer, $options: 'i' } };
    if (firmId) filter.firmId = firmId;

    const invoices  = await Invoice.find(filter).sort({ invoiceDate: 1 });
    const invoiceIds= invoices.map(i => i._id);
    const payments  = await Payment.find({ invoiceId: { $in: invoiceIds } }).sort({ paymentDate: 1 });

    const totalBilled  = invoices.reduce((s,i) => s + i.totalAmount, 0);
    const totalPaid    = invoices.reduce((s,i) => s + (i.paidAmount||0), 0);
    const totalBalance = invoices.reduce((s,i) => s + (i.balance||0), 0);

    res.json({ invoices, payments, totalBilled, totalPaid, totalBalance, customer });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── GET /reports/gstr1?firmId=&month=&year= — GST export CSV ─────────────────
router.get('/gstr1', async (req, res) => {
  try {
    const { firmId, month, year } = req.query;
    if (!firmId || !month || !year) return res.status(400).json({ error: 'firmId, month, year required' });

    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);

    const invoices = await Invoice.find({
      firmId,
      invoiceDate: { $gte: from, $lte: to },
    }).sort({ invoiceDate: 1 });

    const firm = await Firm.findById(firmId);

    const headers = [
      'Invoice No','Invoice Date','Customer Name','Customer GSTIN',
      'Place of Supply','HSN/SAC','Taxable Value',
      'CGST Rate','CGST Amt','SGST Rate','SGST Amt',
      'IGST Rate','IGST Amt','Total Tax','Invoice Value',
    ];

    const rows = invoices.map(inv => [
      inv.invoiceNo,
      fmtDate(inv.invoiceDate),
      inv.billedToLine1 || '',
      inv.billedGSTNo || '',
      inv.billedStateName || 'Gujarat',
      inv.hsnSac || '',
      fmtNum(inv.grossAmount),
      inv.cgstRate || 0, fmtNum(inv.cgstAmt),
      inv.sgstRate || 0, fmtNum(inv.sgstAmt),
      inv.igstRate || 0, fmtNum(inv.igstAmt),
      fmtNum((inv.cgstAmt||0)+(inv.sgstAmt||0)+(inv.igstAmt||0)),
      fmtNum(inv.totalAmount),
    ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','));

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const csv = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="GSTR1_${firm?.name||'firm'}_${monthNames[month-1]}${year}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
