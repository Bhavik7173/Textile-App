const express = require('express');
const Challan = require('../models/Challan');
const Agent   = require('../models/Agent');
const Company = require('../models/Company');
const Firm    = require('../models/Firm');
const { authMiddleware } = require('../middleware/auth');
const { generateChallanPDF } = require('../services/challanService');
const fs = require('fs');

const router = express.Router();
router.use(authMiddleware);

// ── POST /challans — save a new challan ───────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const agent = await Agent.findById(req.caller.sub);
    if (!agent) return res.status(400).json({ error: 'Agent not found' });

    const b = req.body;
    const challan = new Challan({
      firmId:       b.firmId       || null,
      agentId:      agent._id,
      agentName:    agent.name,
      customerName: b.customerName || '',
      address:      b.address      || '',
      broker:       b.broker       || '',
      challanNo:    b.challanNo    || '',
      date:         b.date         || new Date(),
      quality:      b.quality      || '',
      remarks:      b.remarks      || '',
      headers:      b.headers      || {},
      table1:       b.table1       || [],
      table2:       b.table2       || [],
      totalCol1:    b.totalCol1    ?? 0,
      totalCol2:    b.totalCol2    ?? 0,
      totalCol3:    parseFloat(b.totalCol3) || 0,
      totalCol4:    parseFloat(b.totalCol4) || 0,
    });
    await challan.save();
    res.status(201).json({ challan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save challan' });
  }
});

// ── GET /challans — list all challans for agent ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.caller.role === 'admin';
    const filter  = isAdmin ? {} : { agentId: req.caller.sub };
    const { search, firmId } = req.query;
    if (firmId)  filter.firmId = firmId;
    if (search) {
      const re = { $regex: search, $options: 'i' };
      filter.$or = [{ challanNo: re }, { customerName: re }, { quality: re }];
    }
    const challans = await Challan.find(filter).sort({ date: -1 }).limit(200);
    res.json({ challans });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get challans' });
  }
});

// ── GET /challans/:id — single challan ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const challan = await Challan.findById(req.params.id);
    if (!challan) return res.status(404).json({ error: 'Not found' });
    if (req.caller.role !== 'admin' && challan.agentId.toString() !== req.caller.sub)
      return res.status(403).json({ error: 'Access denied' });
    res.json({ challan });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /challans/:id/pdf — generate PDF ─────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  try {
    const challan = await Challan.findById(req.params.id);
    if (!challan) return res.status(404).json({ error: 'Not found' });
    if (req.caller.role !== 'admin' && challan.agentId.toString() !== req.caller.sub)
      return res.status(403).json({ error: 'Access denied' });

    const company = await Company.findOne();
    const firm = challan.firmId
      ? (await Firm.findById(challan.firmId)) || company
      : (company || { name: '', address: '', gstNo: '', mobile: '', email: '', termsAndConditions: '' });
    if (!firm) return res.status(400).json({ error: 'Company not configured' });

    const { filepath } = await generateChallanPDF(challan.toObject(), firm.toObject());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Challan_${challan.challanNo || challan._id}.pdf"`);
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    stream.on('end', () => {
      setTimeout(() => { try { fs.unlinkSync(filepath); } catch {} }, 30000);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF generation failed: ' + err.message });
  }
});

// ── DELETE /challans/:id ──────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const challan = await Challan.findById(req.params.id);
    if (!challan) return res.status(404).json({ error: 'Not found' });
    if (req.caller.role !== 'admin' && challan.agentId.toString() !== req.caller.sub)
      return res.status(403).json({ error: 'Access denied' });
    await challan.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
