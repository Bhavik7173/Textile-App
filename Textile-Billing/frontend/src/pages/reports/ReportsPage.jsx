import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, AlertTriangle, Clock, Download, FileSpreadsheet } from 'lucide-react';
import { reportAPI } from '../../services/api';
import { useFirm } from '../../context/FirmContext';
import { formatCurrency } from '../../utils/formatters';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-700',
    amber:  'bg-amber-50 text-amber-700',
    blue:   'bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { firms, activeFirm } = useFirm();
  const now = new Date();
  const [from, setFrom]         = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]             = useState(new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0]);
  const [firmFilter, setFirmFilter] = useState('all');
  const [summaries, setSummaries]   = useState([]);
  const [alerts, setAlerts]         = useState({ overdue: [], dueSoon: [], overdueTotal: 0, dueSoonTotal: 0 });
  const [loading, setLoading]       = useState(true);
  const [gstMonth, setGstMonth]     = useState(String(now.getMonth() + 1).padStart(2,'0'));
  const [gstYear, setGstYear]       = useState(String(now.getFullYear()));
  const [gstFirm, setGstFirm]       = useState('');

  useEffect(() => {
    if (activeFirm && !gstFirm) setGstFirm(activeFirm._id);
  }, [activeFirm]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { from, to };
      if (firmFilter !== 'all') params.firmId = firmFilter;
      const [rep, alert] = await Promise.all([
        reportAPI.firmSummary(params),
        reportAPI.dueAlerts({ firmId: firmFilter !== 'all' ? firmFilter : undefined }),
      ]);
      setSummaries(rep.data.summaries || []);
      setAlerts(alert.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to, firmFilter]);

  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BarChart2 size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
            <p className="text-sm text-gray-400">Per-firm sales, GST, due alerts</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Firm</label>
          <select className="input" value={firmFilter} onChange={e => setFirmFilter(e.target.value)}>
            <option value="all">All Firms</option>
            {firms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </div>
        <button onClick={load} className="btn-primary">Apply</button>
      </div>

      {/* Due Alerts */}
      {(alerts.overdue.length > 0 || alerts.dueSoon.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {alerts.overdue.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="font-bold text-red-600 text-sm">Overdue ({alerts.overdue.length})</h3>
                <span className="ml-auto text-sm font-bold text-red-600">{formatCurrency(alerts.overdueTotal)}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.overdue.map(inv => (
                  <div key={inv._id} className="flex justify-between text-xs border-b border-gray-50 pb-1.5">
                    <div>
                      <span className="font-semibold text-indigo-600">{inv.invoiceNo}</span>
                      <span className="text-gray-500 ml-2">{inv.billedToLine1}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">{formatCurrency(inv.balance || inv.totalAmount)}</div>
                      <div className="text-gray-400">Due {fmtD(inv.dueDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {alerts.dueSoon.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-amber-500" />
                <h3 className="font-bold text-amber-600 text-sm">Due in 7 days ({alerts.dueSoon.length})</h3>
                <span className="ml-auto text-sm font-bold text-amber-600">{formatCurrency(alerts.dueSoonTotal)}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.dueSoon.map(inv => (
                  <div key={inv._id} className="flex justify-between text-xs border-b border-gray-50 pb-1.5">
                    <div>
                      <span className="font-semibold text-indigo-600">{inv.invoiceNo}</span>
                      <span className="text-gray-500 ml-2">{inv.billedToLine1}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-amber-600">{formatCurrency(inv.balance || inv.totalAmount)}</div>
                      <div className="text-gray-400">Due {fmtD(inv.dueDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Per-firm summaries */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="space-y-6">
          {summaries.map(s => (
            <div key={s.firm._id} className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: s.firm.color || '#0d6eaa' }}>
                  {s.firm.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">{s.firm.name}</h2>
                  {s.firm.gstNo && <p className="text-xs text-gray-400">GST: {s.firm.gstNo}</p>}
                </div>
                <span className="ml-auto text-xs text-gray-400">{s.invoices} invoices</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard label="Total Sales"     value={formatCurrency(s.totalSales)}   color="indigo" />
                <StatCard label="Collected"       value={formatCurrency(s.paidAmount)}   color="green" />
                <StatCard label="Outstanding"     value={formatCurrency(s.balance)}      color="red" />
                <StatCard label="Net Profit"      value={formatCurrency(s.profit)}       color={s.profit >= 0 ? 'blue' : 'red'}
                  sub={`Expenses: ${formatCurrency(s.totalExpense)}`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <StatCard label="Taxable"  value={formatCurrency(s.totalTaxable)}  color="blue" />
                <StatCard label="GST"      value={formatCurrency(s.totalTax)}      color="amber" sub={`CGST ${formatCurrency(s.totalCgst)} + SGST ${formatCurrency(s.totalSgst)}`} />
                <StatCard label="Pending / Overdue" value={`${s.pendingCount} / ${s.overdueCount}`} color={s.overdueCount > 0 ? 'red' : 'amber'} />
              </div>
              {/* Monthly bar */}
              {s.monthly.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Monthly breakdown</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[...s.monthly].reverse().map((m, i) => {
                      const max = Math.max(...s.monthly.map(x => x.amount));
                      const h = max > 0 ? Math.max(4, Math.round((m.amount / max) * 60)) : 4;
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                          <div className="w-full rounded-t-sm" style={{ height: `${h}px`, background: s.firm.color || '#6366f1' }} title={`${m.label}: ${formatCurrency(m.amount)}`} />
                          <span className="text-[9px] text-gray-400">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GST Export */}
      <div className="card p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet size={18} className="text-green-600" />
          <h2 className="font-bold text-gray-900 dark:text-white text-sm">GSTR-1 Export</h2>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Firm</label>
            <select className="input" value={gstFirm} onChange={e => setGstFirm(e.target.value)}>
              {firms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Month</label>
            <select className="input" value={gstMonth} onChange={e => setGstMonth(e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input" value={gstYear} onChange={e => setGstYear(e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={() => reportAPI.gstr1Export(gstFirm, parseInt(gstMonth), gstYear)}
            disabled={!gstFirm}
            className="btn-primary disabled:opacity-50">
            <Download size={15} /> Download CSV
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Downloads a GSTR-1 ready CSV with HSN, CGST, SGST, IGST columns for the selected firm and month.</p>
      </div>
    </div>
  );
}
