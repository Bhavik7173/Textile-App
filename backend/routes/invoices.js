const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const Invoice  = require('../models/Invoice');
const Company  = require('../models/Company');
const Firm     = require('../models/Firm');
const Agent    = require('../models/Agent');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const Activity = require('../models/Activity');
const { generateInvoicePDF }  = require('../services/pdfService');
const { sendInvoiceEmail }    = require('../services/emailService');

const router = express.Router();
router.use(authMiddleware);

// ─── POST /invoices ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    if (!b.invoiceNo || !b.invoiceDate || !b.itemName)
      return res.status(400).json({ error: 'invoiceNo, invoiceDate and itemName are required' });

    const agent = await Agent.findById(req.caller.sub);
    if (!agent) return res.status(400).json({ error: 'Agent not found' });

    const qty   = parseFloat(b.quantity) || 0;
    const rate  = parseFloat(b.rate) || 0;
    const gross = parseFloat((qty * rate).toFixed(2));
    const sgst  = parseFloat(b.sgstAmt) || 0;
    const cgst  = parseFloat(b.cgstAmt) || 0;
    const igst  = parseFloat(b.igstAmt) || 0;
    const total = parseFloat((gross + sgst + cgst + igst).toFixed(2));
    const pcs   = parseInt(b.pieces) || 0;
    const net   = pcs > 0 ? parseFloat((total / pcs).toFixed(2)) : 0;

    const invoice = new Invoice({
      agentId: agent._id, agentName: agent.name,
      firmId:        b.firmId        || null,
      paymentTerm:   b.paymentTerm   || null,
      totalDiscount: parseFloat(b.totalDiscount) || 0,
      billedPanNo:   b.billedPanNo   || null,
      ...b,
      quantity: qty, rate, grossAmount: gross,
      sgstAmt: sgst, cgstAmt: cgst, igstAmt: igst,
      totalAmount: total, netRate: net, amount: gross,
      status: 'pending',
    });
    await invoice.save();

    // Log activity
    try {
      await Activity.create({
        type:      'invoice_created',
        title:     `Invoice ${invoice.invoiceNo} created`,
        subtitle:  `${invoice.billedToLine1} — ₹${invoice.totalAmount?.toLocaleString('en-IN')}`,
        agentId:   req.caller.sub,
        agentName: agent.name,
        refId:     invoice._id.toString(),
        refNo:     invoice.invoiceNo,
        amount:    invoice.totalAmount,
      });
    } catch {}

    res.status(201).json({ invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// ─── GET /invoices ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.caller.role === 'admin';
    const { status, agentId, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (!isAdmin)       filter.agentId = req.caller.sub;
    else if (agentId)   filter.agentId = agentId;
    if (status)         filter.status  = status;
    if (req.query.firmId) filter.firmId = req.query.firmId;
    if (search) {
      const re = { $regex: search, $options: 'i' };
      filter.$or = [{ invoiceNo: re }, { billedToLine1: re }, { itemName: re }, { agentName: re }];
    }

    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));
    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ invoiceDate: -1 }).skip((p - 1) * l).limit(l),
      Invoice.countDocuments(filter),
    ]);
    res.json({ invoices, total, page: p, limit: l, pages: Math.ceil(total / l) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

// ─── GET /invoices/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (req.caller.role !== 'admin' && invoice.agentId.toString() !== req.caller.sub)
      return res.status(403).json({ error: 'Access denied' });
    res.json({ invoice });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ─── PUT /invoices/:id/status ─────────────────────────────────────────────────
router.put('/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['paid', 'pending', 'overdue'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ─── GET /invoices/:id/pdf ────────────────────────────────────────────────────
// Generate PDF and return as download
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Access control
    if (req.caller.role !== 'admin' && invoice.agentId.toString() !== req.caller.sub)
      return res.status(403).json({ error: 'Access denied' });

    const company = await Company.findOne();
    if (!company) return res.status(400).json({ error: 'Company settings not configured' });

    // Use the firm that was active when this invoice was created
    const firm = invoice.firmId
      ? (await Firm.findById(invoice.firmId)) || company
      : company;

    console.log(`📄 Generating PDF for invoice ${invoice.invoiceNo}...`);
    const { filename, filepath } = await generateInvoicePDF(invoice.toObject(), firm.toObject());

    // Save PDF path on invoice
    await Invoice.findByIdAndUpdate(req.params.id, { pdfPath: filepath });

    // Stream PDF to browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNo}.pdf"`);
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    stream.on('end', () => {
      // Clean up after 30 seconds
      setTimeout(() => { try { fs.unlinkSync(filepath); } catch {} }, 30000);
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed: ' + err.message });
  }
});

// ─── POST /invoices/:id/send-email ───────────────────────────────────────────
// Generate PDF and email it
router.post('/:id/send-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address required' });

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (req.caller.role !== 'admin' && invoice.agentId.toString() !== req.caller.sub)
      return res.status(403).json({ error: 'Access denied' });

    const company = await Company.findOne();
    if (!company) return res.status(400).json({ error: 'Company settings not configured' });
    const firm = invoice.firmId ? (await Firm.findById(invoice.firmId)) || company : company;

    // Generate PDF
    console.log(`📧 Generating PDF + sending email to ${email}...`);
    const { filepath } = await generateInvoicePDF(invoice.toObject(), firm.toObject());

    // Send email
    await sendInvoiceEmail({ to: email, invoice: invoice.toObject(), company: firm.toObject(), pdfPath: filepath });

    // Cleanup PDF after send
    setTimeout(() => { try { fs.unlinkSync(filepath); } catch {} }, 5000);

    res.json({ message: `Invoice sent to ${email}` });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

// ─── POST /invoices/:id/whatsapp ──────────────────────────────────────────────
// Returns a pre-built WhatsApp message URL
router.post('/:id/whatsapp', async (req, res) => {
  try {
    const { phone } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (req.caller.role !== 'admin' && invoice.agentId.toString() !== req.caller.sub)
      return res.status(403).json({ error: 'Access denied' });

    const company = await Company.findOne();
    const total = (invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A';

    const message = `*${company?.name || 'Textile Billing'}*\n\n` +
      `Dear ${invoice.billedToLine1 || 'Customer'},\n\n` +
      `Please find your invoice details below:\n\n` +
      `📋 *Invoice No:* ${invoice.invoiceNo}\n` +
      `📅 *Date:* ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}\n` +
      `📦 *Item:* ${invoice.itemName}\n` +
      `💰 *Amount:* ₹${total}\n` +
      `🗓️ *Due Date:* ${dueDate}\n\n` +
      `Please make the payment before the due date.\n\n` +
      `Thank you for your business! 🙏\n` +
      `_${company?.name} | GST: ${company?.gstNo}_`;

    // Clean phone number
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('91') ? '' : '91'}${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    res.json({ url: whatsappUrl, message });
  } catch (err) {
    console.error('WhatsApp error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// ─── PUT /invoices/bulk-status (bulk update) ─────────────────────────────────
router.put('/bulk-status', adminOnly, async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) return res.status(400).json({ error: 'ids and status required' });
    if (!['paid','pending','overdue'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await Invoice.updateMany({ _id: { $in: ids } }, { status });

    // If marking paid, set balance to 0
    if (status === 'paid') {
      const invoices = await Invoice.find({ _id: { $in: ids } });
      for (const inv of invoices) {
        inv.paidAmount = inv.totalAmount;
        inv.balance    = 0;
        await inv.save();
      }
    }

    res.json({ updated: ids.length });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ─── PUT /invoices/:id/notes ───────────────────────────────────────────────────
router.put('/:id/notes', async (req, res) => {
  try {
    const { notes } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { notes }, { new: true });
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json({ invoice });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ─── POST /invoices/:id/duplicate ────────────────────────────────────────────
router.post('/:id/duplicate', async (req, res) => {
  try {
    const source = await Invoice.findById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Invoice not found' });

    // Get next invoice number
    const last = await Invoice.findOne({}, { invoiceNo: 1 }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (last?.invoiceNo) {
      const match = last.invoiceNo.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    const obj = source.toObject();
    delete obj._id;
    delete obj.createdAt;
    delete obj.updatedAt;
    delete obj.pdfPath;

    const today = new Date();
    const copy = new Invoice({
      ...obj,
      invoiceNo:   `INV-${String(nextNum).padStart(4, '0')}`,
      invoiceDate:  today,
      challanDate:  today,
      dueDate:      null,
      status:       'pending',
      paidAmount:   0,
      balance:      obj.totalAmount,
    });
    await copy.save();
    res.status(201).json({ invoice: copy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to duplicate' });
  }
});

// ─── DELETE /invoices/:id ─────────────────────────────────────────────────────
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    // Clean up PDF if exists
    if (invoice.pdfPath && fs.existsSync(invoice.pdfPath)) {
      try { fs.unlinkSync(invoice.pdfPath); } catch {}
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
