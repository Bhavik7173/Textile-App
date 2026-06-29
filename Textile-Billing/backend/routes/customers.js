// backend/routes/customers.js
const express  = require('express');
const Customer = require('../models/Customer');
const Invoice  = require('../models/Invoice');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /customers — list all, with search
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const p = Math.max(1, parseInt(page));
    const l = Math.min(200, parseInt(limit));

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ name: 1 }).skip((p - 1) * l).limit(l),
      Customer.countDocuments(filter),
    ]);
    res.json({ customers, total });
  } catch (err) { res.status(500).json({ error: 'Failed to get customers' }); }
});

// GET /customers/:id
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /customers/:id/invoices — all invoices for a customer
router.get('/:id/invoices', async (req, res) => {
  try {
    const invoices = await Invoice
      .find({ customerId: req.params.id })
      .sort({ invoiceDate: -1 })
      .limit(100);
    res.json({ invoices });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /customers
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, gstNo, addressLine1, addressLine2, addressLine3, stateName, stateCode } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });

    const customer = new Customer({
      name, phone, email, gstNo,
      addressLine1, addressLine2, addressLine3,
      stateName: stateName || 'Gujarat',
      stateCode:  stateCode  || '24',
      createdBy: req.caller.sub,
    });
    await customer.save();
    res.status(201).json({ customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /customers/:id
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name','phone','email','gstNo','addressLine1','addressLine2','addressLine3','stateName','stateCode','isActive'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const customer = await Customer.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /customers/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await Customer.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Customer removed' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── Ledger: GET /customers/ledger/all — outstanding per customer ──────────────
router.get('/ledger/all', async (req, res) => {
  try {
    const ledger = await Invoice.aggregate([
      {
        $group: {
          _id:          '$customerId',
          customerName: { $first: '$billedToLine1' },
          totalInvoices:{ $sum: 1 },
          totalAmount:  { $sum: '$totalAmount' },
          paidAmount:   { $sum: '$paidAmount' },
          balance:      { $sum: '$balance' },
          lastInvoice:  { $max: '$invoiceDate' },
        },
      },
      { $match: { balance: { $gt: 0 } } },
      { $sort: { balance: -1 } },
    ]);
    res.json({ ledger });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
