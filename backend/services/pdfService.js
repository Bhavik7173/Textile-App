// pdfService.js — HTML+CSS invoice, A4 print-ready
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const PDF_DIR = path.join(__dirname, '../pdfs');
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

const fmt = (n, d = 2) => (parseFloat(n) || 0).toFixed(d);
const fmtCur = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtInt = (n) => Math.round(parseFloat(n) || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const v = (x, fb = '') => x ?? fb;

function amountInWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function h(n) {
    if (!n) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + h(n % 100);
  }
  const r = Math.floor(amount);
  let s = '';
  if (r >= 10000000) s += h(Math.floor(r / 10000000)) + 'Crore ';
  if (r >= 100000)   s += h(Math.floor((r % 10000000) / 100000)) + 'Lakh ';
  if (r >= 1000)     s += h(Math.floor((r % 100000) / 1000)) + 'Thousand ';
  s += h(r % 1000);
  return (s.trim() || 'Zero') + ' Rupees Only';
}

function buildInvoiceHTML(invoice, company) {
  const isInterState = (invoice.igstAmt || 0) > 0;

  const rows = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : [{
      itemName: invoice.itemName,
      hsnSac: invoice.hsnSac,
      uom: invoice.uom || 'MTR',
      pieces: invoice.pieces,
      quantity: invoice.quantity,
      rate: invoice.rate,
      taxableValue: invoice.grossAmount,
      sgstRate: invoice.sgstRate, cgstRate: invoice.cgstRate, igstRate: invoice.igstRate,
      sgstAmt: invoice.sgstAmt, cgstAmt: invoice.cgstAmt, igstAmt: invoice.igstAmt,
      totalAmount: invoice.totalAmount,
    }];

  let totalTaxable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0;

  const dataRows = rows.map((item, i) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxable = parseFloat(item.taxableValue || item.grossAmount) || (qty * rate);
    const sgstAmt = parseFloat(item.sgstAmt) || 0;
    const cgstAmt = parseFloat(item.cgstAmt) || 0;
    const igstAmt = parseFloat(item.igstAmt) || 0;
    const total = parseFloat(item.totalAmount || (taxable + sgstAmt + cgstAmt + igstAmt));
    totalTaxable += taxable; totalSgst += sgstAmt; totalCgst += cgstAmt; totalIgst += igstAmt;

    const taxCols = isInterState
      ? `<td>${fmtCur(igstAmt)}</td>`
      : `<td>${fmtCur(cgstAmt)}</td><td>${fmtCur(sgstAmt)}</td>`;

    return `<tr>
      <td class="c">${i + 1}</td>
      <td class="l"><b>${v(item.itemName, '')}</b>${item.pieces ? `<br><span class="taka">TAKA ${item.pieces}</span>` : ''}</td>
      <td class="c">${v(item.hsnSac, '')}</td>
      <td class="c">${v(item.uom, 'MTR')}</td>
      <td>${fmt(qty, 2)}</td>
      <td>${fmt(rate, 2)}</td>
      <td>${fmtCur(taxable)}</td>
      ${taxCols}
      <td class="bold">${fmtCur(total)}</td>
    </tr>`;
  }).join('');

  // Pad rows — always show at least 10 empty rows
  const PAD = Math.max(0, 15 - rows.length);
  const colSpan = isInterState ? 9 : 10;
  const emptyCol = isInterState
    ? `<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>`
    : `<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>`;
  const padRows = Array(PAD).fill(`<tr class="pad-row">${emptyCol}</tr>`).join('');

  const totalDiscount = parseFloat(invoice.totalDiscount) || 0;
  const taxTotal = parseFloat((totalSgst + totalCgst + totalIgst).toFixed(3));
  const grandTotal = Math.round(invoice.totalAmount - totalDiscount);

  const cgstRate = rows[0]?.cgstRate || invoice.cgstRate || 0;
  const sgstRate = rows[0]?.sgstRate || invoice.sgstRate || 0;
  const igstRate = rows[0]?.igstRate || invoice.igstRate || 0;

  const taxRows = isInterState
    ? `<div class="row"><span>Add: IGST (${fmt(igstRate, 1)}%)</span><span>${fmtCur(totalIgst)}</span></div>`
    : `<div class="row"><span>Add: CGST (${fmt(cgstRate, 1)}%)</span><span>${fmtCur(totalCgst)}</span></div>
       <div class="row"><span>Add: SGST (${fmt(sgstRate, 1)}%)</span><span>${fmtCur(totalSgst)}</span></div>`;

  const taxHeader = isInterState
    ? `<th>IGST Amt</th>`
    : `<th>CGST Amt</th><th>SGST Amt</th>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Tax Invoice</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
body{background:#ddd;padding:16px;}
.invoice{width:210mm;min-height:297mm;margin:auto;background:#fff;border:1.5px solid #333;font-size:12px;}

.header{display:grid;grid-template-columns:110px 1fr 180px;border-bottom:1.5px solid #333;}
.logo-box{display:flex;align-items:center;justify-content:center;border-right:1px solid #999;padding:10px;color:#aaa;font-size:9px;}
.company{padding:10px 14px;border-right:1px solid #999;text-align:center;}
.company h1{font-size:18px;letter-spacing:.5px;margin-bottom:4px;}
.company p{font-size:8.5px;margin:2px 0;}
.tax{padding:10px;}
.tax div{font-size:8.5px;margin-bottom:4px;}

.invoice-title{text-align:center;font-size:16px;font-weight:700;padding:5px;border-bottom:1px solid #999;}

.customer{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #999;}
.customer .left{padding:6px 10px;border-right:1px solid #999;}
.customer .right{padding:6px 10px;}
.customer .left div,.customer .right div{margin-bottom:5px;font-size:12px;display:flex;  align-items:flex-start;}
.customer p{font-size:11px;margin:2px 0;}
.customer span{
  display:inline;

}
customer .right div{
  display:flex;
  gap:8px;
  margin-bottom:8px;
}

customer .right b{
  min-width:120px;
}

.address{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #999;}
.address>div{padding:6px 10px;}
.address>div:first-child{border-right:1px solid #999;}
.address h4{font-size:12px;font-weight:700;margin-bottom:3px;}
.address p{font-size:12px;margin:2px 0;}

table{width:100%;border-collapse:collapse;border-bottom:1px solid #999;}
th{background:#222;color:#fff;font-size:11px;padding:6px 4px;border:1px solid #444;text-align:center;font-weight:600;}
td{border:1px solid #ccc;padding:4px 5px;font-size:11px;vertical-align:top;}
.c{text-align:center;} .r{text-align:right;} .l{text-align:left;}
td:nth-child(n+5){text-align:right;}
td:nth-child(1){text-align:center;}
td:nth-child(2){text-align:left;}
td:nth-child(3),td:nth-child(4){text-align:center;}
.bold{font-weight:700;}
.taka{font-size:8px;color:#555;}
.pad-row td{height:16px;border-color:#ddd;}

.bottom{display:grid;grid-template-columns:55% 45%;border-bottom:1px solid #999;}
.left-box{padding:8px 10px;border-right:1px solid #999;}
.left-box h4{font-size:9px;font-weight:700;margin:8px 0 3px;}
.left-box h4:first-child{margin-top:0;}
.left-box p{font-size:12px;line-height:1.5;color:#333;}
.summary .row{display:flex;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;}
.summary .row span:first-child{font-weight:600;}
.summary .row span:last-child{font-weight:600;min-width:90px;text-align:right;}
.summary .grand{font-size:12px;font-weight:700;border-bottom:1.5px solid #333 !important;}

.footer{display:flex;justify-content:space-between;align-items:flex-end;padding:8px 14px 10px;    min-height:140px;
    align-items:flex-end;}
.footer .certified{font-size:11px;color:#555;font-style:italic;}
.footer .sign{text-align:right;font-size:9px;
    padding-top:40px;}
.footer .sign b{display:block;margin-top:6px;font-size:14px;}

@media print{
  body{padding:0;background:#fff;}
  .invoice{border:border-box;width:100%;min-height:unset;}
  @page{size:A4;margin:8mm;}
}
</style>
</head>
<body>
<div class="invoice">

  <div class="header">
    <div class="logo-box">LOGO</div>
    <div class="company">
      <h1>${v(company.name, 'MY TEXTILE COMPANY').toUpperCase()}</h1>
      <p>${v(company.address, '')}</p>
      <p><b>Contact:</b> ${v(company.mobile, '')}</p>
      <p><b>Email :</b> ${v(company.email, '')}</p>
    </div>
    <div class="tax">
      <div><b>GST No.:</b> ${v(company.gstNo, '')}</div>
      <div><b>PAN No.:</b> ${v(company.panNo, '')}</div>
    </div>
  </div>

  <div class="invoice-title">TAX INVOICE</div>

  <div class="customer">

    <div class="left">

    <div>
      <b>Name : </b>
      <span>${v(invoice.billedToLine1, '')}</span>
    </div>

    <div>
      <b>Address : </b>
      <span>
        ${[invoice.billedToLine2, invoice.billedToLine3]
      .filter(Boolean)
      .join(', ')}
      </span>
    </div>

    <div>
      <b>GSTIN : </b>
      <span>${v(invoice.billedGSTNo, '')}</span>
    </div>

    <div>
      <b>State : </b>
      <span>${v(invoice.billedStateName, 'GUJARAT').toUpperCase()}</span>

      &nbsp;&nbsp;

      <b>Code : </b>
      <span>${v(invoice.billedStateCode, '24')}</span>
    </div>

  </div>
<div class="right">

  <div>
    <b>Invoice No :</b>
    <span>${v(invoice.invoiceNo, '')}</span>
  </div>

  <div>
    <b>Invoice Date :</b>
    <span>${fmtDate(invoice.invoiceDate)}</span>
  </div>

  <div>
    <b>Challan No :</b>
    <span>${v(invoice.challanNo, '')}</span>
  </div>

  <div>
    <b>Payment Term :</b>
    <span>${v(invoice.paymentTerm, '')}</span>
  </div>

  <div>
    <b>Due Date :</b>
    <span>${fmtDate(invoice.dueDate)}</span>
  </div>

</div>
  </div>

  <div class="address">
    <div>
      <h4>Billing Address :</h4>
      <p>${v(invoice.billedToLine1, '')}</p>
      <p>${[invoice.billedToLine2, invoice.billedToLine3].filter(Boolean).join(', ')}</p>
      <p><b>GSTIN :</b> ${v(invoice.billedGSTNo, '')}</p>
      <p><b>State :</b> ${v(invoice.billedStateName, 'GUJARAT').toUpperCase()} &nbsp; <b>Code :</b> ${v(invoice.billedStateCode, '24')}</p>
    </div>
    <div>
      <h4>Shipping Address :</h4>
      <p>${v(invoice.shippedToLine1 || invoice.billedToLine1, '')}</p>
      <p>${[invoice.shippedToLine2 || invoice.billedToLine2, invoice.shippedToLine3 || invoice.billedToLine3].filter(Boolean).join(', ')}</p>
      <p><b>GSTIN :</b> ${v(invoice.shippedGSTNo || invoice.billedGSTNo, '')}</p>
      <p><b>State :</b> ${v(invoice.shippedStateName || invoice.billedStateName, 'GUJARAT').toUpperCase()} &nbsp; <b>Code :</b> ${v(invoice.shippedStateCode || invoice.billedStateCode, '24')}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:4%">Sr</th>
        <th style="width:26%;text-align:left;">Product Description</th>
        <th style="width:7%">HSN</th>
        <th style="width:6%">UOM</th>
        <th style="width:8%">Qty</th>
        <th style="width:7%">Rate</th>
        <th style="width:12%">Taxable Value</th>
        ${taxHeader}
        <th style="width:10%">Total</th>
      </tr>
    </thead>
    <tbody>
      ${dataRows}
      ${padRows}
    </tbody>
  </table>

  <div class="bottom">
    <div class="left-box">
      <h4>Total Invoice Amount in Words (Rupess)</h4>
      <p>${amountInWords(grandTotal)}</p>
      <h4>Bank Details</h4>
      <p><b>Bank Name :</b> ${v(invoice.bankName || company.bankName, '')}</p>
      <p><b>Bank A/C :</b> ${v(invoice.accountNo || company.accountNo, '')}</p>
      <p><b>Bank IFSC :</b> ${v(invoice.ifscCode || company.ifscCode, '')}</p>
      ${company.upiId ? `
      <h4>UPI Payment</h4>
      <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=upi://pay?pa=${encodeURIComponent(company.upiId)}&pn=${encodeURIComponent(company.name)}&am=${grandTotal}&cu=INR"
          width="60" height="60" style="border:1px solid #ddd;border-radius:4px;" alt="UPI QR"/>
        <div>
          <p style="font-size:7.5px;color:#555;">Scan to pay via UPI</p>
          <p style="font-size:8px;font-weight:700;">${company.upiId}</p>
        </div>
      </div>` : ''}
      <h4>Terms &amp; Condition</h4>
      <p>${v(company.termsAndConditions, '')}</p>
    </div>
    <div class="summary">
      <div class="row"><span>Total Discount On Bill</span><span>${fmtInt(totalDiscount)}</span></div>
      <div class="row"><span>Total Amt. Before Tax</span><span>${fmtCur(totalTaxable)}</span></div>
      ${taxRows}
      <div class="row"><span>Total Tax Amount</span><span>${fmtCur(taxTotal)}</span></div>
      <div class="row grand"><span>Total Amount. (Rs)</span><span>${fmtInt(grandTotal)}</span></div>
    </div>
  </div>

  <div class="footer">
    <div class="certified">Certified that the particulars given above are true &amp; correct</div>
    <div class="sign">
      Authorised signatory<br><br>
      <b>${v(company.name, '').toUpperCase()}</b>
    </div>
  </div>

</div>
</body>
</html>`;
}

async function generateInvoicePDF(invoice, company) {
  const filename = `Invoice_${invoice.invoiceNo}_${Date.now()}.pdf`;
  const filepath = path.join(PDF_DIR, filename);
  const html = buildInvoiceHTML(invoice, company);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filepath,
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
    });
  } finally {
    await browser.close();
  }

  return { filename, filepath };
}

module.exports = { generateInvoicePDF, buildInvoiceHTML };