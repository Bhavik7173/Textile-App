// src/components/PaymentPanel.jsx
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CreditCard, Check } from 'lucide-react';
import { paymentAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Spinner } from './ui';

const METHODS = ['cash', 'cheque', 'neft', 'rtgs', 'upi', 'other'];
const today = new Date().toISOString().split('T')[0];

const INIT = { amount: '', paymentDate: today, method: 'cash', referenceNo: '', notes: '' };

// Outside to prevent remount
function PayField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={value}
        onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

export default function PaymentPanel({ invoice, onPaymentAdded }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(INIT);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const loadPayments = async () => {
    try {
      const { data } = await paymentAPI.list({ invoiceId: invoice._id });
      setPayments(data.payments);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadPayments(); }, [invoice._id]);

  const updateForm = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);
  const mh = (k) => (e) => updateForm(k, e.target.value);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    const balance = invoice.totalAmount - (invoice.paidAmount || 0);
    if (amt > balance + 0.01) { setError(`Amount cannot exceed balance of ${formatCurrency(balance)}`); return; }

    setSaving(true);
    try {
      const { data } = await paymentAPI.create({
        invoiceId:   invoice._id,
        amount:      amt,
        paymentDate: form.paymentDate,
        method:      form.method,
        referenceNo: form.referenceNo || null,
        notes:       form.notes       || null,
      });
      setPayments(prev => [data.payment, ...prev]);
      setForm(INIT);
      setShowForm(false);
      onPaymentAdded && onPaymentAdded(data.invoice);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  const handleDelete = async (payId) => {
    if (!confirm('Reverse this payment?')) return;
    try {
      await paymentAPI.delete(payId);
      setPayments(prev => prev.filter(p => p._id !== payId));
      onPaymentAdded && onPaymentAdded(null);
    } catch {}
  };

  const paid    = invoice.paidAmount || 0;
  const balance = Math.max(0, invoice.totalAmount - paid);
  const pct     = invoice.totalAmount > 0 ? (paid / invoice.totalAmount) * 100 : 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
          <CreditCard size={12} /> Payment tracking
        </p>
        {balance > 0 && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
            <Plus size={13} /> Record payment
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Paid {formatCurrency(paid)}</span>
          <span>Balance {formatCurrency(balance)}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{pct.toFixed(0)}% collected</p>
      </div>

      {/* Add payment form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Record payment</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <PayField label="Amount (₹)" value={form.amount}
              onChange={mh('amount')} type="number" placeholder="0.00" />
            <PayField label="Date" value={form.paymentDate}
              onChange={mh('paymentDate')} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Method</label>
              <select className="input" value={form.method} onChange={mh('method')}>
                {METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <PayField label="Reference No" value={form.referenceNo}
              onChange={mh('referenceNo')} placeholder="Cheque/UTR/UPI" />
          </div>
          <PayField label="Notes" value={form.notes} onChange={mh('notes')} placeholder="Optional notes" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm flex-1 justify-center">
              <Check size={14} /> {saving ? 'Saving...' : 'Save payment'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(''); }}
              className="btn-secondary text-sm px-3">Cancel</button>
          </div>
        </form>
      )}

      {/* Payment history */}
      {loading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : payments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">No payments recorded yet</p>
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-green-700">+{formatCurrency(p.amount)}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(p.paymentDate)} · {p.method?.toUpperCase()}
                  {p.referenceNo ? ` · ${p.referenceNo}` : ''}
                </p>
                {p.notes && <p className="text-xs text-gray-400 italic">{p.notes}</p>}
              </div>
              <button onClick={() => handleDelete(p._id)}
                className="p-1 rounded hover:bg-red-50 text-red-400 transition-colors" title="Reverse">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {balance <= 0 && (
        <div className="flex items-center justify-center gap-2 mt-3 py-2 bg-green-50 rounded-lg">
          <Check size={14} className="text-green-600" />
          <span className="text-xs font-semibold text-green-700">Fully paid</span>
        </div>
      )}
    </div>
  );
}
