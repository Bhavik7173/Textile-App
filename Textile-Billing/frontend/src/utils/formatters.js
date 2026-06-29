export const formatCurrency = (n) =>
  '₹' + (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatInvoiceNo = (n) => n || '—';

export const statusBadgeClass = (s) =>
  s === 'paid' ? 'badge-paid' : s === 'overdue' ? 'badge-overdue' : 'badge-pending';

export const statusLabel = (s) =>
  s === 'paid' ? 'Paid' : s === 'overdue' ? 'Overdue' : 'Pending';

export function calcGST({ quantity, rate, gstRate = 5, isInterState = false }) {
  const gross = parseFloat((quantity * rate).toFixed(2));
  if (isInterState) {
    const igst = parseFloat(((gross * gstRate) / 100).toFixed(2));
    return { grossAmount: gross, sgstRate: 0, cgstRate: 0, igstRate: gstRate, sgstAmt: 0, cgstAmt: 0, igstAmt: igst, totalAmount: parseFloat((gross + igst).toFixed(2)) };
  }
  const half = gstRate / 2;
  const sgst = parseFloat(((gross * half) / 100).toFixed(2));
  const cgst = parseFloat(((gross * half) / 100).toFixed(2));
  return { grossAmount: gross, sgstRate: half, cgstRate: half, igstRate: 0, sgstAmt: sgst, cgstAmt: cgst, igstAmt: 0, totalAmount: parseFloat((gross + sgst + cgst).toFixed(2)) };
}
