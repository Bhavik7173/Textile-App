// backend/routes/payments.js
const express = require('express');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Customer= require('../models/Customer');
const { authMiddleware } = require('../middleware/auth');
const Activity = require('../models/Activity');

const router = express.Router();
router.use(authMiddleware);

// GET /payments?invoiceId=xxx — payments for an invoice
router.get('/', async (req, res) => {
  try {
    const { invoiceId, customerId } = req.query;
    const filter = {};
    if (invoiceId)  filter.invoiceId  = invoiceId;
    if (customerId) filter.customerId = customerId;

    const payments = await Payment.find(filter).sort({ paymentDate: -1 });
    res.json({ payments });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /payments — record a payment
router.post('/', async (req, res) => {
  try {
    const { invoiceId, amount, paymentDate, method, referenceNo, notes } = req.body;
    if (!invoiceId || !amount) return res.status(400).json({ error: 'invoiceId and amount required' });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const payAmt = parseFloat(amount);
    if (payAmt <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const newPaid    = parseFloat((invoice.paidAmount + payAmt).toFixed(2));
    const newBalance = parseFloat((invoice.totalAmount - newPaid).toFixed(2));

    // Determine new status
    let newStatus = invoice.status;
    if (newBalance <= 0) newStatus = 'paid';
    else if (newPaid > 0) newStatus = 'pending';

    // Update invoice
    await Invoice.findByIdAndUpdate(invoiceId, {
      paidAmount: newPaid,
      balance:    Math.max(0, newBalance),
      status:     newStatus,
    });

    // Create payment record
    const payment = new Payment({
      invoiceId,
      invoiceNo:    invoice.invoiceNo,
      customerId:   invoice.customerId,
      customerName: invoice.billedToLine1,
      amount:       payAmt,
      paymentDate:  paymentDate || new Date(),
      method:       method || 'cash',
      referenceNo:  referenceNo || null,
      notes:        notes || null,
      recordedBy:   req.caller.sub,
    });
    await payment.save();

    // Update customer stats if linked
    if (invoice.customerId) {
      const [agg] = await Invoice.aggregate([
        { $match: { customerId: invoice.customerId } },
        { $group: {
          _id: null,
          totalInvoices:   { $sum: 1 },
          totalAmount:     { $sum: '$totalAmount' },
          totalPaid:       { $sum: '$paidAmount' },
          totalOutstanding:{ $sum: '$balance' },
        }},
      ]);
      if (agg) {
        await Customer.findByIdAndUpdate(invoice.customerId, {
          totalInvoices:   agg.totalInvoices,
          totalAmount:     agg.totalAmount,
          totalPaid:       agg.totalPaid,
          totalOutstanding:agg.totalOutstanding,
        });
      }
    }

    const updatedInvoice = await Invoice.findById(invoiceId);

    // Log activity
    try {
      await Activity.create({
        type:      'payment_recorded',
        title:     `Payment recorded for ${invoice.invoiceNo}`,
        subtitle:  `₹${payAmt.toLocaleString('en-IN')} via ${method||'cash'} — ${invoice.billedToLine1}`,
        agentId:   req.caller.sub,
        agentName: req.caller.name,
        refId:     invoiceId,
        refNo:     invoice.invoiceNo,
        amount:    payAmt,
      });
    } catch {}

    res.status(201).json({ payment, invoice: updatedInvoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// DELETE /payments/:id — undo a payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      const newPaid    = parseFloat((invoice.paidAmount - payment.amount).toFixed(2));
      const newBalance = parseFloat((invoice.totalAmount - Math.max(0, newPaid)).toFixed(2));
      await Invoice.findByIdAndUpdate(payment.invoiceId, {
        paidAmount: Math.max(0, newPaid),
        balance:    Math.max(0, newBalance),
        status:     Math.max(0, newPaid) >= invoice.totalAmount ? 'paid' : 'pending',
      });
    }

    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment reversed' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
