// backend/models/Reminder.js
const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  invoiceId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  invoiceNo:   { type: String },
  customerName:{ type: String },
  amount:      { type: Number },
  reminderDate:{ type: Date, required: true },
  note:        { type: String, default: null },
  isDone:      { type: Boolean, default: false },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
}, { timestamps: true });

reminderSchema.index({ reminderDate: 1 });
reminderSchema.index({ isDone: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
