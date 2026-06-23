import { formatCurrency, statusBadgeClass, statusLabel, formatDate } from '../../utils/formatters';
import { X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'indigo', isCurrency, trend, trendLabel }) {
  const palettes = {
    indigo: { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  ring: 'bg-indigo-100' },
    green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'bg-emerald-100' },
    yellow: { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'bg-amber-100' },
    red:    { bg: 'bg-red-50',     icon: 'text-red-500',     ring: 'bg-red-100' },
    purple: { bg: 'bg-purple-50',  icon: 'text-purple-600',  ring: 'bg-purple-100' },
  };
  const p = palettes[color] || palettes.indigo;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 ${p.ring} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={p.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {isCurrency ? formatCurrency(value) : value?.toLocaleString('en-IN')}
      </p>
      <p className="text-sm text-gray-400 font-medium">{label}</p>
      {trendLabel && <p className="text-xs text-gray-300 mt-0.5">{trendLabel}</p>}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  return <span className={statusBadgeClass(status)}>{statusLabel(status)}</span>;
}

// ─── InvoiceRow ───────────────────────────────────────────────────────────────
export function InvoiceRow({ invoice, onClick }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-indigo-50/40 cursor-pointer transition-colors" onClick={onClick}>
      <td className="px-4 py-3.5">
        <span className="text-sm font-semibold text-indigo-600">{invoice.invoiceNo}</span>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{invoice.billedToLine1 || '—'}</p>
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-500">{invoice.itemName}</td>
      <td className="px-4 py-3.5 text-sm text-gray-500">{invoice.agentName}</td>
      <td className="px-4 py-3.5 text-sm text-gray-400">{formatDate(invoice.invoiceDate)}</td>
      <td className="px-4 py-3.5">
        <span className="text-sm font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
      </td>
      <td className="px-4 py-3.5"><StatusBadge status={invoice.status} /></td>
    </tr>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 16 : size === 'lg' ? 32 : 20;
  return <Loader2 size={s} className="animate-spin text-indigo-500" />;
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle, action, onAction }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-4">
        <Icon size={28} className="text-indigo-400" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400 mb-5">{subtitle}</p>}
      {action && (
        <button onClick={onAction} className="btn-primary inline-flex">{action}</button>
      )}
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
export function FormField({ label, required, error, children, hint }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── SectionHeading ───────────────────────────────────────────────────────────
export function SectionHeading({ title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-2">
      <div className="w-1 h-5 bg-indigo-500 rounded-full" />
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ─── DataCard ─────────────────────────────────────────────────────────────────
export function DataCard({ title, subtitle, children, action }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
