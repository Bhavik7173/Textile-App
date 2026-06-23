const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemName:    { type: String, default: null },
  hsnSac:      { type: String, default: null },
  pieces:      { type: Number, default: 0 },
  quantity:    { type: Number, default: 0 },
  rate:        { type: Number, default: 0 },
  uom:         { type: String, default: 'MTR' },
  discount:    { type: Number, default: 0 },
  billDiscount:{ type: Number, default: 0 },
  taxableValue:{ type: Number, default: 0 },
  gstRate:     { type: Number, default: 5 },
  grossAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  cgstRate: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  sgstAmt:  { type: Number, default: 0 },
  cgstAmt:  { type: Number, default: 0 },
  igstAmt:  { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  firmId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', default: null },
  agentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  agentName:  { type: String },

  // Customer reference (optional — links to Customer master)
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },

  // Payment tracking
  paidAmount:   { type: Number, default: 0 },
  balance:      { type: Number, default: 0 },

  orderNo:    { type: String, default: null },
  challanNo:  { type: String, default: null },
  invoiceNo:  { type: String, required: true },
  challanDate:  { type: Date, default: null },
  invoiceDate:  { type: Date, required: true },
  dueDate:      { type: Date, default: null },
  ewayBillNo:    { type: String, default: null },
  paymentTerm:   { type: String, default: null },
  totalDiscount: { type: Number, default: 0 },
  billedPanNo:   { type: String, default: null },

  transporterName:    { type: String, default: null },
  transportationMode: { type: String, default: null },
  vehicleNo:          { type: String, default: null },
  placeOfSupply:      { type: String, default: null },

  billedToLine1:   { type: String, default: null },
  billedToLine2:   { type: String, default: null },
  billedToLine3:   { type: String, default: null },
  billedStateName: { type: String, default: null },
  billedStateCode: { type: String, default: null },
  billedGSTNo:     { type: String, default: null },

  shippedToLine1:   { type: String, default: null },
  shippedToLine2:   { type: String, default: null },
  shippedToLine3:   { type: String, default: null },
  shippedStateName: { type: String, default: null },
  shippedStateCode: { type: String, default: null },
  shippedGSTNo:     { type: String, default: null },

  // ── Multi-item support ──────────────────────────────────────────────────────
  items: { type: [itemSchema], default: [] },

  // ── Top-level summary fields (for search/display and single-item backward compat)
  itemName: { type: String, required: true },   // comma-joined for multi-item
  hsnSac:   { type: String, default: null },
  pieces:   { type: Number, default: 0 },       // total pieces across all items
  quantity: { type: Number, default: 0 },       // total quantity
  rate:     { type: Number, default: 0 },
  amount:   { type: Number, default: 0 },

  sgstRate: { type: Number, default: 0 },
  cgstRate: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  sgstAmt:  { type: Number, default: 0 },
  cgstAmt:  { type: Number, default: 0 },
  igstAmt:  { type: Number, default: 0 },
  grossAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  netRate:     { type: Number, default: 0 },

  bankName:  { type: String, default: null },
  accountNo: { type: String, default: null },
  ifscCode:  { type: String, default: null },
  branch:    { type: String, default: null },

  status:  { type: String, enum: ['paid', 'pending', 'overdue'], default: 'pending' },
  notes:   { type: String, default: null },
  reminderSet: { type: Boolean, default: false },
  pdfPath: { type: String, default: null },
}, { timestamps: true });

invoiceSchema.index({ agentId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceDate: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
