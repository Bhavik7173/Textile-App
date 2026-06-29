// backend/models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // Basic info
  name:        { type: String, required: true, trim: true },
  phone:       { type: String, default: null },
  email:       { type: String, default: null },
  gstNo:       { type: String, default: null },

  // Billing address
  addressLine1: { type: String, default: null },
  addressLine2: { type: String, default: null },
  addressLine3: { type: String, default: null },
  stateName:    { type: String, default: 'Gujarat' },
  stateCode:    { type: String, default: '24' },

  // Stats (denormalized for speed)
  totalInvoices:  { type: Number, default: 0 },
  totalAmount:    { type: Number, default: 0 },
  totalPaid:      { type: Number, default: 0 },
  totalOutstanding: { type: Number, default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.index({ name: 1 });
customerSchema.index({ gstNo: 1 });

module.exports = mongoose.model('Customer', customerSchema);
