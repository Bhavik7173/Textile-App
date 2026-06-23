const express  = require('express');
const Expense  = require('../models/Expense');
const Agent    = require('../models/Agent');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /expenses?firmId=&from=&to=
router.get('/', async (req, res) => {
  try {
    const { firmId, from, to, category } = req.query;
    const filter = {};
    if (firmId)   filter.firmId   = firmId;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }
    const expenses = await Expense.find(filter).sort({ date: -1 });
    const total = expenses.reduce((s, e) => s + e.totalAmount, 0);
    res.json({ expenses, total });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /expenses
router.post('/', async (req, res) => {
  try {
    const agent = await Agent.findById(req.caller.sub);
    const b = req.body;
    const gst   = parseFloat(b.gstAmt) || 0;
    const amt   = parseFloat(b.amount) || 0;
    const total = parseFloat((amt + gst).toFixed(2));
    const expense = await Expense.create({
      ...b, agentId: agent._id,
      amount: amt, gstAmt: gst, totalAmount: total,
    });
    res.status(201).json({ expense });
  } catch (err) { res.status(500).json({ error: 'Failed to create expense' }); }
});

// PUT /expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const gst   = parseFloat(b.gstAmt) || 0;
    const amt   = parseFloat(b.amount) || 0;
    const total = parseFloat((amt + gst).toFixed(2));
    const expense = await Expense.findByIdAndUpdate(
      req.params.id, { ...b, amount: amt, gstAmt: gst, totalAmount: total }, { new: true }
    );
    if (!expense) return res.status(404).json({ error: 'Not found' });
    res.json({ expense });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
