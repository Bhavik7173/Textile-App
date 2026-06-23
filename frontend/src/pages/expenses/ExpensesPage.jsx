import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { expenseAPI } from '../../services/api';
import { useFirm } from '../../context/FirmContext';
import { formatCurrency } from '../../utils/formatters';

const today = new Date().toISOString().split('T')[0];
const CATS = ['Purchase','Transport','Labour','Electricity','Rent','Salary','Maintenance','Other'];
const METHODS = ['cash','cheque','neft','rtgs','upi','other'];

const EMPTY = { date: today, category: 'Purchase', description: '', supplier: '', amount: '', gstAmt: '0', paymentMode: 'cash', refNo: '', notes: '' };

export default function ExpensesPage() {
  const { firms, activeFirm } = useFirm();
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [firmFilter, setFirmFilter] = useState('');
  const [from, setFrom]   = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]       = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [toast, setToast]       = useState('');

  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 3000); }, []);

  useEffect(() => { if (activeFirm && !firmFilter) setFirmFilter(activeFirm._id); }, [activeFirm]);

  const load = useCallback(async () => {
    if (!firmFilter) return;
    setLoading(true);
    try {
      const { data } = await expenseAPI.list({ firmId: firmFilter, from, to });
      setExpenses(data.expenses || []);
      setTotal(data.total || 0);
    } catch { showToast('Failed to load'); }
    finally { setLoading(false); }
  }, [firmFilter, from, to]);

  useEffect(() => { load(); }, [load]);

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await expenseAPI.update(editId, { ...form, firmId: firmFilter });
        showToast('Updated');
      } else {
        await expenseAPI.create({ ...form, firmId: firmFilter });
        showToast('Expense added');
      }
      setShowForm(false); setEditId(null); setForm(EMPTY);
      load();
    } catch { showToast('Failed to save'); }
  };

  const handleEdit = (exp) => {
    setEditId(exp._id);
    setForm({ date: exp.date?.split('T')[0] || today, category: exp.category, description: exp.description,
      supplier: exp.supplier || '', amount: exp.amount, gstAmt: exp.gstAmt || 0,
      paymentMode: exp.paymentMode, refNo: exp.refNo || '', notes: exp.notes || '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await expenseAPI.delete(id);
    showToast('Deleted'); load();
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Receipt size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses / Purchases</h1>
            <p className="text-sm text-gray-400">Total: {formatCurrency(total)}</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }} className="btn-primary">
          <Plus size={15}/> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Firm</label>
          <select className="input" value={firmFilter} onChange={e => setFirmFilter(e.target.value)}>
            {firms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </div>
        <div><label className="label">From</label><input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)}/></div>
        <div><label className="label">To</label><input type="date" className="input" value={to} onChange={e => setTo(e.target.value)}/></div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 mb-5 border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white">{editId ? 'Edit' : 'Add'} Expense</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }}><X size={18} className="text-gray-400"/></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="label">Date</label><input type="date" required className="input" value={form.date} onChange={setF('date')}/></div>
              <div><label className="label">Category</label><select className="input" value={form.category} onChange={setF('category')}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="col-span-2"><label className="label">Description *</label><input required className="input" value={form.description} onChange={setF('description')} placeholder="What was purchased/paid"/></div>
              <div><label className="label">Supplier / Vendor</label><input className="input" value={form.supplier} onChange={setF('supplier')} placeholder="Supplier name"/></div>
              <div><label className="label">Payment Mode</label><select className="input" value={form.paymentMode} onChange={setF('paymentMode')}>{METHODS.map(m => <option key={m}>{m.toUpperCase()}</option>)}</select></div>
              <div><label className="label">Amount (₹) *</label><input required type="number" step="any" className="input" value={form.amount} onChange={setF('amount')}/></div>
              <div><label className="label">GST Amount (₹)</label><input type="number" step="any" className="input" value={form.gstAmt} onChange={setF('gstAmt')}/></div>
              <div className="col-span-2"><label className="label">Ref No / Invoice No</label><input className="input" value={form.refNo} onChange={setF('refNo')} placeholder="Bill/invoice number"/></div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1"><Check size={15}/> {editId ? 'Update' : 'Save'} Expense</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Receipt size={40} className="mb-3 opacity-20"/>
            <p className="font-semibold text-gray-500">No expenses recorded</p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead><tr>
                <th>Date</th><th>Category</th><th>Description</th>
                <th>Supplier</th><th>Mode</th>
                <th className="text-right">Amount</th><th className="text-right">GST</th><th className="text-right">Total</th>
                <th className="text-center">Actions</th>
              </tr></thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp._id}>
                    <td className="text-gray-500 text-xs">{fmtDate(exp.date)}</td>
                    <td><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{exp.category}</span></td>
                    <td className="font-medium text-gray-800 dark:text-gray-200 max-w-[150px]"><span className="truncate block">{exp.description}</span></td>
                    <td className="text-gray-500 text-xs">{exp.supplier || '—'}</td>
                    <td className="text-gray-500 text-xs uppercase">{exp.paymentMode}</td>
                    <td className="text-right text-gray-700">{formatCurrency(exp.amount)}</td>
                    <td className="text-right text-gray-500 text-xs">{exp.gstAmt ? formatCurrency(exp.gstAmt) : '—'}</td>
                    <td className="text-right font-bold text-gray-900">{formatCurrency(exp.totalAmount)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleEdit(exp)} className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600"><Edit2 size={14}/></button>
                        <button onClick={() => handleDelete(exp._id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-50 flex justify-end">
              <span className="text-sm font-bold text-gray-700">Total: {formatCurrency(total)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
