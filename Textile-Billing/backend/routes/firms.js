const express = require('express');
const Firm    = require('../models/Firm');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /firms — list all firms
router.get('/', async (req, res) => {
  try {
    let firms = await Firm.find().sort({ createdAt: 1 });
    // Seed default firms if none exist
    if (firms.length === 0) {
      firms = await Firm.insertMany([
        { name: 'Om Textile',           address: 'Surat, Gujarat', gstNo: '', color: '#7c3aed' },
        { name: 'Radhey Shyam Textile', address: 'Surat, Gujarat', gstNo: '', color: '#0d6eaa' },
        { name: 'Riya Textile',         address: 'Surat, Gujarat', gstNo: '', color: '#059669' },
      ]);
    }
    res.json({ firms });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /firms/:id — single firm
router.get('/:id', async (req, res) => {
  try {
    const firm = await Firm.findById(req.params.id);
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    res.json({ firm });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /firms — create new firm (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const firm = await Firm.create(req.body);
    res.status(201).json({ firm });
  } catch (err) { res.status(500).json({ error: 'Failed to create firm' }); }
});

// PUT /firms/:id — update firm (admin only)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const firm = await Firm.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
    res.json({ firm });
  } catch (err) { res.status(500).json({ error: 'Failed to update firm' }); }
});

// DELETE /firms/:id — delete firm (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Firm.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
