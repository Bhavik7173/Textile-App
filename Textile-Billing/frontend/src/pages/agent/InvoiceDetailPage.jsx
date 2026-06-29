import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Printer, FileDown, Mail, MessageCircle, Eye, Copy,
  CheckCircle, Clock, AlertTriangle, Building2, Send, X, Loader2
} from 'lucide-react';
import { invoiceAPI, API_BASE } from '../../services/api';
import PaymentPanel from '../../components/PaymentPanel';
import NotesReminder from '../../components/NotesReminder';
import { StatusBadge, Spinner, Modal } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useFirm } from '../../context/FirmContext';

// Row component OUTSIDE to prevent remount issues
function Row({ l, v }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{l}</span>
      <span className="text-sm text-gray-800 font-medium">{v || '—'}</span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { isAdmin } = useAuth();
  const { activeFirm } = useFirm();

  const [invoice, setInvoice]       = useState(null);
  const [company, setCompany]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [statusModal, setStatusModal]   = useState(false);
  const [emailModal, setEmailModal]     = useState(false);
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [emailAddr, setEmailAddr]   = useState('');
  const [phone, setPhone]           = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const inv = await invoiceAPI.getById(id);
        setInvoice(inv.data.invoice);
        setCompany(activeFirm);
      } catch { navigate('/invoices'); }
      finally { setLoading(false); }
    }
    load();
  }, [id, activeFirm]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateStatus = async (s) => {
    try {
      const { data } = await invoiceAPI.updateStatus(id, s);
      setInvoice(data.invoice);
      setStatusModal(false);
      showToast(`Status updated to ${s}`);
    } catch { showToast('Failed to update status', 'error'); }
  };

  // ── Download PDF ─────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resp  = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('PDF generation failed');
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Invoice_${invoice.invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully');
    } catch (err) {
      showToast('PDF generation failed. Make sure the backend is running.', 'error');
    } finally { setPdfLoading(false); }
  };

  // ── Send email ────────────────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!emailAddr) return;
    setEmailLoading(true);
    try {
      await invoiceAPI.sendEmail(id, emailAddr);
      setEmailModal(false);
      setEmailAddr('');
      showToast(`Invoice sent to ${emailAddr}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Email failed. Check SMTP settings in .env', 'error');
    } finally { setEmailLoading(false); }
  };

  // ── WhatsApp ──────────────────────────────────────────────────────────────────
  const handleDuplicate = async () => {
    try {
      const { data } = await invoiceAPI.duplicate(id);
      navigate(`/invoices/${data.invoice._id}`);
    } catch { showToast('Failed to duplicate invoice', 'error'); }
  };

  const handleWhatsApp = async () => {
    try {
      const { data } = await invoiceAPI.whatsapp(id, phone);
      window.open(data.url, '_blank');
      setWhatsappModal(false);
      setPhone('');
    } catch { showToast('Failed to generate WhatsApp link', 'error'); }
  };

  if (loading) return <div className="flex justify-center h-screen items-center"><Spinner size="lg" /></div>;
  if (!invoice) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <X size={16}/> : <CheckCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm">
          <ArrowLeft size={16}/> Back to invoices
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={() => setStatusModal(true)} className="btn-secondary text-sm">
              <CheckCircle size={15}/> Status
            </button>
          )}
          <button onClick={() => navigate(`/invoices/${id}/print`)} className="btn-secondary text-sm">
            <Eye size={15}/> Preview
          </button>
          <button onClick={handleDuplicate} className="btn-secondary text-sm">
            <Copy size={15}/> Duplicate
          </button>
          <button onClick={() => setWhatsappModal(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <MessageCircle size={15}/> WhatsApp
          </button>
          <button onClick={() => setEmailModal(true)} className="btn-secondary text-sm">
            <Mail size={15}/> Email
          </button>
          <button onClick={handleDownloadPDF} disabled={pdfLoading}
            className="btn-primary text-sm disabled:opacity-50">
            {pdfLoading ? <Loader2 size={15} className="animate-spin"/> : <FileDown size={15}/>}
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Invoice summary card */}
      <div className="card p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNo}</h1>
              <StatusBadge status={invoice.status}/>
              {/* Firm badge */}
              {invoice.firmId && activeFirm && (() => {
                const { firms: allFirms } = { firms: [] };
                return null;
              })()}
              {activeFirm && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
                  style={{ borderColor: activeFirm.color || '#0d6eaa', background: (activeFirm.color || '#0d6eaa') + '15' }}>
                  <div className="w-4 h-4 rounded flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ background: activeFirm.color || '#0d6eaa' }}>
                    {activeFirm.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: activeFirm.color || '#0d6eaa' }}>
                    {activeFirm.name}
                  </span>
                </div>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              Issued {formatDate(invoice.invoiceDate)}
              {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Total amount</p>
            <p className="text-3xl font-bold text-blue-700">{formatCurrency(invoice.totalAmount)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — main details */}
        <div className="lg:col-span-2 space-y-4">

          {/* Company */}
          {company && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                <Building2 size={12}/> Supplier
              </p>
              <p className="font-bold text-gray-900">{company.name}</p>
              <p className="text-sm text-gray-500">{company.address}</p>
              <p className="text-sm text-gray-500">GST: {company.gstNo} · {company.mobile}</p>
            </div>
          )}

          {/* Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['Billed to', invoice.billedToLine1, invoice.billedToLine2, invoice.billedToLine3, invoice.billedStateName, invoice.billedStateCode, invoice.billedGSTNo],
              ['Shipped to', invoice.shippedToLine1, invoice.shippedToLine2, invoice.shippedToLine3, invoice.shippedStateName, invoice.shippedStateCode, invoice.shippedGSTNo],
            ].map(([title, l1, l2, l3, state, code, gst]) => (
              <div key={title} className="card p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{title}</p>
                <p className="font-medium text-gray-900">{l1 || '—'}</p>
                {l2 && <p className="text-sm text-gray-500">{l2}</p>}
                {l3 && <p className="text-sm text-gray-500">{l3}</p>}
                <p className="text-xs text-gray-400 mt-1">{state} · {code}</p>
                <p className="text-xs text-gray-400">GST: {gst || '—'}</p>
              </div>
            ))}
          </div>

              {/* Item table — supports single and multiple items */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['#','Item','HSN','Pieces','Qty (m)','Rate (₹)','Amount'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(invoice.items && invoice.items.length > 0 ? invoice.items : [{
                  itemName: invoice.itemName, hsnSac: invoice.hsnSac,
                  pieces: invoice.pieces, quantity: invoice.quantity,
                  rate: invoice.rate, grossAmount: invoice.grossAmount,
                }]).map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-3 py-3 text-gray-600">{item.hsnSac || '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{item.pieces || 0}</td>
                    <td className="px-3 py-3 text-gray-600">{(item.quantity || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-gray-600">₹{item.rate || 0}</td>
                    <td className="px-3 py-3 font-semibold">{formatCurrency(item.grossAmount || (item.quantity * item.rate))}</td>
                  </tr>
                ))}
              </tbody>
              {invoice.items && invoice.items.length > 1 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-xs font-bold text-gray-600 text-right">Total</td>
                    <td className="px-3 py-2 text-xs font-bold">{(invoice.quantity||0).toFixed(2)}</td>
                    <td />
                    <td className="px-3 py-2 font-bold text-gray-900">{formatCurrency(invoice.grossAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Transport */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Transport details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <Row l="Transporter"    v={invoice.transporterName}/>
              <Row l="Mode"           v={invoice.transportationMode}/>
              <Row l="Vehicle No"     v={invoice.vehicleNo}/>
              <Row l="Place of supply"v={invoice.placeOfSupply}/>
              {invoice.ewayBillNo && <Row l="E-Way Bill" v={invoice.ewayBillNo}/>}
            </div>
          </div>
        </div>

        {/* Right — financials */}
        <div className="space-y-4">
          {/* Tax */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Tax & totals</p>
            <Row l="Gross amount" v={formatCurrency(invoice.grossAmount)}/>
            {invoice.sgstAmt > 0 && <>
              <Row l={`SGST @ ${invoice.sgstRate}%`} v={formatCurrency(invoice.sgstAmt)}/>
              <Row l={`CGST @ ${invoice.cgstRate}%`} v={formatCurrency(invoice.cgstAmt)}/>
            </>}
            {invoice.igstAmt > 0 && <Row l={`IGST @ ${invoice.igstRate}%`} v={formatCurrency(invoice.igstAmt)}/>}
            <div className="flex justify-between py-2 mt-1 border-t-2 border-blue-200">
              <span className="font-bold text-blue-700">Total</span>
              <span className="font-bold text-blue-700 text-lg">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <Row l="Net rate/piece" v={`₹${invoice.netRate || 0}`}/>
          </div>

          {/* Bank */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Bank details</p>
            <Row l="Bank"    v={invoice.bankName || company?.bankName}/>
            <Row l="Account" v={invoice.accountNo || company?.accountNo}/>
            <Row l="IFSC"    v={invoice.ifscCode  || company?.ifscCode}/>
            <Row l="Branch"  v={invoice.branch    || company?.branch}/>
          </div>

          {/* Payment tracking */}
          <PaymentPanel
            invoice={invoice}
            onPaymentAdded={(updated) => updated && setInvoice(updated)}
          />

          {/* Notes & Reminders */}
          <NotesReminder
            invoice={invoice}
            onUpdate={(updated) => updated && setInvoice(updated)}
          />

          {/* Reference */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Reference</p>
            <Row l="Order No"   v={invoice.orderNo}/>
            <Row l="Challan No" v={invoice.challanNo}/>
            <Row l="Agent"      v={invoice.agentName}/>
            <Row l="Created"    v={formatDate(invoice.createdAt)}/>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Status */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update invoice status" size="sm">
        <div className="space-y-3">
          {[
            { s:'paid',    icon:CheckCircle,   label:'Mark as Paid',    cls:'border-green-200 hover:bg-green-50 text-green-700'  },
            { s:'pending', icon:Clock,          label:'Mark as Pending', cls:'border-yellow-200 hover:bg-yellow-50 text-yellow-700'},
            { s:'overdue', icon:AlertTriangle,  label:'Mark as Overdue', cls:'border-red-200 hover:bg-red-50 text-red-700'        },
          ].map(({ s, icon:Icon, label, cls }) => (
            <button key={s} onClick={() => updateStatus(s)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 font-medium transition-colors ${cls} ${invoice.status===s ? 'ring-2 ring-offset-2 ring-current':''}`}>
              <Icon size={20}/> {label}
              {invoice.status === s && <span className="ml-auto text-xs bg-current bg-opacity-10 px-2 py-0.5 rounded-full">current</span>}
            </button>
          ))}
        </div>
      </Modal>

      {/* Email */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Send invoice by email" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">The invoice PDF will be generated and emailed to the address below.</p>
          <div>
            <label className="label">Email address</label>
            <input type="email" className="input" placeholder="customer@example.com"
              value={emailAddr} onChange={e => setEmailAddr(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendEmail()}/>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            💡 Make sure <code>SMTP_USER</code> and <code>SMTP_PASS</code> are set in <code>backend/.env</code>
          </div>
          <button onClick={handleSendEmail} disabled={emailLoading || !emailAddr} className="btn-primary w-full justify-center">
            {emailLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
            {emailLoading ? 'Sending...' : 'Send invoice'}
          </button>
        </div>
      </Modal>

      {/* WhatsApp */}
      <Modal open={whatsappModal} onClose={() => setWhatsappModal(false)} title="Share via WhatsApp" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Opens WhatsApp with a pre-filled invoice summary message.</p>
          <div>
            <label className="label">Customer phone number (optional)</label>
            <input type="tel" className="input" placeholder="9876543210 (with country code)"
              value={phone} onChange={e => setPhone(e.target.value)}/>
            <p className="text-xs text-gray-400 mt-1">Leave blank to open WhatsApp without a contact</p>
          </div>
          <button onClick={handleWhatsApp} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 rounded-lg transition-colors">
            <MessageCircle size={16}/> Open WhatsApp
          </button>
        </div>
      </Modal>

    </div>
  );
}
