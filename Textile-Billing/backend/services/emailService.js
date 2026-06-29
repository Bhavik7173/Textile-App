// emailService.js — Sends invoice PDF via email using Nodemailer
// Supports Gmail (App Password), SMTP relay, or any SMTP provider

const nodemailer = require('nodemailer');
require('dotenv').config();

function createTransporter() {
  // Supports Gmail App Password or any SMTP
  const config = {
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
  return nodemailer.createTransport(config);
}

async function sendInvoiceEmail({ to, invoice, company, pdfPath }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email not configured. Set SMTP_USER and SMTP_PASS in .env');
  }

  const transporter = createTransporter();
  const total = (invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-IN')
    : 'N/A';
  const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString('en-IN');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1a237e;padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h2 style="color:#fff;margin:0">${company.name || 'Textile Billing'}</h2>
    <p style="color:#90caf9;margin:5px 0 0">${company.businessType || ''}</p>
  </div>
  <div style="background:#f8f9fa;padding:20px;border:1px solid #e0e0e0;border-top:none">
    <p>Dear <b>${invoice.billedToLine1 || 'Customer'}</b>,</p>
    <p>Please find your invoice attached. Here is a summary:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#e8eaf6">
        <th style="padding:8px 12px;text-align:left;border:1px solid #c5cae9">Field</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #c5cae9">Details</th>
      </tr>
      ${[
        ['Invoice No',    invoice.invoiceNo],
        ['Invoice Date',  invoiceDate],
        ['Item',          invoice.itemName],
        ['Quantity',      `${invoice.quantity} m (${invoice.pieces} pcs)`],
        ['Gross Amount',  `₹${(invoice.grossAmount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`],
        ['Total Amount',  `₹${total}`],
        ['Due Date',      dueDate],
      ].map(([l,v]) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;color:#555">${l}</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;font-weight:bold">${v || '—'}</td>
      </tr>`).join('')}
    </table>
    <p style="color:#555;font-size:13px">Please make payment before the due date to avoid any late charges.</p>
    <p style="margin-top:20px">Thank you for your business!</p>
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"/>
    <p style="font-size:11px;color:#888">
      ${company.name} | GST: ${company.gstNo}<br/>
      ${company.address}<br/>
      ${company.mobile}
    </p>
  </div>
</body>
</html>`;

  const info = await transporter.sendMail({
    from:     `"${company.name || 'Textile Billing'}" <${process.env.SMTP_USER}>`,
    to,
    subject:  `Invoice ${invoice.invoiceNo} from ${company.name || 'Textile Billing'} — ₹${total}`,
    html,
    attachments: pdfPath ? [{
      filename: `Invoice_${invoice.invoiceNo}.pdf`,
      path:     pdfPath,
    }] : [],
  });

  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
}

async function verifyEmailConfig() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return false;
  try {
    const t = createTransporter();
    await t.verify();
    return true;
  } catch { return false; }
}

module.exports = { sendInvoiceEmail, verifyEmailConfig };
