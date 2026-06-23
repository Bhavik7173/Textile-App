const mongoose = require('mongoose');

const firmSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  address:     { type: String, default: '' },
  businessType:{ type: String, default: '' },
  gstNo:       { type: String, default: '' },
  panNo:       { type: String, default: '' },
  email:       { type: String, default: '' },
  mobile:      { type: String, default: '' },
  stateName:   { type: String, default: 'Gujarat' },
  stateCode:   { type: String, default: '24' },
  bankName:    { type: String, default: '' },
  accountNo:   { type: String, default: '' },
  ifscCode:    { type: String, default: '' },
  branch:      { type: String, default: '' },
  upiId:       { type: String, default: '' },
  termsAndConditions: { type: String, default: "Payment to be made by A/c. Payee's cheque or demand draft only. Subject to local jurisdiction only." },
  logo:        { type: String, default: null },
  color:       { type: String, default: '#0d6eaa' },
}, { timestamps: true });

module.exports = mongoose.model('Firm', firmSchema);
