// backend/models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type:       { type: String, required: true }, // 'invoice_created' | 'invoice_paid' | 'payment_recorded' | 'customer_added' etc
  title:      { type: String, required: true },
  subtitle:   { type: String, default: null },
  agentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  agentName:  { type: String },
  refId:      { type: String, default: null }, // invoice _id or customer _id
  refNo:      { type: String, default: null }, // invoice number
  amount:     { type: Number, default: null },
  meta:       { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

activitySchema.index({ createdAt: -1 });
activitySchema.index({ agentId: 1 });

module.exports = mongoose.model('Activity', activitySchema);
