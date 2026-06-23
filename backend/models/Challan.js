const mongoose = require('mongoose');

const rowSchema = new mongoose.Schema({
  col1: { type: mongoose.Schema.Types.Mixed, default: '' },
  col2: { type: mongoose.Schema.Types.Mixed, default: '' },
  col3: { type: Number, default: null },
  col4: { type: Number, default: null },
}, { _id: false });

const challanSchema = new mongoose.Schema({
  firmId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', default: null },
  agentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  agentName:    { type: String, default: '' },
  customerName: { type: String, default: '' },
  address:      { type: String, default: '' },
  broker:       { type: String, default: '' },
  challanNo:    { type: String, default: '' },
  date:         { type: Date,   default: Date.now },
  quality:      { type: String, default: '' },
  remarks:      { type: String, default: '' },
  headers: {
    col1: { type: String, default: 'Design / Particulars' },
    col2: { type: String, default: 'HSN' },
    col3: { type: String, default: 'Pcs' },
    col4: { type: String, default: 'Meters' },
  },
  table1: { type: [rowSchema], default: [] },
  table2: { type: [rowSchema], default: [] },
  // column-wise totals across both tables
  totalCol1: { type: String,  default: '' },
  totalCol2: { type: String,  default: '' },
  totalCol3: { type: Number,  default: 0 },
  totalCol4: { type: Number,  default: 0 },
}, { timestamps: true });

challanSchema.index({ agentId: 1 });
challanSchema.index({ date: -1 });

module.exports = mongoose.model('Challan', challanSchema);
