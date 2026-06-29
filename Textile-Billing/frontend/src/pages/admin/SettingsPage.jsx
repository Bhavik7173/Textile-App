import { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, Building2, Check, ChevronDown } from 'lucide-react';
import { firmAPI } from '../../services/api';
import { useFirm } from '../../context/FirmContext';

const FIRM_COLORS = ['#7c3aed','#0d6eaa','#059669','#dc2626','#d97706','#0891b2','#be185d'];

const EMPTY_FIRM = {
  name: '', address: '', businessType: '', gstNo: '', panNo: '',
  email: '', mobile: '', bankName: '', accountNo: '', ifscCode: '',
  branch: '', termsAndConditions: '', color: '#0d6eaa',
};

function Field({ label, value, onChange, placeholder, type = 'text', span }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      {label && <label className="label">{label}</label>}
      {type === 'textarea' ? (
        <textarea className="input h-24 resize-none" value={value || ''} onChange={onChange} placeholder={placeholder} />
      ) : (
        <input type={type} className="input" value={value || ''} onChange={onChange} placeholder={placeholder} />
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { firms, activeFirm, switchFirm, refreshFirms } = useFirm();
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saved,  setSaved]        = useState(false);
  const [adding, setAdding]       = useState(false);
  const [newForm, setNewForm]     = useState({ ...EMPTY_FIRM });

  // When firms load, select the active one
  useEffect(() => {
    if (activeFirm && !selected) {
      setSelected(activeFirm);
      setForm({ ...activeFirm });
    }
  }, [activeFirm]);

  const selectFirm = (firm) => {
    setSelected(firm);
    setForm({ ...firm });
    setSaved(false);
  };

  const setF  = useCallback((key) => (e) => setForm(f => ({ ...f, [key]: e.target.value })), []);
  const setNF = useCallback((key) => (e) => setNewForm(f => ({ ...f, [key]: e.target.value })), []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await firmAPI.update(selected._id, form);
      await refreshFirms();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    finally { setSaving(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const { data } = await firmAPI.create(newForm);
      await refreshFirms();
      setAdding(false);
      setNewForm({ ...EMPTY_FIRM });
      selectFirm(data.firm);
    } catch {}
  };

  const handleDelete = async (firm) => {
    if (firms.length <= 1) return alert('Cannot delete the last firm.');
    if (!window.confirm(`Delete "${firm.name}"?`)) return;
    await firmAPI.delete(firm._id);
    await refreshFirms();
    const remaining = firms.filter(f => f._id !== firm._id);
    if (remaining.length > 0) selectFirm(remaining[0]);
  };

  if (!form) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Building2 size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Firm Settings</h1>
            <p className="text-sm text-gray-400">Manage all your textile firms</p>
          </div>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary">
          <Plus size={15} /> Add Firm
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Firm List (left) ── */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Firms</p>
          {firms.map(firm => (
            <div key={firm._id} className="relative group">
              <button
                onClick={() => selectFirm(firm)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all
                  ${selected?._id === firm._id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white hover:bg-gray-50 border border-gray-100 text-gray-700'}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: firm.color || '#0d6eaa' }}>
                  {firm.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold truncate">{firm.name}</span>
              </button>
              {/* Delete */}
              {firms.length > 1 && (
                <button
                  onClick={() => handleDelete(firm)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                             items-center justify-center hidden group-hover:flex text-xs shadow"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {/* Add New Firm inline */}
          {adding && (
            <form onSubmit={handleAdd}
              className="bg-white border-2 border-indigo-300 rounded-xl p-3 space-y-2 mt-2">
              <p className="text-xs font-bold text-indigo-600 mb-2">New Firm</p>
              <input required className="input text-sm" placeholder="Firm name"
                value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
              <input className="input text-sm" placeholder="GST No."
                value={newForm.gstNo} onChange={e => setNewForm(f => ({ ...f, gstNo: e.target.value }))} />
              {/* Color picker */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Color</p>
                <div className="flex flex-wrap gap-1.5">
                  {FIRM_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setNewForm(f => ({ ...f, color: c }))}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                      style={{ background: c, borderColor: newForm.color === c ? '#1e293b' : 'transparent' }}>
                      {newForm.color === c && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary text-xs py-1.5 px-3">Add</button>
                <button type="button" onClick={() => setAdding(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
              </div>
            </form>
          )}
        </div>

        {/* ── Firm Edit Form (right) ── */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSave}>
            <div className="card p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  {selected?.name}
                </h2>
                {/* Color picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Color:</span>
                  {FIRM_COLORS.map(c => (
                    <button type="button" key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                      style={{ background: c, borderColor: form.color === c ? '#1e293b' : 'transparent' }}>
                      {form.color === c && <Check size={11} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Firm Name *"     value={form.name}         onChange={setF('name')}         placeholder="e.g. Om Textile" />
                <Field label="Business Type"   value={form.businessType} onChange={setF('businessType')} placeholder="e.g. Mfrs. & Dealers in Art Silk" />
                <Field label="Address" span    value={form.address}      onChange={setF('address')}      placeholder="Full address" />
                <Field label="GST No."         value={form.gstNo}        onChange={setF('gstNo')}        placeholder="24XXXXX0000X1Z0" />
                <Field label="PAN No."         value={form.panNo}        onChange={setF('panNo')}        placeholder="ABCDE1234F" />
                <Field label="Mobile"          value={form.mobile}       onChange={setF('mobile')}       placeholder="9876543210" />
                <Field label="Email" span      value={form.email}        onChange={setF('email')}        placeholder="firm@example.com" />
              </div>
            </div>

            <div className="card p-5 mb-4">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Bank Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Bank Name"   value={form.bankName}  onChange={setF('bankName')}  placeholder="HDFC Bank" />
                <Field label="Account No." value={form.accountNo} onChange={setF('accountNo')} placeholder="Account number" />
                <Field label="IFSC Code"   value={form.ifscCode}  onChange={setF('ifscCode')}  placeholder="HDFC0001234" />
                <Field label="Branch"      value={form.branch}    onChange={setF('branch')}    placeholder="Branch name" />
                <Field label="UPI ID"      value={form.upiId}     onChange={setF('upiId')}     placeholder="firmname@upi" />
              </div>
            </div>

            <div className="card p-5 mb-5">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Terms & Conditions</h2>
              <Field type="textarea" value={form.termsAndConditions} onChange={setF('termsAndConditions')}
                placeholder="Payment terms..." span />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button type="button"
                onClick={() => { switchFirm(selected); }}
                className="btn-secondary">
                <Building2 size={15} /> Set as Active
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : saved ? (
                  <><Check size={15} /> Saved!</>
                ) : (
                  <><Save size={15} /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
