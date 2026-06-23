import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, FileText, X, Download, CheckSquare, Square, CheckCircle } from 'lucide-react';
import { invoiceAPI, utilAPI, invoiceBulkAPI } from '../../services/api';
import { EmptyState, Spinner, PageHeader, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFirm } from '../../context/FirmContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUSES = ['All', 'Paid', 'Pending', 'Overdue'];

function SearchInput({ value, onChange, onClear }) {
  return (
    <div className="relative flex-1">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
      <input className="input pl-9" placeholder="Search invoice, customer, item..."
        value={value} onChange={onChange}/>
      {value && (
        <button onClick={onClear} className="absolute right-3 top-1/2 -translate-y-1/2">
          <X size={14} className="text-gray-400 hover:text-gray-600"/>
        </button>
      )}
    </div>
  );
}

// Firm badge — color dot + short name
function FirmBadge({ firmId, firms }) {
  const firm = firms.find(f => f._id === firmId);
  if (!firm) return <span className="text-gray-300 text-xs">—</span>;
  const initial = firm.name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
        style={{ background: firm.color || '#0d6eaa' }}
      >
        {initial}
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[90px]">
        {firm.name}
      </span>
    </div>
  );
}

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { firms } = useFirm();
  const [searchParams] = useSearchParams();

  const [invoices, setInvoices]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [totalAmt, setTotalAmt]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState(searchParams.get('search') || '');
  const [status, setStatus]       = useState(searchParams.get('status')
    ? searchParams.get('status').charAt(0).toUpperCase() + searchParams.get('status').slice(1)
    : 'All');
  const [firmFilter, setFirmFilter] = useState('All');
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast]         = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(''), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search)                       params.search = search;
      if (status !== 'All')             params.status = status.toLowerCase();
      if (firmFilter !== 'All')         params.firmId = firmFilter;
      const { data } = await invoiceAPI.list(params);
      setInvoices(data.invoices);
      setTotal(data.total);
      setTotalAmt(data.invoices.reduce((s, i) => s + i.totalAmount, 0));
      setSelected(new Set());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, status, firmFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, firmFilter]);

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(prev => prev.size === invoices.length ? new Set() : new Set(invoices.map(i => i._id)));
  };

  const handleBulkStatus = async (newStatus) => {
    if (!selected.size) return;
    setBulkLoading(true);
    try {
      await invoiceBulkAPI.bulkStatus([...selected], newStatus);
      showToast(`${selected.size} invoice(s) marked as ${newStatus}`);
      load();
    } catch { showToast('Bulk update failed'); }
    finally { setBulkLoading(false); }
  };

  const pages      = Math.ceil(total / 15);
  const allSelected = selected.size === invoices.length && invoices.length > 0;

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2">
          <CheckCircle size={15}/> {toast}
        </div>
      )}

      <p className="text-xs text-gray-400 mb-1">
        Dashboard / <span className="text-indigo-600 font-medium">{isAdmin ? 'All Invoices' : 'My Invoices'}</span>
      </p>

      <PageHeader
        title={isAdmin ? 'All Invoices' : 'My Invoices'}
        subtitle={`${total} total · ${formatCurrency(totalAmt)} billed`}>
        {isAdmin && (
          <button onClick={() => utilAPI.exportExcel({})} className="btn-secondary text-sm">
            <Download size={15}/> Export
          </button>
        )}
        <button onClick={() => navigate('/invoices/new')} className="btn-primary text-sm">
          <Plus size={15}/> New Invoice
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')}/>
          {/* Status filter */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl shrink-0">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  status === s ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>{s}
              </button>
            ))}
          </div>
        </div>

        {/* Firm filter — only show if multiple firms */}
        {firms.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Firm:</span>
            <button
              onClick={() => setFirmFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                firmFilter === 'All'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              All Firms
            </button>
            {firms.map(firm => (
              <button
                key={firm._id}
                onClick={() => setFirmFilter(firmFilter === firm._id ? 'All' : firm._id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  firmFilter === firm._id
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
                style={firmFilter === firm._id ? { background: firm.color || '#0d6eaa', borderColor: firm.color } : {}}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ background: firmFilter === firm._id ? 'rgba(255,255,255,0.3)' : (firm.color || '#0d6eaa') }}
                >
                  {firm.name.charAt(0).toUpperCase()}
                </div>
                {firm.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 bg-indigo-600 text-white rounded-2xl px-5 py-3 flex items-center gap-4 shadow-lg shadow-indigo-200">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            {['paid','pending','overdue'].map(s => (
              <button key={s} disabled={bulkLoading} onClick={() => handleBulkStatus(s)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold capitalize transition-colors disabled:opacity-50">
                Mark {s}
              </button>
            ))}
            <button onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg"/></div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices found"
            subtitle={firmFilter !== 'All' ? 'No invoices for this firm yet' : 'Try adjusting your search or filters'}
            action="Create invoice" onAction={() => navigate('/invoices/new')}/>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleAll} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        {allSelected ? <CheckSquare size={16} className="text-indigo-600"/> : <Square size={16}/>}
                      </button>
                    </th>
                    {['Invoice No', 'Firm', 'Customer', 'Item', 'Agent', 'Date', 'Amount', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv._id}
                      className={`border-b border-gray-50 hover:bg-indigo-50/40 transition-colors cursor-pointer ${
                        selected.has(inv._id) ? 'bg-indigo-50/60' : ''
                      }`}
                      onClick={() => navigate(`/invoices/${inv._id}`)}
                    >
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(inv._id)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                          {selected.has(inv._id)
                            ? <CheckSquare size={16} className="text-indigo-600"/>
                            : <Square size={16}/>}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-indigo-600">{inv.invoiceNo}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <FirmBadge firmId={inv.firmId} firms={firms} />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{inv.billedToLine1 || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 max-w-[120px]">
                        <span className="truncate block">{inv.itemName}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{inv.agentName}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-400">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={inv.status}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50">
                <p className="text-xs text-gray-400">
                  Showing {((page-1)*15)+1}–{Math.min(page*15, total)} of {total}
                </p>
                <div className="flex gap-1.5">
                  <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">Prev</button>
                  {Array.from({length:Math.min(5,pages)},(_,i)=>{
                    const p = Math.max(1,Math.min(pages-4,page-2))+i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                          page===p ? 'bg-indigo-600 text-white':'border border-gray-200 hover:bg-gray-50'
                        }`}>{p}</button>
                    );
                  })}
                  <button disabled={page===pages} onClick={() => setPage(p=>p+1)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
