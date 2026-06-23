// src/components/SpotlightSearch.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, UserCircle, X, ArrowRight, Clock } from 'lucide-react';
import { invoiceAPI, customerAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SpotlightSearch({ open, onClose }) {
  const navigate       = useNavigate();
  const inputRef       = useRef(null);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState({ invoices: [], customers: [] });
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(0);
  const debounced = useDebounce(query, 250);

  // Keyboard listener for Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open ? onClose() : null; // parent handles open
      }
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setResults({ invoices:[], customers:[] }); }
  }, [open]);

  useEffect(() => {
    if (!debounced.trim()) { setResults({ invoices:[], customers:[] }); return; }
    setLoading(true);
    Promise.all([
      invoiceAPI.list({ search: debounced, limit: 5 }),
      customerAPI.list({ search: debounced, limit: 4 }),
    ]).then(([inv, cust]) => {
      setResults({ invoices: inv.data.invoices, customers: cust.data.customers });
      setSelected(0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [debounced]);

  const allResults = [
    ...results.invoices.map(i => ({ type: 'invoice', ...i })),
    ...results.customers.map(c => ({ type: 'customer', ...c })),
  ];

  const handleSelect = useCallback((item) => {
    if (item.type === 'invoice')  navigate(`/invoices/${item._id}`);
    if (item.type === 'customer') navigate(`/customers`);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && allResults[selected]) handleSelect(allResults[selected]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, allResults, selected, handleSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            placeholder="Search invoices, customers..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"/>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={15} className="text-gray-400"/>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.trim() === '' ? (
            <div className="px-4 py-8 text-center">
              <Search size={28} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-sm text-gray-400">Type to search invoices and customers</p>
              <p className="text-xs text-gray-300 mt-1">Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">ESC</kbd> to close</p>
            </div>
          ) : allResults.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">No results for "<strong>{query}</strong>"</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoices</p>
                  {results.invoices.map((inv, i) => {
                    const idx = i;
                    return (
                      <button key={inv._id} onClick={() => handleSelect({ type:'invoice', ...inv })}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          selected === idx ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}>
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText size={14} className="text-indigo-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{inv.invoiceNo}</p>
                          <p className="text-xs text-gray-400 truncate">{inv.billedToLine1} · {formatDate(inv.invoiceDate)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-indigo-600">{formatCurrency(inv.totalAmount)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                            inv.status === 'overdue' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-700'}`}>
                            {inv.status}
                          </span>
                        </div>
                        {selected === idx && <ArrowRight size={14} className="text-indigo-400 ml-1 shrink-0"/>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customers</p>
                  {results.customers.map((cust, i) => {
                    const idx = results.invoices.length + i;
                    return (
                      <button key={cust._id} onClick={() => handleSelect({ type:'customer', ...cust })}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          selected === idx ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}>
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                          <UserCircle size={14} className="text-purple-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{cust.name}</p>
                          <p className="text-xs text-gray-400">{cust.gstNo || cust.phone || 'No GST'}</p>
                        </div>
                        {selected === idx && <ArrowRight size={14} className="text-indigo-400 shrink-0"/>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-50 flex items-center gap-4 bg-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 text-[10px]">↑↓</kbd>
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 text-[10px]">↵</kbd>
            <span>select</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 text-[10px]">ESC</kbd>
            <span>close</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 text-[10px]">Ctrl K</kbd>
            <span>open anywhere</span>
          </div>
        </div>
      </div>
    </div>
  );
}
