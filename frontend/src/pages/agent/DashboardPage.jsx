import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, TrendingUp, Clock, AlertTriangle, Plus,
  Download, IndianRupee, ArrowUpRight, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { statsAPI, invoiceAPI, utilAPI } from '../../services/api';
import { StatCard, InvoiceRow, Spinner, EmptyState, PageHeader, DataCard } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatters';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6'];
const fmtK = (v) => v >= 100000 ? '₹' + (v/100000).toFixed(0)+'L' : v >= 1000 ? '₹'+(v/1000).toFixed(0)+'k' : '₹'+v;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.name === 'Invoices' ? p.value : formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]       = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState('Monthly');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isAdmin) {
          const [s, i] = await Promise.all([statsAPI.get(), invoiceAPI.list({ limit: 8 })]);
          setStats(s.data);
          setInvoices(i.data.invoices);
        } else {
          const i = await invoiceAPI.list({ limit: 8 });
          const inv = i.data.invoices;
          setInvoices(inv);
          setStats({
            totalInvoices: inv.length,
            totalAmount:   inv.reduce((s, x) => s + x.totalAmount, 0),
            pendingCount:  inv.filter(x => x.status !== 'paid').length,
            overdueCount:  inv.filter(x => x.status === 'overdue').length,
            chartData:     [],
          });
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [isAdmin]);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );

  // Pie data for status breakdown
  const pieData = stats ? [
    { name: 'Paid',    value: stats.paidCount    || 0 },
    { name: 'Pending', value: stats.pendingCount || 0 },
    { name: 'Overdue', value: stats.overdueCount || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <div>
      {/* Breadcrumb */}
      <p className="text-xs text-gray-400 mb-1">
        Dashboard / <span className="text-indigo-600 font-medium">Overview</span>
      </p>

      <PageHeader title="Sales and Orders" subtitle="Your billing summary and performance">
        {isAdmin && (
          <>
            <button onClick={() => utilAPI.exportExcel({})} className="btn-secondary text-sm">
              <Download size={15}/> Export Data
            </button>
            <button onClick={() => navigate('/invoices/new')} className="btn-primary text-sm">
              <Plus size={15}/> New Invoice
            </button>
          </>
        )}
        {!isAdmin && (
          <button onClick={() => navigate('/invoices/new')} className="btn-primary text-sm">
            <Plus size={15}/> New Invoice
          </button>
        )}
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={stats?.totalAmount || 0}
          icon={IndianRupee}
          color="indigo"
          isCurrency
          trend={5}
          trendLabel="vs previous month"
        />
        <StatCard
          label="Total Invoices"
          value={stats?.totalInvoices || 0}
          icon={FileText}
          color="purple"
          trend={-2}
          trendLabel="vs previous month"
        />
        <StatCard
          label="Pending"
          value={stats?.pendingCount || 0}
          icon={Clock}
          color="yellow"
          trendLabel="Awaiting payment"
        />
        <StatCard
          label="Overdue"
          value={stats?.overdueCount || 0}
          icon={AlertTriangle}
          color="red"
          trendLabel="Needs attention"
        />
      </div>

      {/* Charts row */}
      {isAdmin && stats?.chartData?.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
          {/* Bar chart */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Sales Overview</h2>
                <p className="text-xs text-gray-400 mt-0.5">Revenue and collections by month</p>
              </div>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {['Daily','Weekly','Monthly'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      period === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {/* Legend */}
            <div className="flex gap-4 mb-3">
              {[['Revenue','#6366f1'],['Collected','#22c55e']].map(([l,c]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                  <span className="text-xs text-gray-500">{l}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.chartData} barGap={4} margin={{ top:0,right:0,left:0,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue"   fill="#6366f1" radius={[5,5,0,0]} />
                <Bar dataKey="paid"    name="Collected" fill="#22c55e" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="card p-5">
            <div className="mb-5">
              <h2 className="text-sm font-bold text-gray-900">Sales by Status</h2>
              <p className="text-xs text-gray-400 mt-0.5">Invoice breakdown</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={['#6366f1','#f59e0b','#ef4444'][i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v + ' invoices']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: ['#6366f1','#f59e0b','#ef4444'][i] }}/>
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{d.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex justify-between">
                <span className="text-xs font-bold text-gray-900">Total Revenue</span>
                <span className="text-xs font-bold text-indigo-600">{formatCurrency(stats?.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom row — recent invoices + top agents */}
      <div className={`grid gap-4 ${isAdmin && stats?.agents?.length > 0 ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>

        {/* Recent invoices */}
        <div className={`card overflow-hidden ${isAdmin && stats?.agents?.length > 0 ? 'xl:col-span-2' : ''}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Recent Invoices</h2>
              <p className="text-xs text-gray-400">Latest billing activity</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost text-xs py-1.5 px-3">
                <Filter size={13}/> Filter
              </button>
              <button onClick={() => navigate('/invoices')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View all <ArrowUpRight size={12}/>
              </button>
            </div>
          </div>
          {invoices.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet"
              subtitle="Create your first invoice to get started"
              action="Create invoice" onAction={() => navigate('/invoices/new')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Invoice No','Customer','Item','Agent','Date','Amount','Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <InvoiceRow key={inv._id} invoice={inv}
                      onClick={() => navigate(`/invoices/${inv._id}`)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top agents */}
        {isAdmin && stats?.agents?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-bold text-gray-900">Top Agents</h2>
              <p className="text-xs text-gray-400">By revenue generated</p>
            </div>
            <div className="p-4 space-y-3">
              {stats.agents.slice(0, 6).map((a, i) => {
                const maxAmt = stats.agents[0]?.totalAmount || 1;
                const pct    = Math.round((a.totalAmount / maxAmt) * 100);
                return (
                  <div key={a.id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {a.name?.[0]}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900 leading-tight">{a.name}</p>
                          <p className="text-xs text-gray-400">{a.invoiceCount} invoices</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600">{formatCurrency(a.totalAmount)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
