import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  FileText, 
  Settings, 
  LogOut, 
  Zap,
  MoreHorizontal,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilters } from '../lib/FilterContext';

interface LayoutProps {
  children: React.ReactNode;
  user: { username: string; businessName: string; currency: string } | null;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedFY, setSelectedFY, selectedClient, setSelectedClient, availableYears, clients } = useFilters();

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      onLogout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const mainNavItems = [
    { name: 'Home', path: '/', icon: LayoutDashboard },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'POs', path: '/purchase-orders', icon: FileSpreadsheet },
    { name: 'Clients', path: '/clients', icon: Users },
  ];

  const sidebarNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: FileSpreadsheet },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isPrint = location.pathname.includes('/invoices/preview/');

  if (isPrint) {
    return <div className="min-h-screen bg-white text-black p-0 print:p-0">{children}</div>;
  }

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between h-screen sticky top-0">
        <div>
          <div className="px-6 py-5 flex items-center space-x-2 border-b border-slate-100">
            <div className="p-1.5 bg-sky-50 rounded-lg border border-sky-100">
              <Zap className="h-5 w-5 text-sky-600 fill-sky-100" />
            </div>
            <span className="font-display font-extrabold text-xl text-slate-900">
              BillingApp
            </span>
          </div>

          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Business Profile</p>
            <p className="font-medium text-slate-800 mt-1 truncate" title={user?.businessName}>
              {user?.businessName || 'Freelance Profile'}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              User: <span className="text-slate-700 font-mono font-semibold">{user?.username}</span>
            </p>
          </div>

          <nav className="px-3 py-4 space-y-0.5">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-sky-50 text-sky-700 border border-sky-100' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen md:h-screen md:overflow-y-auto relative">
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-sky-600 fill-sky-100" />
            <span className="font-display font-bold text-lg text-slate-900">BillingApp</span>
          </div>
          <p className="text-xs text-slate-500 truncate max-w-[140px]" title={user?.businessName}>
            {user?.businessName}
          </p>
        </header>

        {/* Global Filters */}
        <header className="no-print sticky top-0 md:top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
            Filters
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Financial Year</label>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-medium cursor-pointer"
              >
                <option value="">All Years</option>
                {availableYears.map((fy) => (
                  <option key={fy} value={fy}>FY {fy}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-medium cursor-pointer"
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 safe-area-bottom">
        <div className="flex items-stretch justify-around px-1 pt-1 pb-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMoreMenuOpen(false)}
                className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors min-w-0 ${
                  active
                    ? 'text-sky-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5px]' : ''}`} />
                <span className={`text-[10px] mt-0.5 truncate w-full text-center ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.name}
                </span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors min-w-0 ${
              moreMenuOpen || location.pathname === '/settings'
                ? 'text-sky-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Menu (bottom sheet) */}
      {moreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-2xl animate-slide-up safe-area-bottom">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">More</h3>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-2">
              <NavLink
                to="/settings"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3.5 text-base font-medium text-slate-800 active:bg-slate-50"
              >
                <Settings className="h-5 w-5 text-slate-500" />
                Settings
              </NavLink>
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-base font-medium text-red-600 active:bg-red-50"
              >
                <LogOut className="h-5 w-5 text-red-500" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
