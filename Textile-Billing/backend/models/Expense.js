const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  firmId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
  agentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  date:        { type: Date, default: Date.now },
  category:    { type: String, default: 'Purchase' },
  description: { type: String, required: true },
  supplier:    { type: String, default: '' },
  amount:      { type: Number, required: true },
  gstAmt:      { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['cash','cheque','neft','rtgs','upi','other'], default: 'cash' },
  refNo:       { type: String, default: '' },
  notes:       { type: String, default: '' },
}, { timestamps: true });

expenseSchema.index({ firmId: 1 });
expenseSchema.index({ date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
