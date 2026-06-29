import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Sun, Moon, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import SpotlightSearch from '../SpotlightSearch';
import NotificationsPanel from '../NotificationsPanel';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Layout({ children }) {
  const { user }           = useAuth();
  const { dark, toggle }   = useTheme();
  const navigate            = useNavigate();
  const [spotlight, setSpotlight] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ctrl+K opens spotlight
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSpotlight(v => !v);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-[#f0f2f9] dark:bg-gray-950">

      {/* Backdrop (mobile only, when drawer open) */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar — slide-out drawer on mobile, fixed on desktop */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <Sidebar onNavigate={closeMobile} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 sticky top-0 z-20 shadow-sm">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu size={18} className="text-gray-600 dark:text-gray-300"/>
          </button>

          {/* Search trigger */}
          <button onClick={() => setSpotlight(true)}
            className="flex items-center gap-3 flex-1 max-w-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 sm:px-4 py-2 text-sm text-gray-400 hover:border-indigo-300 hover:bg-white dark:hover:bg-gray-700 transition-all group">
            <Search size={15} className="text-gray-400 group-hover:text-indigo-500 transition-colors shrink-0"/>
            <span className="flex-1 text-left truncate">Search Here</span>
            <kbd className="hidden sm:inline text-[10px] bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 px-1.5 py-0.5 rounded font-medium">⌘K</kbd>
          </button>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Dark mode toggle */}
            <button onClick={toggle}
              className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              {dark
                ? <Sun size={16} className="text-amber-400"/>
                : <Moon size={16} className="text-gray-500"/>
              }
            </button>

            {/* Notifications */}
            <NotificationsPanel />

            {/* User chip */}
            <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 sm:px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown size={14} className="text-gray-400 hidden sm:block"/>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Spotlight */}
      <SpotlightSearch open={spotlight} onClose={() => setSpotlight(false)}/>
    </div>
  );
}
