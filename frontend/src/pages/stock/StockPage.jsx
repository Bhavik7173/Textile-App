import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Trash2, ArrowUpCircle, ArrowDownCircle, AlertTriangle, X } from 'lucide-react';
import { stockAPI } from '../../services/api';
import { useFirm } from '../../context/FirmContext';

const today = new Date().toISOString().split('T')[0];

export default function StockPage() {
  const { firms, activeFirm } = useFirm();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [firmFilter, setFirmFilter] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [entryModal, setEntryModal] = useState(null); // { item, type }
  const [histModal, setHistModal]   = useState(null); // item
  const [history, setHistory]       = useState([]);
  const [toast, setToast]           = useState('');

  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 3000); }, []);

  const [form, setForm] = useState({ itemName:'', hsnSac:'', uom:'MTR', quantity:0, minQuantity:0, rate:0, notes:'' });
  const [entry, setEntry] = useState({ quantity:'', rate:'', reason:'', refNo:'', date: today });

  useEffect(() => {
    if (activeFirm && !firmFilter) setFirmFilter(activeFirm._id);
  }, [activeFirm]);

  const load = useCallback(async () => {
    if (!firmFilter) return;
    setLoading(true);
    try {
      const { data } = await stockAPI.list({ firmId: firmFilter });
      setItems(data.items || []);
    } catch { showToast('Failed to load stock'); }
    finally { setLoading(false); }
  }, [firmFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await stockAPI.create({ ...form, firmId: firmFilter });
      setAddModal(false);
      setForm({ itemName:'', hsnSac:'', uom:'MTR', quantity:0, minQuantity:0, rate:0, notes:'' });
      showToast('Stock item added');
      load();
    } catch { showToast('Failed to add item'); }
  };

  const handleEntry = async (e) => {
    e.preventDefault();
    try {
      await stockAPI.addEntry(entryModal.item._id, { ...entry, type: entryModal.type });
      setEntryModal(null);
      setEntry({ quantity:'', rate:'', reason:'', refNo:'', date: today });
      showToast(`Stock ${entryModal.type === 'in' ? 'added' : 'removed'} successfully`);
      load();
    } catch (err) { showToast(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this stock item?')) return;
    await stockAPI.delete(id);
    showToast('Deleted');
    load();
  };

  const openHistory = async (item) => {
    setHistModal(item);
    const { data } = await stockAPI.entries(item._id);
    setHistory(data.entries || []);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const setE = (k) => (e) => setEntry(p => ({ ...p, [k]: e.target.value }));

  const lowStock = items.filter(i => i.minQuantity > 0 && i.quantity <= i.minQuantity);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Package size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock / Inventory</h1>
            <p className="text-sm text-gray-400">{items.length} items · {lowStock.length} low stock</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select className="input text-sm" value={firmFilter} onChange={e => setFirmFilter(e.target.value)}>
            {firms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
          <button onClick={() => setAddModal(true)} className="btn-primary"><Plus size={15}/> Add Item</button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle size={16}/> <b>{lowStock.length} item(s) below minimum stock:</b> {lowStock.map(i => i.itemName).join(', ')}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Package size={40} className="mb-3 opacity-20"/>
            <p className="font-semibold text-gray-500">No stock items yet</p>
            <button onClick={() => setAddModal(true)} className="btn-primary mt-4"><Plus size={15}/> Add First Item</button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Item Name</th><th>HSN</th><th>UOM</th>
              <th className="text-right">Current Stock</th>
              <th className="text-right">Min Stock</th>
              <th className="text-right">Rate</th>
              <th className="text-center">Actions</th>
            </tr></thead>
            <tbody>
              {items.map(item => {
                const isLow = item.minQuantity > 0 && item.quantity <= item.minQuantity;
                return (
                  <tr key={item._id} className={isLow ? 'bg-amber-50/50' : ''}>
                    <td>
                      <button onClick={() => openHistory(item)} className="font-semibold text-indigo-600 hover:underline text-left">
                        {item.itemName}
                      </button>
                      {isLow && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Low</span>}
                    </td>
                    <td className="text-gray-500">{item.hsnSac || '—'}</td>
                    <td className="text-gray-500">{item.uom}</td>
                    <td className={`text-right font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity}</td>
                    <td className="text-right text-gray-500">{item.minQuantity || '—'}</td>
                    <td className="text-right text-gray-500">₹{item.rate || 0}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setEntryModal({ item, type: 'in' })}
                          className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600" title="Stock In">
                          <ArrowUpCircle size={15}/>
                        </button>
                        <button onClick={() => setEntryModal({ item, type: 'out' })}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500" title="Stock Out">
                          <ArrowDownCircle size={15}/>
                        </button>
                        <button onClick={() => handleDelete(item._id)}
                          className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400">
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Item Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Add Stock Item</h2>
              <button onClick={() => setAddModal(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><label className="label">Item Name *</label><input required className="input" value={form.itemName} onChange={setF('itemName')} placeholder="e.g. Turkey Georgette"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">HSN/SAC</label><input className="input" value={form.hsnSac} onChange={setF('hsnSac')} placeholder="5407"/></div>
                <div><label className="label">UOM</label><input className="input" value={form.uom} onChange={setF('uom')} placeholder="MTR"/></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Opening Stock</label><input type="number" step="any" className="input" value={form.quantity} onChange={setF('quantity')}/></div>
                <div><label className="label">Min Stock</label><input type="number" step="any" className="input" value={form.minQuantity} onChange={setF('minQuantity')}/></div>
                <div><label className="label">Rate (₹)</label><input type="number" step="any" className="input" value={form.rate} onChange={setF('rate')}/></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock In/Out Modal */}
      {entryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-bold text-lg ${entryModal.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                Stock {entryModal.type === 'in' ? 'In ↑' : 'Out ↓'} — {entryModal.item.itemName}
              </h2>
              <button onClick={() => setEntryModal(null)}><X size={18} className="text-gray-400"/></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Current: <b>{entryModal.item.quantity} {entryModal.item.uom}</b></p>
            <form onSubmit={handleEntry} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Quantity *</label><input required type="number" step="any" className="input" value={entry.quantity} onChange={setE('quantity')} placeholder="0"/></div>
                <div><label className="label">Rate (₹)</label><input type="number" step="any" className="input" value={entry.rate} onChange={setE('rate')} placeholder={entryModal.item.rate}/></div>
              </div>
              <div><label className="label">Reason</label><input className="input" value={entry.reason} onChange={setE('reason')} placeholder={entryModal.type === 'in' ? 'Purchase' : 'Sale'}/></div>
              <div><label className="label">Ref No (Invoice/Challan)</label><input className="input" value={entry.refNo} onChange={setE('refNo')} placeholder="INV-0001"/></div>
              <div><label className="label">Date</label><input type="date" className="input" value={entry.date} onChange={setE('date')}/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEntryModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className={`flex-1 font-semibold px-5 py-2.5 rounded-xl text-white ${entryModal.type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                  Confirm {entryModal.type === 'in' ? 'Stock In' : 'Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {histModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">History — {histModal.itemName}</h2>
              <button onClick={() => setHistModal(null)}><X size={18} className="text-gray-400"/></button>
            </div>
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No entries yet</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Rate</th><th>Reason</th><th>Ref</th></tr></thead>
                <tbody>
                  {history.map(e => (
                    <tr key={e._id}>
                      <td className="text-gray-500">{fmtDate(e.date)}</td>
                      <td><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{e.type === 'in' ? '↑ IN' : '↓ OUT'}</span></td>
                      <td className={`font-semibold ${e.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>{e.type === 'in' ? '+' : '-'}{e.quantity}</td>
                      <td className="text-gray-500">₹{e.rate || 0}</td>
                      <td className="text-gray-500">{e.reason || '—'}</td>
                      <td className="text-gray-500">{e.refNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
