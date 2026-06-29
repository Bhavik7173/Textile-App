// backend/models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  invoiceNo:   { type: String },
  customerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName:{ type: String },

  amount:       { type: Number, required: true },
  paymentDate:  { type: Date,   required: true, default: Date.now },
  method:       { type: String, enum: ['cash','cheque','neft','rtgs','upi','other'], default: 'cash' },
  referenceNo:  { type: String, default: null }, // cheque no / UTR / UPI ref
  notes:        { type: String, default: null },
  recordedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
}, { timestamps: true });

paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
