// src/components/NotificationsPanel.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, X, CheckCircle } from 'lucide-react';
import { analyticsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';

export default function NotificationsPanel() {
  const navigate  = useNavigate();
  const panelRef  = useRef(null);
  const [open, setOpen]           = useState(false);
  const [notifications, setNotif] = useState([]);
  const [count, setCount]         = useState(0);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    analyticsAPI.notifications().then(({ data }) => {
      setNotif(data.notifications);
      setCount(data.count);
    }).catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleClick = (n) => {
    if (n.refId) navigate(`/invoices/${n.refId}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
        <Bell size={16} className="text-gray-500"/>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{count}</span>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={14} className="text-gray-400"/>
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle size={28} className="text-green-300 mx-auto mb-2"/>
                <p className="text-sm text-gray-400">All caught up!</p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <button key={i} onClick={() => handleClick(n)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    n.type === 'overdue' ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    {n.type === 'overdue'
                      ? <AlertTriangle size={14} className="text-red-500"/>
                      : <Clock size={14} className="text-amber-600"/>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 leading-tight">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-[10px] text-gray-300 mt-1">{formatDate(n.date)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <button onClick={() => { navigate('/invoices?status=overdue'); setOpen(false); }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View all overdue invoices →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
