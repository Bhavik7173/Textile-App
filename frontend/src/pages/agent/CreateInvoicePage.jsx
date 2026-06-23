import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, ArrowRight, Save, Plus, Trash2 } from 'lucide-react';
import { invoiceAPI, utilAPI, customerAPI } from '../../services/api';
import { FormField, SectionHeading } from '../../components/ui';
import { calcGST, formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useFirm } from '../../context/FirmContext';

const STEPS = ['Reference', 'Addresses', 'Items & Tax', 'Bank & Review'];
const MODES = ['Truck', 'Tempo', 'Train', 'Air', 'Any'];
const ITEM_SUGGESTIONS = [
  'French Chiffon', 'Turkey Georgette', 'Renial', 'Satin Weave',
  'Velvet Fabric', 'Organza Silk', 'Crepe', 'Jacquard', 'Polyester', 'Art Silk',
];
const GST_RATES = ['0', '5', '12', '18', '28'];

const today = new Date().toISOString().split('T')[0];

const EMPTY_ITEM = {
  itemName: '', hsnSac: '5407', uom: 'MTR', pieces: '', quantity: '', rate: '',
  discount: '0', billDiscount: '0', gstRate: '5',
};

const INIT_FORM = {
  orderNo: '', challanNo: '', invoiceNo: '',
  challanDate: today, invoiceDate: today, dueDate: '', ewayBillNo: '',
  transporterName: '', transportationMode: 'Truck', vehicleNo: '', placeOfSupply: '',
  billedToLine1: '', billedToLine2: '', billedToLine3: '',
  billedStateName: 'Gujarat', billedStateCode: '24', billedGSTNo: '',
  sameAsBilling: true,
  shippedToLine1: '', shippedToLine2: '', shippedToLine3: '',
  shippedStateName: 'Gujarat', shippedStateCode: '24', shippedGSTNo: '',
  bankName: '', accountNo: '', ifscCode: '', branch: '',
  paymentTerm: '', totalDiscount: '0',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcItemTotals(item, billedStateCode, shippedStateCode) {
  const qty  = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate)     || 0;
  if (qty === 0 || rate === 0) return null;
  const inter = billedStateCode !== '24' || shippedStateCode !== '24';
  return calcGST({ quantity: qty, rate, gstRate: parseFloat(item.gstRate) || 5, isInterState: inter });
}

function grandTotals(items, billedStateCode, shippedStateCode) {
  let grossAmount = 0, sgstAmt = 0, cgstAmt = 0, igstAmt = 0, totalAmount = 0;
  items.forEach(item => {
    const t = calcItemTotals(item, billedStateCode, shippedStateCode);
    if (t) {
      grossAmount  += t.grossAmount;
      sgstAmt      += t.sgstAmt;
      cgstAmt      += t.cgstAmt;
      igstAmt      += t.igstAmt;
      totalAmount  += t.totalAmount;
    }
  });
  return {
    grossAmount:  parseFloat(grossAmount.toFixed(2)),
    sgstAmt:      parseFloat(sgstAmt.toFixed(2)),
    cgstAmt:      parseFloat(cgstAmt.toFixed(2)),
    igstAmt:      parseFloat(igstAmt.toFixed(2)),
    totalAmount:  parseFloat(totalAmount.toFixed(2)),
  };
}

// ─── Field — defined OUTSIDE to prevent remount on every keystroke ────────────
function Field({ label, value, onChange, type = 'text', required, placeholder, className = '' }) {
  return (
    <FormField label={label} required={required}>
      <input
        type={type}
        className={`input ${className}`}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        value={value}
        onChange={onChange}
      />
    </FormField>
  );
}

// ─── Single item row ──────────────────────────────────────────────────────────
function ItemRow({ item, index, total, onUpdate, onRemove, canRemove, billedCode, shippedCode }) {
  const gst = calcItemTotals(item, billedCode, shippedCode);

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative">
      {/* Row header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
          Item {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>

      {/* Item name + HSN */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="col-span-2">
          <label className="label">Item name *</label>
          <input
            className="input"
            list={`items-list-${index}`}
            value={item.itemName}
            onChange={e => onUpdate(index, 'itemName', e.target.value)}
            placeholder="e.g. French Chiffon"
          />
          <datalist id={`items-list-${index}`}>
            {ITEM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label className="label">HSN/SAC</label>
          <input
            className="input"
            value={item.hsnSac}
            onChange={e => onUpdate(index, 'hsnSac', e.target.value)}
            placeholder="5407"
          />
        </div>
      </div>

      {/* UOM + Qty / rate */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        <div>
          <label className="label">UOM</label>
          <select className="input" value={item.uom}
            onChange={e => onUpdate(index, 'uom', e.target.value)}>
            {['MTR','KG','PCS','BOX','SET','YDS'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Pieces *</label>
          <input type="number" className="input" value={item.pieces}
            onChange={e => onUpdate(index, 'pieces', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Qty *</label>
          <input type="number" className="input" value={item.quantity}
            onChange={e => onUpdate(index, 'quantity', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="label">Rate (₹) *</label>
          <input type="number" className="input" value={item.rate}
            onChange={e => onUpdate(index, 'rate', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="label">GST rate</label>
          <select className="input" value={item.gstRate}
            onChange={e => onUpdate(index, 'gstRate', e.target.value)}>
            {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
      </div>
      {/* Discount fields */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Discount %</label>
          <input type="number" className="input" value={item.discount}
            onChange={e => onUpdate(index, 'discount', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Bill Discount (₹)</label>
          <input type="number" className="input" value={item.billDiscount}
            onChange={e => onUpdate(index, 'billDiscount', e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Live mini total for this item */}
      {gst && (
        <div className="flex items-center gap-4 text-xs bg-white border border-blue-100 rounded-lg px-3 py-2 mt-1">
          <span className="text-gray-500">Gross: <strong className="text-gray-800">{formatCurrency(gst.grossAmount)}</strong></span>
          {gst.sgstAmt > 0 && <>
            <span className="text-gray-400">SGST: {formatCurrency(gst.sgstAmt)}</span>
            <span className="text-gray-400">CGST: {formatCurrency(gst.cgstAmt)}</span>
          </>}
          {gst.igstAmt > 0 && <span className="text-gray-400">IGST: {formatCurrency(gst.igstAmt)}</span>}
          <span className="ml-auto font-bold text-blue-700">Total: {formatCurrency(gst.totalAmount)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CreateInvoicePage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { activeFirm } = useFirm();
  const [step, setStep]       = useState(0);
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [form, setForm]       = useState(INIT_FORM);
  const [items, setItems]     = useState([{ ...EMPTY_ITEM }]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Auto-fill invoice number + load customers on mount
  useEffect(() => {
    utilAPI.nextInvoiceNo().then(({ data }) => {
      setForm(f => ({ ...f, invoiceNo: data.invoiceNo }));
    }).catch(() => {});
    customerAPI.list({ limit: 200 }).then(({ data }) => {
      setCustomers(data.customers || []);
    }).catch(() => {});
  }, []);

  // Stable form field updater
  const updateForm = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const makeHandler = (key) => (e) => updateForm(key, e.target.value);

  // Fill billing address from selected customer
  const fillCustomer = (c) => {
    setForm(f => ({
      ...f,
      billedToLine1:   c.name,
      billedToLine2:   c.addressLine2 || '',
      billedToLine3:   c.addressLine3 || '',
      billedStateName: c.stateName || 'Gujarat',
      billedStateCode: c.stateCode  || '24',
      billedGSTNo:     c.gstNo || '',
    }));
    setCustSearch(c.name);
    setShowCustDrop(false);
  };

  const filteredCusts = custSearch.length > 0
    ? customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase())).slice(0, 6)
    : [];

  // Item updater
  const updateItem = useCallback((index, key, value) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }, []);

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const grand = grandTotals(items, form.billedStateCode, form.shippedStateCode);
  const isInterState = form.billedStateCode !== '24' || form.shippedStateCode !== '24';

  const next = () => { setStep(s => Math.min(s + 1, 3)); window.scrollTo(0, 0); };
  const back = () => { step > 0 ? setStep(s => s - 1) : navigate('/invoices'); window.scrollTo(0, 0); };

  const handleSave = async () => {
    setError('');
    if (!form.invoiceNo || !form.invoiceDate)
      return setError('Invoice No and Invoice Date are required.');
    if (items.some(i => !i.itemName))
      return setError('All items must have a name.');
    if (items.some(i => !i.quantity || !i.rate))
      return setError('All items must have quantity and rate.');

    setLoading(true);
    try {
      // Build payload — send items array + grand totals
      const payload = {
        ...form,
        firmId: activeFirm?._id || null,
        items: items.map(item => {
          const t = calcItemTotals(item, form.billedStateCode, form.shippedStateCode);
          return { ...item, ...(t || {}) };
        }),
        // Grand totals for the invoice
        grossAmount: grand.grossAmount,
        sgstAmt:     grand.sgstAmt,
        cgstAmt:     grand.cgstAmt,
        igstAmt:     grand.igstAmt,
        totalAmount: grand.totalAmount,
        // For backward compat: use first item's fields at top level too
        itemName:  items.map(i => i.itemName).join(', '),
        hsnSac:    items[0].hsnSac,
        pieces:    items.reduce((s, i) => s + (parseInt(i.pieces) || 0), 0),
        quantity:  items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0),
        rate:      items[0].rate,
        amount:    grand.grossAmount,
        sgstRate:  isInterState ? 0 : (parseFloat(items[0].gstRate) || 5) / 2,
        cgstRate:  isInterState ? 0 : (parseFloat(items[0].gstRate) || 5) / 2,
        igstRate:  isInterState ? (parseFloat(items[0].gstRate) || 5) : 0,
        netRate:   grand.totalAmount / items.reduce((s, i) => s + (parseInt(i.pieces) || 0), 0) || 0,
      };

      if (form.sameAsBilling) {
        payload.shippedToLine1   = form.billedToLine1;
        payload.shippedToLine2   = form.billedToLine2;
        payload.shippedToLine3   = form.billedToLine3;
        payload.shippedStateName = form.billedStateName;
        payload.shippedStateCode = form.billedStateCode;
        payload.shippedGSTNo     = form.billedGSTNo;
      }

      const { data } = await invoiceAPI.create(payload);
      navigate(`/invoices/${data.invoice._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/invoices')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
          <p className="text-sm text-gray-500">Agent: {user?.name}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 ${i <= step ? 'text-blue-700' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                i < step   ? 'bg-blue-700 border-blue-700 text-white' :
                i === step ? 'border-blue-700 text-blue-700 bg-white' :
                             'border-gray-300 text-gray-400 bg-white'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-blue-700' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card p-6">

        {/* ── STEP 0: Reference & Transport ── */}
        {step === 0 && (
          <div>
            <SectionHeading title="Invoice reference" subtitle="Order and challan numbers" />
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Field label="Order No"   value={form.orderNo}   onChange={makeHandler('orderNo')} />
              <Field label="Challan No" value={form.challanNo} onChange={makeHandler('challanNo')} />
              <Field label="Invoice No" value={form.invoiceNo} onChange={makeHandler('invoiceNo')} required />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Challan date" value={form.challanDate}  onChange={makeHandler('challanDate')}  type="date" />
              <Field label="Invoice date" value={form.invoiceDate}  onChange={makeHandler('invoiceDate')}  type="date" required />
              <Field label="Due date"      value={form.dueDate}       onChange={makeHandler('dueDate')}      type="date" />
              <Field label="E-Way Bill"    value={form.ewayBillNo}    onChange={makeHandler('ewayBillNo')} />
              <Field label="Payment Term"  value={form.paymentTerm}   onChange={makeHandler('paymentTerm')} placeholder="45 Days(45)" />
              <Field label="Total Discount (₹)" value={form.totalDiscount} onChange={makeHandler('totalDiscount')} type="number" />
            </div>

            <SectionHeading title="Transport" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Transporter name" value={form.transporterName} onChange={makeHandler('transporterName')} />
              <Field label="Vehicle No"        value={form.vehicleNo}       onChange={makeHandler('vehicleNo')} placeholder="GJ05XX0000" />
              <Field label="Place of supply"   value={form.placeOfSupply}   onChange={makeHandler('placeOfSupply')} />
              <div>
                <label className="label">Mode</label>
                <select className="input" value={form.transportationMode} onChange={makeHandler('transportationMode')}>
                  {MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Addresses ── */}
        {step === 1 && (
          <div>
            <SectionHeading title="Billed to" subtitle="Customer billing address" />

            {/* Customer search / auto-fill */}
            {customers.length > 0 && (
              <div className="relative mb-4">
                <label className="label">Search saved customer (optional)</label>
                <input
                  className="input"
                  placeholder="Type customer name to auto-fill..."
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                  onFocus={() => setShowCustDrop(true)}
                  onBlur={() => setTimeout(() => setShowCustDrop(false), 200)}
                />
                {showCustDrop && filteredCusts.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {filteredCusts.map(c => (
                      <button key={c._id} type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                        onMouseDown={() => fillCustomer(c)}>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.gstNo || ''} {c.addressLine3 || ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-6">
              <Field label="Company / Party name" value={form.billedToLine1} onChange={makeHandler('billedToLine1')} required />
              <Field label="Address line 2"        value={form.billedToLine2} onChange={makeHandler('billedToLine2')} placeholder="Street, area" />
              <Field label="City, PIN"             value={form.billedToLine3} onChange={makeHandler('billedToLine3')} />
              <div className="grid grid-cols-3 gap-4">
                <Field label="State name" value={form.billedStateName} onChange={makeHandler('billedStateName')} />
                <Field label="State code" value={form.billedStateCode} onChange={makeHandler('billedStateCode')} />
                <Field label="GST No"     value={form.billedGSTNo}     onChange={makeHandler('billedGSTNo')} placeholder="24XXXXX0000X1Z0" />
              </div>
            </div>

            <SectionHeading title="Shipped to" subtitle="Delivery address" />
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={form.sameAsBilling}
                onChange={e => updateForm('sameAsBilling', e.target.checked)}
                className="w-4 h-4 accent-blue-700" />
              <span className="text-sm text-gray-700">Same as billing address</span>
            </label>
            {!form.sameAsBilling && (
              <div className="grid grid-cols-1 gap-4">
                <Field label="Company / Party name" value={form.shippedToLine1} onChange={makeHandler('shippedToLine1')} />
                <Field label="Address line 2"        value={form.shippedToLine2} onChange={makeHandler('shippedToLine2')} />
                <Field label="City, PIN"             value={form.shippedToLine3} onChange={makeHandler('shippedToLine3')} />
                <div className="grid grid-cols-3 gap-4">
                  <Field label="State name" value={form.shippedStateName} onChange={makeHandler('shippedStateName')} />
                  <Field label="State code" value={form.shippedStateCode} onChange={makeHandler('shippedStateCode')} />
                  <Field label="GST No"     value={form.shippedGSTNo}     onChange={makeHandler('shippedGSTNo')} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Items & Tax ── */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionHeading title="Items" subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} added`} />
              <button type="button" onClick={addItem}
                className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors">
                <Plus size={15} /> Add item
              </button>
            </div>

            {/* Item rows */}
            <div className="space-y-4 mb-6">
              {items.map((item, i) => (
                <ItemRow
                  key={i}
                  index={i}
                  item={item}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  canRemove={items.length > 1}
                  billedCode={form.billedStateCode}
                  shippedCode={form.shippedStateCode}
                />
              ))}
            </div>

            {/* Add another item button (bottom) */}
            <button type="button" onClick={addItem}
              className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl py-3 transition-colors mb-6">
              <Plus size={16} /> Add another item
            </button>

            {/* Grand total */}
            {grand.totalAmount > 0 && (
              <div className="bg-blue-900 rounded-xl p-5 text-white">
                <p className="text-blue-200 text-xs font-semibold uppercase mb-3">Invoice grand total</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Gross amount ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                    <span className="font-medium">{formatCurrency(grand.grossAmount)}</span>
                  </div>
                  {grand.sgstAmt > 0 && <>
                    <div className="flex justify-between text-blue-300">
                      <span>SGST</span><span>{formatCurrency(grand.sgstAmt)}</span>
                    </div>
                    <div className="flex justify-between text-blue-300">
                      <span>CGST</span><span>{formatCurrency(grand.cgstAmt)}</span>
                    </div>
                  </>}
                  {grand.igstAmt > 0 && (
                    <div className="flex justify-between text-blue-300">
                      <span>IGST</span><span>{formatCurrency(grand.igstAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-blue-700 pt-2 mt-1">
                    <span className="font-bold text-lg">Total payable</span>
                    <span className="font-bold text-xl">{formatCurrency(grand.totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Bank & Review ── */}
        {step === 3 && (
          <div>
            <SectionHeading title="Bank details" subtitle="Payment collection account" />
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Bank name"  value={form.bankName}  onChange={makeHandler('bankName')} />
              <Field label="Account No" value={form.accountNo} onChange={makeHandler('accountNo')} />
              <Field label="IFSC code"  value={form.ifscCode}  onChange={makeHandler('ifscCode')} />
              <Field label="Branch"     value={form.branch}    onChange={makeHandler('branch')} />
            </div>

            <SectionHeading title="Review" subtitle="Check before saving" />
            <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
              {/* Invoice meta */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                {[
                  ['Invoice No',   form.invoiceNo   || '—'],
                  ['Invoice date', form.invoiceDate || '—'],
                  ['Agent',        user?.name       || '—'],
                  ['Customer',     form.billedToLine1 || '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">{l}</span>
                    <span className="font-medium text-gray-900">{v}</span>
                  </div>
                ))}
              </div>

              {/* Items summary table */}
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Items ({items.length})</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-200 text-gray-600">
                      <th className="text-left px-2 py-1.5 rounded-l">Item</th>
                      <th className="text-center px-2 py-1.5">Pcs</th>
                      <th className="text-center px-2 py-1.5">Qty</th>
                      <th className="text-center px-2 py-1.5">Rate</th>
                      <th className="text-right px-2 py-1.5 rounded-r">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const t = calcItemTotals(item, form.billedStateCode, form.shippedStateCode);
                      return (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-2 py-1.5 font-medium">{item.itemName || '—'}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{item.pieces || '—'}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{item.quantity ? `${item.quantity}m` : '—'}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{item.rate ? `₹${item.rate}` : '—'}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">{t ? formatCurrency(t.totalAmount) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grand total */}
              {grand.totalAmount > 0 && (
                <div className="border-t-2 border-blue-200 pt-3 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-700">Total payable</span>
                    <span className="font-bold text-xl text-blue-700">{formatCurrency(grand.totalAmount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-5">
        <button onClick={back} className="btn-secondary">
          <ArrowLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {step < 3 ? (
          <button onClick={next} className="btn-primary">
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleSave} disabled={loading} className="btn-primary disabled:opacity-50">
            <Save size={16} /> {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        )}
      </div>
    </div>
  );
}
