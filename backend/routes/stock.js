const express    = require('express');
const Stock      = require('../models/Stock');
const StockEntry = require('../models/StockEntry');
const Agent      = require('../models/Agent');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /stock?firmId= — list all stock items for a firm
router.get('/', async (req, res) => {
  try {
    const { firmId } = req.query;
    const filter = firmId ? { firmId } : {};
    const items = await Stock.find(filter).sort({ itemName: 1 });
    res.json({ items });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /stock — create stock item
router.post('/', async (req, res) => {
  try {
    const agent = await Agent.findById(req.caller.sub);
    const item = await Stock.create({ ...req.body, agentId: agent._id });
    res.status(201).json({ item });
  } catch (err) { res.status(500).json({ error: 'Failed to create stock item' }); }
});

// PUT /stock/:id — update stock item details
router.put('/:id', async (req, res) => {
  try {
    const item = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /stock/:id — delete stock item
router.delete('/:id', async (req, res) => {
  try {
    await Stock.findByIdAndDelete(req.params.id);
    await StockEntry.deleteMany({ stockId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /stock/:id/entry — add stock in/out entry
router.post('/:id/entry', async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ error: 'Stock item not found' });

    const { type, quantity, rate, reason, refNo, date } = req.body;
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

    // Update stock quantity
    const delta = type === 'in' ? qty : -qty;
    const newQty = parseFloat((stock.quantity + delta).toFixed(3));
    if (newQty < 0) return res.status(400).json({ error: 'Insufficient stock' });

    await Stock.findByIdAndUpdate(req.params.id, {
      quantity: newQty,
      ...(type === 'in' && rate ? { rate: parseFloat(rate) } : {}),
    });

    const entry = await StockEntry.create({
      firmId:   stock.firmId,
      agentId:  req.caller.sub,
      stockId:  stock._id,
      itemName: stock.itemName,
      type, quantity: qty, rate: rate || stock.rate,
      reason: reason || (type === 'in' ? 'Purchase' : 'Sale'),
      refNo: refNo || '',
      date: date || new Date(),
    });

    const updated = await Stock.findById(req.params.id);
    res.status(201).json({ entry, item: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

// GET /stock/:id/entries — history for one item
router.get('/:id/entries', async (req, res) => {
  try {
    const entries = await StockEntry.find({ stockId: req.params.id }).sort({ date: -1 }).limit(100);
    res.json({ entries });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
