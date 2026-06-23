import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, TrendingDown, Download } from 'lucide-react';
import { ledgerAPI, utilAPI } from '../../services/api';
import { Spinner, EmptyState } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function LedgerPage() {
  const navigate = useNavigate();
  const [ledger, setLedger]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState({ amount: 0, paid: 0, balance: 0 });

  useEffect(() => {
    ledgerAPI.get().then(({ data }) => {
      setLedger(data.ledger);
      const t = data.ledger.reduce((acc, row) => ({
        amount:  acc.amount  + (row.totalAmount || 0),
        paid:    acc.paid    + (row.paidAmount  || 0),
        balance: acc.balance + (row.balance     || 0),
      }), { amount: 0, paid: 0, balance: 0 });
      setTotal(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleExport = () => utilAPI.exportExcel({});

  if (loading) return <div className="flex justify-center h-screen items-center"><Spinner size="lg" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
          <p className="text-gray-500 text-sm">Customer-wise outstanding balance</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download size={16} /> Export Excel
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Total billed</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(total.amount)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Total collected</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(total.paid)}</p>
        </div>
        <div className="card p-5 border-red-100">
          <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
            <AlertTriangle size={13} className="text-red-400" /> Total outstanding
          </p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(total.balance)}</p>
        </div>
      </div>

      {ledger.length === 0 ? (
        <EmptyState icon={BookOpen} title="No outstanding balances"
          subtitle="All invoices are fully paid!" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Customer','Invoices','Total Billed','Paid','Outstanding','Last Invoice',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {ledger.map((row, i) => {
                const pct = row.totalAmount > 0
                  ? Math.round((row.paidAmount / row.totalAmount) * 100)
                  : 0;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row._id || 'Unknown'}</p>
                      {row.overdueCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-0.5">
                          <AlertTriangle size={10} /> {row.overdueCount} overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.totalInvoices}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(row.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-green-700 font-medium">{formatCurrency(row.paidAmount)}</span>
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-base ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(row.balance || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(row.lastInvoice)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/invoices?search=${encodeURIComponent(row._id || '')}`)}
                        className="text-xs text-blue-600 hover:underline">View invoices →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
