// src/components/ActivityFeed.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CreditCard, UserCircle, Clock, RefreshCw } from 'lucide-react';
import { analyticsAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';

const TYPE_CONFIG = {
  invoice_created:  { icon: FileText,     color: 'bg-indigo-100 text-indigo-600',  label: 'Invoice created' },
  payment_recorded: { icon: CreditCard,   color: 'bg-green-100 text-green-600',    label: 'Payment recorded' },
  customer_added:   { icon: UserCircle,   color: 'bg-purple-100 text-purple-600',  label: 'Customer added' },
  status_updated:   { icon: RefreshCw,    color: 'bg-amber-100 text-amber-600',    label: 'Status updated' },
};

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return Math.floor(secs/60) + 'm ago';
  if (secs < 86400) return Math.floor(secs/3600) + 'h ago';
  return Math.floor(secs/86400) + 'd ago';
}

export default function ActivityFeed({ limit = 15, compact = false }) {
  const navigate  = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    analyticsAPI.activity({ limit }).then(({ data }) => {
      setActivities(data.activities);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [limit]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
    </div>
  );

  if (activities.length === 0) return (
    <div className="py-8 text-center">
      <Clock size={24} className="text-gray-200 mx-auto mb-2"/>
      <p className="text-sm text-gray-400">No activity yet</p>
    </div>
  );

  return (
    <div className="space-y-0">
      {activities.map((act, i) => {
        const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.status_updated;
        const Icon = cfg.icon;
        return (
          <div key={act._id || i}
            onClick={() => act.refId && navigate(`/invoices/${act.refId}`)}
            className={`flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 transition-colors
              ${act.refId ? 'cursor-pointer hover:bg-gray-50 -mx-1 px-1 rounded-lg' : ''}`}>
            {/* Timeline dot */}
            <div className="flex flex-col items-center pt-0.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                <Icon size={13}/>
              </div>
              {i < activities.length - 1 && (
                <div className="w-0.5 h-full bg-gray-100 mt-1 mb-0 min-h-[12px]"/>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs font-semibold text-gray-900 leading-tight">{act.title}</p>
              {act.subtitle && (
                <p className="text-xs text-gray-400 mt-0.5 leading-snug truncate">{act.subtitle}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-300">{timeAgo(act.createdAt)}</span>
                {act.agentName && <span className="text-[10px] text-gray-300">· {act.agentName}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
