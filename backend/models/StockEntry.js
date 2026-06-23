const mongoose = require('mongoose');

const stockEntrySchema = new mongoose.Schema({
  firmId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
  agentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  stockId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
  itemName:  { type: String },
  type:      { type: String, enum: ['in','out'], required: true },
  quantity:  { type: Number, required: true },
  rate:      { type: Number, default: 0 },
  reason:    { type: String, default: '' },  // purchase / sale / adjustment
  refNo:     { type: String, default: '' },  // invoice no / challan no
  date:      { type: Date, default: Date.now },
}, { timestamps: true });

stockEntrySchema.index({ stockId: 1 });
stockEntrySchema.index({ firmId: 1 });

module.exports = mongoose.model('StockEntry', stockEntrySchema);
