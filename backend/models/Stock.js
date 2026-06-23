const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  firmId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
  agentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  itemName:    { type: String, required: true },
  hsnSac:      { type: String, default: '' },
  uom:         { type: String, default: 'MTR' },
  quantity:    { type: Number, default: 0 },   // current stock
  minQuantity: { type: Number, default: 0 },   // low stock threshold
  rate:        { type: Number, default: 0 },   // avg purchase rate
  notes:       { type: String, default: '' },
}, { timestamps: true });

stockSchema.index({ firmId: 1 });
stockSchema.index({ itemName: 1 });

module.exports = mongoose.model('Stock', stockSchema);
