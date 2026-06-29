// challanService.js — Delivery Challan PDF generator
const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

const PDF_DIR = path.join(__dirname, '../pdfs');
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const v       = (x, fb = '') => x || fb;

function buildChallanHTML(invoice, company) {
  const items     = (invoice.items && invoice.items.length > 0) ? invoice.items : [];
  const totalPcs  = items.reduce((s, i) => s + (parseFloat(i.pieces)   || 0), 0) || parseFloat(invoice.pieces)   || 0;
  const totalMtr  = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0) || parseFloat(invoice.quantity) || 0;

  const buildGrid = (startIdx) => {
    let rows = '';
    for (let r = 0; r < 14; r++) {
      const item = items[startIdx + r];
      rows += `<tr>
        <td>${item ? v(item.itemName) : ''}</td>
        <td>${item ? v(item.hsnSac)   : ''}</td>
        <td>${item ? (parseFloat(item.pieces)   || '') : ''}</td>
        <td>${item ? (parseFloat(item.quantity) || '') : ''}</td>
      </tr>`;
    }
    return rows;
  };

  const logoHTML = company.logo
    ? `<img src="${company.logo}" style="max-width:110px;max-height:60px;object-fit:contain;" alt="logo"/>`
    : `<div style="font-size:20px;font-weight:900;letter-spacing:-1px;color:#fff;border:2px solid #fff;padding:4px 10px;">
         ${v(company.name, '').substring(0, 3).toUpperCase()}
       </div>
       <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:#fff;margin-top:4px;">ENTERPRISE</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Delivery Challan</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
body{background:#fff;font-size:9px;}
.challan{width:210mm;min-height:297mm;background:#fff;border:1.5px solid #333;}

.header{display:grid;grid-template-columns:1fr 130px;border-bottom:1.5px solid #333;}
.company-info{padding:8px 12px;border-right:1.5px solid #333;}
.company-info .sub{font-size:7.5px;color:#666;margin-bottom:3px;}
.company-info h1{font-size:16px;font-weight:900;color:#0d6eaa;margin-bottom:2px;}
.company-info .btype{font-size:8.5px;color:#0d6eaa;font-weight:700;margin-bottom:2px;}
.company-info .addr{font-size:8px;color:#333;line-height:1.5;margin-bottom:2px;}
.company-info .gst{font-size:8px;font-weight:700;color:#0d6eaa;}
.company-info .contact{font-size:8px;color:#333;margin-top:1px;}
.logo-box{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;background:#0d6eaa;}

.title-bar{text-align:center;font-size:12px;font-weight:700;padding:4px;border-bottom:1.5px solid #333;letter-spacing:3px;}

.field-single{padding:4px 10px;border-bottom:1px solid #999;font-size:9px;display:flex;align-items:center;}
.field-single label{font-weight:700;min-width:38px;margin-right:4px;}
.field-single .val{flex:1;border-bottom:1px solid #aaa;min-height:12px;padding-bottom:1px;}

.field-row-three{display:grid;grid-template-columns:1fr 130px 110px;border-bottom:1.5px solid #333;}
.f{padding:4px 10px;border-right:1px solid #999;font-size:9px;}
.f:last-child{border-right:none;}
.f label{font-weight:700;display:block;margin-bottom:2px;}
.f .val{border-bottom:1px solid #aaa;min-height:12px;padding-bottom:1px;}

.quality-row{padding:4px 10px;border-bottom:1.5px solid #333;font-size:9px;display:flex;align-items:center;gap:8px;}
.quality-row label{font-weight:700;white-space:nowrap;}
.quality-row .val{flex:1;border-bottom:1px solid #aaa;min-height:12px;}

.grid-section{border-bottom:1.5px solid #333;}
.grid-section table{width:100%;border-collapse:collapse;table-layout:fixed;}
.grid-section table td{border:1px solid #bbb;height:18px;padding:1px 3px;width:25%;font-size:8.5px;vertical-align:middle;}

.section-gap{height:8px;border-bottom:1px dashed #ccc;background:#fafafa;}

.totals-section{display:grid;grid-template-columns:55% 45%;border-bottom:1.5px solid #333;}
.totals-left{padding:6px 10px;border-right:1.5px solid #333;}
.totals-right{padding:6px 10px;}
.tot-row{display:flex;align-items:center;margin-bottom:5px;font-size:9px;}
.tot-row label{font-weight:700;min-width:100px;}
.tot-row .val{flex:1;border-bottom:1px solid #aaa;min-height:12px;padding:0 2px;}

.remarks-section{display:grid;grid-template-columns:55% 45%;border-bottom:1.5px solid #333;}
.remarks-box{padding:5px 10px;border-right:1.5px solid #333;font-size:9px;}
.remarks-box label{font-weight:700;display:block;margin-bottom:3px;}
.remarks-lines div{border-bottom:1px solid #ddd;height:13px;margin-bottom:3px;}
.guarantee-box{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#c00;text-align:center;padding:8px;}

.footer-sigs{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #999;}
.f-cell{padding:4px 10px;border-right:1px solid #ddd;font-size:8.5px;}
.f-cell:last-child{border-right:none;}
.f-cell label{font-weight:700;display:block;margin-bottom:2px;}
.f-cell .sign-line{border-bottom:1px solid #999;height:18px;margin-top:4px;}
.footer-note{padding:4px 10px;font-size:7.5px;color:#555;line-height:1.6;font-style:italic;}
</style>
</head>
<body>
<div class="challan">

  <!-- HEADER -->
  <div class="header">
    <div class="company-info">
      <div class="sub">॥ શ્રી ॥</div>
      <h1>${v(company.name).toUpperCase()}</h1>
      ${company.businessType ? `<div class="btype">${company.businessType}</div>` : ''}
      <div class="addr">${v(company.address)}</div>
      <div class="gst">GSTIN : ${v(company.gstNo)}</div>
      ${company.mobile ? `<div class="contact">☎ ${company.mobile}</div>` : ''}
      ${company.email  ? `<div class="contact">✉ ${company.email}</div>`  : ''}
    </div>
    <div class="logo-box">${logoHTML}</div>
  </div>

  <!-- TITLE -->
  <div class="title-bar">DELIVERY CHALLAN</div>

  <!-- CUSTOMER NAME -->
  <div class="field-single">
    <label>M/s. :</label>
    <div class="val">${v(invoice.billedToLine1)}</div>
  </div>

  <!-- ADDRESS -->
  <div class="field-single">
    <label>Add. :</label>
    <div class="val">${[invoice.billedToLine2, invoice.billedToLine3].filter(Boolean).join(', ')}</div>
  </div>

  <!-- BROKER / CHALLAN NO / DATE -->
  <div class="field-row-three">
    <div class="f">
      <label>Broker :</label>
      <div class="val"></div>
    </div>
    <div class="f">
      <label>Challan No. :</label>
      <div class="val">${v(invoice.challanNo)}</div>
    </div>
    <div class="f">
      <label>Date :</label>
      <div class="val">${fmtDate(invoice.challanDate || invoice.invoiceDate)}</div>
    </div>
  </div>

  <!-- QUALITY -->
  <div class="quality-row">
    <label>Quality :</label>
    <div class="val">${v(invoice.itemName)}</div>
  </div>

  <!-- TABLE 1 -->
  <div class="grid-section">
    <table><tbody>${buildGrid(0)}</tbody></table>
  </div>

  <!-- GAP -->
  <div class="section-gap"></div>

  <!-- TABLE 2 -->
  <div class="grid-section">
    <table><tbody>${buildGrid(14)}</tbody></table>
  </div>

  <!-- TOTALS -->
  <div class="totals-section">
    <div class="totals-left">
      <div class="tot-row"><label>Total Pieces :</label><div class="val">${totalPcs || ''}</div></div>
      <div class="tot-row"><label>Total Meters :</label><div class="val">${totalMtr || ''}</div></div>
    </div>
    <div class="totals-right">
      <div class="tot-row"><label>Sub Total :</label><div class="val"></div></div>
      <div class="tot-row"><label>Balance :</label><div class="val"></div></div>
    </div>
  </div>

  <!-- REMARKS -->
  <div class="remarks-section">
    <div class="remarks-box">
      <label>Remarks :</label>
      <div class="remarks-lines"><div></div><div></div></div>
    </div>
    <div class="guarantee-box">No Dyeing Guarantee</div>
  </div>

  <!-- SIGNATURES -->
  <div class="footer-sigs">
    <div class="f-cell"><label>Prepared by :</label><div class="sign-line"></div></div>
    <div class="f-cell"><label>Checked by :</label><div class="sign-line"></div></div>
    <div class="f-cell"><label>Rece. Sign :</label><div class="sign-line"></div></div>
  </div>

  <!-- NOTE -->
  <div class="footer-note">
    ${v(company.termsAndConditions, 'All complaints to be made within 24 hours. Quantity to be verified within 24 hours after that it will not be admitted.')}
  </div>

</div>
</body>
</html>`;
}

async function generateChallanPDF(invoice, company) {
  const filename = `Challan_${invoice.challanNo || invoice.invoiceNo}_${Date.now()}.pdf`;
  const filepath = path.join(PDF_DIR, filename);
  const html     = buildChallanHTML(invoice, company);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filepath, format: 'A4', printBackground: true,
      margin: { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' },
    });
  } finally {
    await browser.close();
  }
  return { filename, filepath };
}

module.exports = { generateChallanPDF, buildChallanHTML };
