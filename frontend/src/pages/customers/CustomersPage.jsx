import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Edit2, Trash2, FileText, X, Check } from 'lucide-react';
import { customerAPI } from '../../services/api';
import { Spinner, EmptyState, Modal } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';

const INIT = {
  name: '', phone: '', email: '', gstNo: '',
  addressLine1: '', addressLine2: '', addressLine3: '',
  stateName: 'Gujarat', stateCode: '24',
};

// Outside to prevent remount
function CustomerField({ label, value, onChange, type = 'text', placeholder, required, span }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} className="input" value={value || ''} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(false); // 'add' | 'edit' | false
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(INIT);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [toast, setToast]           = useState('');

  const load = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const { data } = await customerAPI.list({ search: q });
      setCustomers(data.customers);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const openAdd = () => { setForm(INIT); setEditing(null); setError(''); setModal('add'); };
  const openEdit = (c) => {
    setForm({
      name: c.name, phone: c.phone || '', email: c.email || '', gstNo: c.gstNo || '',
      addressLine1: c.addressLine1 || '', addressLine2: c.addressLine2 || '',
      addressLine3: c.addressLine3 || '', stateName: c.stateName || 'Gujarat', stateCode: c.stateCode || '24',
    });
    setEditing(c._id); setError(''); setModal('edit');
  };

  const updateForm = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);
  const mh = (k) => (e) => updateForm(k, e.target.value);

  const handleSave = async (e) => {
    e.preventDefault(); setError('');
    if (!form.name.trim()) { setError('Customer name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await customerAPI.update(editing, form);
        showToast('Customer updated');
      } else {
        await customerAPI.create(form);
        showToast('Customer added');
      }
      setModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove "${name}" from customers?`)) return;
    try {
      await customerAPI.delete(id);
      showToast('Customer removed');
      load();
    } catch {}
  };

  const CustomerForm = (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CustomerField label="Party / Company name" value={form.name}    onChange={mh('name')}  required span />
        <CustomerField label="Phone"  value={form.phone}  onChange={mh('phone')} placeholder="9876543210" />
        <CustomerField label="Email"  value={form.email}  onChange={mh('email')} type="email" placeholder="party@example.com" />
        <CustomerField label="GST No" value={form.gstNo}  onChange={mh('gstNo')} placeholder="24XXXXX0000X1Z0" />
        <CustomerField label="Address line 1" value={form.addressLine1} onChange={mh('addressLine1')} span />
        <CustomerField label="Address line 2" value={form.addressLine2} onChange={mh('addressLine2')} />
        <CustomerField label="City / PIN"     value={form.addressLine3} onChange={mh('addressLine3')} />
        <CustomerField label="State name"     value={form.stateName}    onChange={mh('stateName')} />
        <CustomerField label="State code"     value={form.stateCode}    onChange={mh('stateCode')} />
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
        <Check size={16} /> {saving ? 'Saving...' : editing ? 'Update customer' : 'Add customer'}
      </button>
    </form>
  );

  return (
    <div className="p-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
          ✅ {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm">{customers.length} parties saved</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={16}/> Add customer</button>
      </div>

      {/* Search */}
      <div className="card p-3 mb-5 flex items-center gap-3">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input className="flex-1 text-sm outline-none bg-transparent" placeholder="Search by name..."
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')}><X size={14} className="text-gray-400" /></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" subtitle="Add your first customer to auto-fill billing details on invoices"
          action="Add customer" onAction={openAdd} />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap"><table className="w-full text-sm" style={{minWidth:'560px'}}>
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name','Phone','GST No','Address','Invoices','Outstanding',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map(c => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.gstNo || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {[c.addressLine1, c.addressLine3].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.totalInvoices || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${(c.totalOutstanding || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(c.totalOutstanding || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => navigate(`/invoices?customer=${c._id}`)}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="View invoices">
                        <FileText size={14}/>
                      </button>
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit">
                        <Edit2 size={14}/>
                      </button>
                      <button onClick={() => handleDelete(c._id, c.name)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400" title="Remove">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(false)}
        title={modal === 'edit' ? 'Edit customer' : 'Add new customer'} size="md">
        {CustomerForm}
      </Modal>
    </div>
  );
}
