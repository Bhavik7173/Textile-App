import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { analyticsAPI } from '../../services/api';
import { Spinner, PageHeader } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, Users, Package, IndianRupee, Clock, BarChart2 } from 'lucide-react';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-4 py-3 text-xs">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {currency ? formatCurrency(p.value) : p.value?.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
};

function ChartCard({ title, subtitle, icon: Icon, children, action }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Icon size={16} className="text-indigo-600" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod]   = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState({
    trend: [], customers: [], status: [], agents: [],
    gst: [], items: [], collection: null, aging: [],
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [trend, customers, status, agents, gst, items, collection, aging] = await Promise.all([
          analyticsAPI.revenueTrend({ period }),
          analyticsAPI.topCustomers(),
          analyticsAPI.statusBreakdown(),
          analyticsAPI.agentPerformance(),
          analyticsAPI.gstBreakdown(),
          analyticsAPI.itemSales(),
          analyticsAPI.collectionRate(),
          analyticsAPI.aging(),
        ]);
        setData({
          trend:      trend.data.data,
          customers:  customers.data.data,
          status:     status.data.data,
          agents:     agents.data.data,
          gst:        gst.data.data,
          items:      items.data.data,
          collection: collection.data,
          aging:      aging.data.data,
        });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [period]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );

  const fmtK = (v) => v >= 100000 ? '₹'+(v/100000).toFixed(1)+'L' : v >= 1000 ? '₹'+(v/1000).toFixed(0)+'k' : '₹'+v;
  const collPct = data.collection?.rate || 0;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">
        Dashboard / <span className="text-indigo-600 font-medium">Analytics</span>
      </p>
      <PageHeader title="Analytics" subtitle="Charts and insights for your billing business">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {['daily','weekly','monthly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                period === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>{p}</button>
          ))}
        </div>
      </PageHeader>

      <div className="space-y-5">

        {/* Row 1 — Revenue trend (full width) */}
        <ChartCard title="Revenue Trend" subtitle="Billed vs collected over time" icon={TrendingUp}
          action={
            <div className="flex items-center gap-3 text-xs">
              {[['Revenue','#6366f1'],['Collected','#22c55e']].map(([l,c])=>(
                <div key={l} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded" style={{background:c}}/>
                  <span className="text-gray-500">{l}</span>
                </div>
              ))}
            </div>
          }>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.trend} margin={{top:5,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={fmtK} tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip currency/>}/>
              <Line type="monotone" dataKey="revenue"  name="Revenue"   stroke="#6366f1" strokeWidth={2.5} dot={{fill:'#6366f1',r:3}} activeDot={{r:5}}/>
              <Line type="monotone" dataKey="paid"     name="Collected" stroke="#22c55e" strokeWidth={2.5} dot={{fill:'#22c55e',r:3}} strokeDasharray="5 3"/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 2 — Status donut + Collection gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Status donut */}
          <ChartCard title="Invoice Status" subtitle="Breakdown by payment status" icon={BarChart2}>
            <div className="flex items-center">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={data.status} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                    {data.status.map((d,i) => <Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n,p) => [`${v} (${formatCurrency(p.payload.amount)})`, p.payload.name]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {data.status.map(d => (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/>
                        <span className="text-gray-600 font-medium">{d.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{d.value}</span>
                    </div>
                    <p className="text-xs text-gray-400 pl-4">{formatCurrency(d.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Collection rate gauge */}
          <ChartCard title="Collection Rate" subtitle="% of total amount collected" icon={IndianRupee}>
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10"/>
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={collPct >= 80 ? '#22c55e' : collPct >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10"
                    strokeDasharray={`${(collPct/100)*251} 251`}
                    strokeLinecap="round"
                    style={{transition:'stroke-dasharray 1s ease'}}/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{collPct}%</span>
                  <span className="text-xs text-gray-400">collected</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-4">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 font-semibold">Collected</p>
                  <p className="text-sm font-bold text-green-700">{formatCurrency(data.collection?.totalPaid||0)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-500 font-semibold">Outstanding</p>
                  <p className="text-sm font-bold text-red-600">{formatCurrency(data.collection?.totalBalance||0)}</p>
                </div>
              </div>
            </div>
          </ChartCard>

          {/* Aging chart */}
          <ChartCard title="Dues Aging" subtitle="Overdue by days" icon={Clock}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.aging} layout="vertical" margin={{top:0,right:10,left:10,bottom:0}}>
                <XAxis type="number" tickFormatter={fmtK} tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="label" tick={{fontSize:11,fill:'#6b7280'}} axisLine={false} tickLine={false} width={45}/>
                <Tooltip formatter={(v) => formatCurrency(v)} cursor={{fill:'#f3f4f6'}}/>
                <Bar dataKey="amount" name="Amount" radius={[0,5,5,0]}>
                  {data.aging.map((_,i)=>(
                    <Cell key={i} fill={['#22c55e','#f59e0b','#f97316','#ef4444'][i]}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              {data.aging.map(d => (
                <span key={d.label}>{d.count} inv.</span>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Row 3 — Top customers + Agent performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top customers horizontal bar */}
          <ChartCard title="Top 5 Customers" subtitle="By total revenue" icon={Users}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.customers} layout="vertical" margin={{top:0,right:60,left:0,bottom:0}}>
                <XAxis type="number" tickFormatter={fmtK} tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#6b7280'}}
                  axisLine={false} tickLine={false} width={110}
                  tickFormatter={v => v?.length > 14 ? v.slice(0,14)+'…' : v}/>
                <Tooltip content={<CustomTooltip currency/>}/>
                <Bar dataKey="totalAmount" name="Revenue"   fill="#6366f1" radius={[0,5,5,0]}/>
                <Bar dataKey="paidAmount"  name="Collected" fill="#22c55e" radius={[0,5,5,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Agent performance */}
          <ChartCard title="Agent Performance" subtitle="Revenue by agent" icon={Users}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.agents} margin={{top:0,right:10,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}
                  tickFormatter={v => v?.split(' ')[0]}/>
                <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip currency/>}/>
                <Bar dataKey="totalAmount" name="Billed"    fill="#6366f1" radius={[4,4,0,0]}/>
                <Bar dataKey="paidAmount"  name="Collected" fill="#22c55e" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 4 — GST breakdown + Item sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* GST stacked bar */}
          <ChartCard title="GST Collected" subtitle="Monthly SGST / CGST / IGST breakdown" icon={IndianRupee}
            action={
              <div className="flex gap-3 text-xs">
                {[['SGST','#6366f1'],['CGST','#8b5cf6'],['IGST','#06b6d4']].map(([l,c])=>(
                  <div key={l} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded" style={{background:c}}/>
                    <span className="text-gray-400">{l}</span>
                  </div>
                ))}
              </div>
            }>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.gst} margin={{top:0,right:0,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip currency/>}/>
                <Bar dataKey="sgst" name="SGST" fill="#6366f1" stackId="a" radius={[0,0,0,0]}/>
                <Bar dataKey="cgst" name="CGST" fill="#8b5cf6" stackId="a" radius={[0,0,0,0]}/>
                <Bar dataKey="igst" name="IGST" fill="#06b6d4" stackId="a" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Item-wise sales */}
          <ChartCard title="Item Sales" subtitle="Top fabrics by revenue" icon={Package}>
            <div className="space-y-3">
              {data.items.slice(0,6).map((item, i) => {
                const maxRev = data.items[0]?.revenue || 1;
                const pct    = Math.round((item.revenue / maxRev) * 100);
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{background:COLORS[i]}}/>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{item.name}</span>
                        <span className="text-xs text-gray-400">{item.count} inv.</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{width:`${pct}%`, background:COLORS[i]}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
