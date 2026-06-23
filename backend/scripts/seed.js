const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Agent    = require('../models/Agent');
const Invoice  = require('../models/Invoice');
const Company  = require('../models/Company');

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  await Promise.all([Agent.deleteMany({}), Invoice.deleteMany({}), Company.deleteMany({})]);
  console.log('🗑️  Cleared existing data');

  // Company setup — generic, any textile org can update this via settings
  await Company.create({
    name:         'My Textile Company',
    address:      '123, Industrial Area, Surat-395002',
    businessType: 'Manufacturers & Dealers in Textile',
    gstNo:        '24XXXXX0000X1Z0',
    mobile:       '9876543210',
    stateName:    'Gujarat',
    stateCode:    '24',
    bankName:     'HDFC Bank',
    accountNo:    '12345678901234',
    ifscCode:     'HDFC0001234',
    branch:       'Main Branch',
    termsAndConditions: 'Payment to be made by A/c. Payee\'s cheque or demand draft only. Any complaint should be made within 15 days. Interest @24% p.a. will be charged after due date. Subject to local jurisdiction only.',
  });
  console.log('🏢 Company profile created');

  const admin = await Agent.create({ name: 'Admin User', email: 'admin@company.com', password: 'Admin@1234', phone: '9876543210', role: 'admin' });
  const a1    = await Agent.create({ name: 'Om Textile',  email: 'omtextile@company.com', password: 'Agent@1234', phone: '9876543211', role: 'agent' });
  const a2    = await Agent.create({ name: 'Radhey Shyam Textile', email: 'radheyshyam@company.com', password: 'Agent@1234', phone: '9876543212', role: 'agent' });
  const a3    = await Agent.create({ name: 'Riya Textile', email: 'riyatextile@company.com', password: 'Agent@1234', phone: '9876543213', role: 'agent' });
  console.log('👥 Created 4 users (1 admin, 3 agents)');

  // await Invoice.insertMany([
  //   { agentId: a1._id, agentName: a1.name, orderNo:'1', challanNo:'1', invoiceNo:'INV-0001', invoiceDate: new Date('2024-01-05'), dueDate: new Date('2024-01-15'), billedToLine1:'Kapoor Fabrics Pvt Ltd', billedToLine2:'Ring Road, Udhna', billedToLine3:'Surat-394210', billedStateName:'Gujarat', billedStateCode:'24', billedGSTNo:'24KAPO01234K1Z1', shippedToLine1:'Kapoor Fabrics Pvt Ltd', shippedToLine2:'Ring Road, Udhna', shippedToLine3:'Surat-394210', shippedStateName:'Gujarat', shippedStateCode:'24', shippedGSTNo:'24KAPO01234K1Z1', itemName:'French Chiffon', hsnSac:'5407', pieces:40, quantity:4800, rate:22, amount:105600, sgstRate:2.5, cgstRate:2.5, igstRate:0, sgstAmt:2640, cgstAmt:2640, igstAmt:0, grossAmount:105600, totalAmount:110880, netRate:2772, bankName:'HDFC Bank', accountNo:'12345678901234', ifscCode:'HDFC0001234', branch:'Main Branch', transporterName:'Ganesh Transport', transportationMode:'Truck', vehicleNo:'GJ05CS1234', placeOfSupply:'Surat', status:'paid' },
  //   { agentId: a2._id, agentName: a2.name, orderNo:'2', challanNo:'2', invoiceNo:'INV-0002', invoiceDate: new Date('2024-01-10'), dueDate: new Date('2024-01-20'), billedToLine1:'Sharma Silk House', billedToLine2:'Textile Market', billedToLine3:'Surat-395002', billedStateName:'Gujarat', billedStateCode:'24', billedGSTNo:'24SHARM5678S1Z3', shippedToLine1:'Sharma Silk House', shippedToLine2:'Textile Market', shippedToLine3:'Surat-395002', shippedStateName:'Gujarat', shippedStateCode:'24', shippedGSTNo:'24SHARM5678S1Z3', itemName:'Turkey Georgette', hsnSac:'5407', pieces:60, quantity:7200, rate:18, amount:129600, sgstRate:2.5, cgstRate:2.5, igstRate:0, sgstAmt:3240, cgstAmt:3240, igstAmt:0, grossAmount:129600, totalAmount:136080, netRate:2268, bankName:'HDFC Bank', accountNo:'12345678901234', ifscCode:'HDFC0001234', branch:'Main Branch', transporterName:'Ram Transport', transportationMode:'Tempo', vehicleNo:'GJ05AB5678', placeOfSupply:'Surat', status:'pending' },
  //   { agentId: a1._id, agentName: a1.name, orderNo:'3', challanNo:'3', invoiceNo:'INV-0003', invoiceDate: new Date('2024-01-12'), dueDate: new Date('2024-01-22'), billedToLine1:'Patel Textiles', billedToLine2:'Ashram Road', billedToLine3:'Ahmedabad-380009', billedStateName:'Gujarat', billedStateCode:'24', billedGSTNo:'24PATEL9012P1Z5', shippedToLine1:'Patel Textiles Godown', shippedToLine2:'GIDC Naroda', shippedToLine3:'Ahmedabad-382330', shippedStateName:'Gujarat', shippedStateCode:'24', shippedGSTNo:'24PATEL9012P1Z5', itemName:'Satin Weave', hsnSac:'5407', pieces:50, quantity:6000, rate:24, amount:144000, sgstRate:2.5, cgstRate:2.5, igstRate:0, sgstAmt:3600, cgstAmt:3600, igstAmt:0, grossAmount:144000, totalAmount:151200, netRate:3024, bankName:'HDFC Bank', accountNo:'12345678901234', ifscCode:'HDFC0001234', branch:'Main Branch', transporterName:'Gujarat Transport', transportationMode:'Truck', vehicleNo:'GJ05CD9012', placeOfSupply:'Ahmedabad', status:'overdue' },
  //   { agentId: a3._id, agentName: a3.name, orderNo:'4', challanNo:'4', invoiceNo:'INV-0004', invoiceDate: new Date('2024-01-15'), dueDate: new Date('2024-01-25'), billedToLine1:'Bindraa Sarees', billedToLine2:'Pandesra Road', billedToLine3:'Surat-394221', billedStateName:'Gujarat', billedStateCode:'24', billedGSTNo:'24BINDR4444B1Z5', shippedToLine1:'Bindraa Sarees', shippedToLine2:'Pandesra Road', shippedToLine3:'Surat-394221', shippedStateName:'Gujarat', shippedStateCode:'24', shippedGSTNo:'24BINDR4444B1Z5', itemName:'Velvet Fabric', hsnSac:'5801', pieces:30, quantity:3600, rate:35, amount:126000, sgstRate:2.5, cgstRate:2.5, igstRate:0, sgstAmt:3150, cgstAmt:3150, igstAmt:0, grossAmount:126000, totalAmount:132300, netRate:4410, bankName:'HDFC Bank', accountNo:'12345678901234', ifscCode:'HDFC0001234', branch:'Main Branch', transporterName:'Suresh Transport', transportationMode:'Truck', vehicleNo:'GJ05EF3456', placeOfSupply:'Surat', status:'paid' },
  //   { agentId: a2._id, agentName: a2.name, orderNo:'5', challanNo:'5', invoiceNo:'INV-0005', invoiceDate: new Date('2024-01-18'), dueDate: new Date('2024-01-28'), billedToLine1:'Mehta Cloth Stores', billedToLine2:'MG Road', billedToLine3:'Vadodara-390001', billedStateName:'Gujarat', billedStateCode:'24', billedGSTNo:'24MEHTA7890M1Z2', shippedToLine1:'Mehta Cloth Stores', shippedToLine2:'MG Road', shippedToLine3:'Vadodara-390001', shippedStateName:'Gujarat', shippedStateCode:'24', shippedGSTNo:'24MEHTA7890M1Z2', itemName:'Organza Silk', hsnSac:'5007', pieces:25, quantity:3000, rate:45, amount:135000, sgstRate:5, cgstRate:5, igstRate:0, sgstAmt:6750, cgstAmt:6750, igstAmt:0, grossAmount:135000, totalAmount:148500, netRate:5940, bankName:'HDFC Bank', accountNo:'12345678901234', ifscCode:'HDFC0001234', branch:'Main Branch', transporterName:'Ravi Transport', transportationMode:'Train', vehicleNo:'N/A', placeOfSupply:'Vadodara', status:'pending' },
  // ]);
  console.log('🧾 Created 5 sample invoices');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed complete! Login credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin → admin@company.com  / Admin@1234');
  console.log('  Agent → rahul@company.com  / Agent@1234');
  console.log('  Agent → priya@company.com  / Agent@1234');
  console.log('  Agent → suresh@company.com / Agent@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
