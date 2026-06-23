import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFirm } from '../../context/FirmContext';
import {
  LayoutDashboard, FileText, Plus, Users, Settings,
  LogOut, Layers, BookOpen, UserCircle,
  BarChart2, Truck, ChevronDown, Check, Building2,
  Package, Receipt, TrendingUp,
} from 'lucide-react';

const agentNav = [
  {
    section: 'MAIN MENU',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/invoices/new', icon: Plus,            label: 'New Invoice' },
      { to: '/invoices',     icon: FileText,        label: 'My Invoices' },
      { to: '/challans/new', icon: Plus,            label: 'New Challan' },
      { to: '/challans',     icon: Truck,           label: 'My Challans' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { to: '/customers',       icon: UserCircle,  label: 'Customers' },
      { to: '/customer-ledger', icon: BookOpen,    label: 'Customer Ledger' },
      { to: '/stock',           icon: Package,     label: 'Stock' },
      { to: '/expenses',        icon: Receipt,     label: 'Expenses' },
    ],
  },
  {
    section: 'REPORTS',
    items: [
      { to: '/reports', icon: TrendingUp, label: 'Reports & GST' },
    ],
  },
];

const adminNav = [
  {
    section: 'MAIN MENU',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/invoices/new', icon: Plus,            label: 'New Invoice' },
      { to: '/invoices',     icon: FileText,        label: 'All Invoices' },
      { to: '/challans/new', icon: Plus,            label: 'New Challan' },
      { to: '/challans',     icon: Truck,           label: 'All Challans' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { to: '/customers',       icon: UserCircle,  label: 'Customers' },
      { to: '/customer-ledger', icon: BookOpen,    label: 'Customer Ledger' },
      { to: '/stock',           icon: Package,     label: 'Stock' },
      { to: '/expenses',        icon: Receipt,     label: 'Expenses' },
      { to: '/analytics',       icon: BarChart2,   label: 'Analytics' },
      { to: '/ledger',          icon: BookOpen,    label: 'Ledger' },
      { to: '/agents',          icon: Users,       label: 'Agents' },
    ],
  },
  {
    section: 'REPORTS',
    items: [
      { to: '/reports', icon: TrendingUp, label: 'Reports & GST' },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { to: '/settings', icon: Settings, label: 'Firm Settings' },
    ],
  },
];

// ── Firm Switcher ─────────────────────────────────────────────────────────────
function FirmSwitcher() {
  const { firms, activeFirm, switchFirm } = useFirm();
  const [open, setOpen] = useState(false);

  if (!activeFirm) return null;

  // Color dot per firm
  const color = activeFirm.color || '#0d6eaa';

  return (
    <div className="relative px-3 mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                   bg-indigo-50 hover:bg-indigo-100 border border-indigo-100
                   transition-colors text-left"
      >
        {/* Color dot */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: color }}
        >
          {activeFirm.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-800 truncate leading-tight">{activeFirm.name}</p>
          <p className="text-[10px] text-indigo-400 font-medium leading-tight">Active Firm</p>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50
                        bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-2.5 pb-1.5">
            Switch Firm
          </p>
          {firms.map(firm => (
            <button
              key={firm._id}
              onClick={() => { switchFirm(firm); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5
                         hover:bg-gray-50 transition-colors text-left"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: firm.color || '#0d6eaa' }}
              >
                {firm.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{firm.name}</p>
                {firm.gstNo && (
                  <p className="text-[10px] text-gray-400 leading-tight truncate">GST: {firm.gstNo}</p>
                )}
              </div>
              {activeFirm._id === firm._id && (
                <Check size={14} className="text-indigo-600 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const navGroups = isAdmin ? adminNav : agentNav;

  const isActive = (to) => {
    if (to === '/dashboard') return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen shrink-0 shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl
                        flex items-center justify-center shadow-md shadow-indigo-200">
          <Layers size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 leading-tight">TextilePro</p>
          <p className="text-gray-400 text-xs">Billing System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-4">

        {/* ── Firm Switcher ── */}
        <div>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-3 mb-2">
            ACTIVE FIRM
          </p>
          <FirmSwitcher />
        </div>

        {/* ── Nav groups ── */}
        {navGroups.map((group) => (
          <div key={group.section}>
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-3 mb-2">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <Link key={to} to={to}
                  className={`nav-item ${isActive(to) ? 'nav-item-active' : ''}`}>
                  <Icon size={17} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 pb-5">
        <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl
                          flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
