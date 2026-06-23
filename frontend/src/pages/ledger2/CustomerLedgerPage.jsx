import { useState, useCallback } from 'react';
import { BookOpen, Search, Printer } from 'lucide-react';
import { reportAPI } from '../../services/api';
import { useFirm } from '../../context/FirmContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CustomerLedgerPage() {
  const { firms, activeFirm } = useFirm();
  const [customer, setCustomer] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [data, setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]  = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!customer.trim()) return;
    setLoading(true); setError('');
    try {
      const params = { customer: customer.trim() };
      if (firmFilter) params.firmId = firmFilter;
      const res = await reportAPI.customerLedger(params);
      setData(res.data);
    } catch { setError('Customer not found or no invoices'); }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!data) return;
    const rows = data.invoices.map(inv => `
      <tr>
        <td>${formatDate(inv.invoiceDate)}</td>
        <td>${inv.invoiceNo}</td>
        <td>${inv.itemName || ''}</td>
        <td style="text-align:right">${(inv.totalAmount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="text-align:right;color:green">${(inv.paidAmount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="text-align:right;color:${(inv.balance||0)>0?'red':'green'}">${(inv.balance||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="text-align:center"><span style="background:${inv.status==='paid'?'#d1fae5':inv.status==='overdue'?'#fee2e2':'#fef3c7'};color:${inv.status==='paid'?'#065f46':inv.status==='overdue'?'#991b1b':'#92400e'};padding:1px 6px;border-radius:4px;font-size:10px">${inv.status}</span></td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Customer Ledger</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
    body{font-size:10px;padding:12mm;}
    h1{font-size:18px;margin-bottom:4px;}h2{font-size:12px;color:#555;margin-bottom:16px;}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
    .s{background:#f8f8f8;border:1px solid #eee;border-radius:6px;padding:8px 12px;}
    .s-label{font-size:9px;color:#888;margin-bottom:2px;}
    .s-val{font-size:14px;font-weight:bold;}
    table{width:100%;border-collapse:collapse;}
    th{background:#222;color:#fff;padding:6px;text-align:left;}
    td{padding:5px 6px;border-bottom:1px solid #eee;}
    @media print{@page{size:A4;margin:10mm;}}</style></head>
    <body>
    <h1>Customer Ledger</h1>
    <h2>${data.customer} — ${activeFirm?.name || ''}</h2>
    <div class="summary">
      <div class="s"><div class="s-label">Total Billed</div><div class="s-val">₹${(data.totalBilled||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</div></div>
      <div class="s"><div class="s-label">Total Paid</div><div class="s-val" style="color:green">₹${(data.totalPaid||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</div></div>
      <div class="s"><div class="s-label">Outstanding</div><div class="s-val" style="color:${data.totalBalance>0?'red':'green'}">₹${(data.totalBalance||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</div></div>
    </div>
    <table><thead><tr><th>Date</th><th>Invoice No</th><th>Item</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p style="margin-top:16px;font-size:9px;color:#888;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <BookOpen size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Ledger</h1>
          <p className="text-sm text-gray-400">Full account statement per customer</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Customer Name</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-9" placeholder="Search customer name..." value={customer} onChange={e => setCustomer(e.target.value)}/>
          </div>
        </div>
        <div>
          <label className="label">Firm (optional)</label>
          <select className="input" value={firmFilter} onChange={e => setFirmFilter(e.target.value)}>
            <option value="">All Firms</option>
            {firms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
        {data && (
          <button type="button" onClick={handlePrint} className="btn-secondary">
            <Printer size={15}/> Print Ledger
          </button>
        )}
      </form>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Billed</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalBilled)}</p>
              <p className="text-xs text-gray-400">{data.invoices.length} invoices</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalPaid)}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Outstanding</p>
              <p className={`text-2xl font-bold ${data.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(data.totalBalance)}
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="table-wrap"><table className="data-table">
              <thead><tr>
                <th>Date</th><th>Invoice No</th><th>Item</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                {data.invoices.map(inv => (
                  <tr key={inv._id}>
                    <td className="text-gray-500 text-xs">{formatDate(inv.invoiceDate)}</td>
                    <td className="font-semibold text-indigo-600">{inv.invoiceNo}</td>
                    <td className="text-gray-600 text-xs max-w-[120px]"><span className="truncate block">{inv.itemName}</span></td>
                    <td className="text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                    <td className="text-right text-green-600">{formatCurrency(inv.paidAmount || 0)}</td>
                    <td className={`text-right font-bold ${(inv.balance||0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(inv.balance || 0)}
                    </td>
                    <td>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </>
      )}
    </div>
  );
}
