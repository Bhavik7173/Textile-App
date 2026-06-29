import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Search, Loader2 } from 'lucide-react';
import { invoiceAPI, challanAPI } from '../../services/api';

export default function ChallanPage() {
  const navigate               = useNavigate();
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [generating, setGenerating] = useState(null);
  const [error, setError]         = useState('');

  useEffect(() => { fetchInvoices(); }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const res = await invoiceAPI.list({ limit: 100 });
      setInvoices(res.data.invoices || []);
    } catch {
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(inv) {
    try {
      setGenerating(inv._id);
      setError('');
      await challanAPI.downloadPDF(inv._id, `Challan_${inv.challanNo || inv.invoiceNo}.pdf`);
    } catch (e) {
      setError('Failed to generate challan: ' + e.message);
    } finally {
      setGenerating(null);
    }
  }

  const filtered = invoices.filter(inv =>
    !search ||
    inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
    inv.billedToLine1?.toLowerCase().includes(search.toLowerCase()) ||
    (inv.challanNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (inv.itemName  || '').toLowerCase().includes(search.toLowerCase())
  );

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
  const fmtAmt  = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <FileText size={20} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Challans</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Download challan PDF for any invoice</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                        text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 font-bold text-lg leading-none">×</button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search invoice, customer, challan no, item..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 size={32} className="animate-spin mb-3" />
            <span className="text-sm">Loading invoices...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500">
            <FileText size={40} className="mb-3 opacity-30" />
            <p className="font-medium text-gray-600 dark:text-gray-400">No invoices found</p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search' : 'Create an invoice first'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/invoices/new')}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm
                           font-semibold rounded-xl transition-colors"
              >
                + New Invoice
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-600">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Challan No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Challan PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map(inv => (
                  <tr key={inv._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/invoices/${inv._id}`)}
                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {inv.invoiceNo}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">
                      {inv.billedToLine1 || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {inv.challanNo || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {fmtDate(inv.challanDate || inv.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[160px]">
                      <span className="truncate block">{inv.itemName || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {fmtAmt(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDownload(inv)}
                        disabled={generating === inv._id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5
                                   bg-green-600 hover:bg-green-700 disabled:bg-green-400
                                   text-white text-xs font-semibold rounded-lg
                                   transition-colors disabled:cursor-not-allowed shadow-sm"
                      >
                        {generating === inv._id ? (
                          <><Loader2 size={13} className="animate-spin" /> Generating...</>
                        ) : (
                          <><Download size={13} /> Download</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-50 dark:border-gray-700 text-right">
              <span className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
