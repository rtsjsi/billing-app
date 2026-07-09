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
  ChevronDown,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilters } from '../lib/FilterContext';

interface LayoutProps {
  children: React.ReactNode;
  user: { username: string; businessName: string; currency: string } | null;
  onLogout: () => void;
}

const FILTER_PAGES = ['/', '/invoices', '/purchase-orders', '/clients'];

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/invoices/new')) return 'New Invoice';
  if (pathname.startsWith('/invoices/edit')) return 'Edit Invoice';
  if (pathname.startsWith('/invoices/preview')) return 'Invoice';
  if (pathname.startsWith('/invoices')) return 'Invoices';
  if (pathname.startsWith('/purchase-orders')) return 'Purchase Orders';
  if (pathname.startsWith('/clients/')) return 'Client';
  if (pathname === '/clients') return 'Clients';
  if (pathname === '/settings') return 'Settings';
  return 'BillingApp';
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const bottomNavItems = [
    { name: 'Home', path: '/', icon: LayoutDashboard },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'POs', path: '/purchase-orders', icon: FileSpreadsheet },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
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

  const showFilters = FILTER_PAGES.some(
    (p) => p === location.pathname || (p !== '/' && location.pathname.startsWith(p))
  ) && !location.pathname.match(/^\/clients\/\d+$/);

  const activeFilterCount = (selectedFY ? 1 : 0) + (selectedClient ? 1 : 0);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-white border-r border-slate-100 flex-col justify-between h-screen sticky top-0">
        <div>
          <div className="px-5 py-4 flex items-center gap-2.5">
            <div className="p-1.5 bg-brand-50 rounded-xl">
              <Zap className="h-5 w-5 text-brand-600 fill-brand-100" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">
              BillingApp
            </span>
          </div>

          <div className="mx-3 mb-2 px-3 py-3 rounded-xl bg-slate-50">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Business</p>
            <p className="font-semibold text-sm text-slate-800 mt-0.5 truncate" title={user?.businessName}>
              {user?.businessName || 'Freelance Profile'}
            </p>
          </div>

          <nav className="px-2 py-2 space-y-0.5">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.path);
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-brand-600' : ''}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-2 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:h-screen md:overflow-y-auto relative">
        {/* Mobile unified header */}
        <header className="md:hidden no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 safe-area-top">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-lg text-slate-900 tracking-tight truncate">
                {pageTitle}
              </h1>
              {user?.businessName && pageTitle === 'Dashboard' && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{user.businessName}</p>
              )}
            </div>
            {showFilters && (
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  filtersOpen || activeFilterCount > 0
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Collapsible mobile filters */}
          {showFilters && filtersOpen && (
            <div className="px-4 pb-3 space-y-2.5 border-t border-slate-50 animate-fade-in">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Financial Year
                </label>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="form-input text-sm py-2 min-h-0"
                >
                  <option value="">All Years</option>
                  {availableYears.map((fy) => (
                    <option key={fy} value={fy}>FY {fy}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="form-input text-sm py-2 min-h-0"
                >
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedFY('');
                    setSelectedClient('');
                  }}
                  className="text-xs font-semibold text-red-500 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              )}
            </div>
          )}
        </header>

        {/* Desktop filters bar */}
        {showFilters && (
          <header className="hidden md:block no-print sticky top-0 z-30 bg-white border-b border-slate-100 px-6 py-3">
            <div className="flex items-center gap-4 max-w-7xl mx-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Filters
              </span>
              <div className="flex flex-1 gap-3">
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="form-input text-sm py-2 min-h-0 max-w-[180px]"
                >
                  <option value="">All Years</option>
                  {availableYears.map((fy) => (
                    <option key={fy} value={fy}>FY {fy}</option>
                  ))}
                </select>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="form-input text-sm py-2 min-h-0 max-w-[220px]"
                >
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedFY('');
                      setSelectedClient('');
                    }}
                    className="btn-ghost text-xs text-red-500 hover:bg-red-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        <div className="flex-1 px-4 py-4 sm:px-6 md:px-8 md:py-6 max-w-7xl w-full mx-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bottom-nav safe-area-bottom">
        <div className="flex items-stretch">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`bottom-nav-item ${active ? 'bottom-nav-item-active' : ''}`}
              >
                <Icon className={`h-[22px] w-[22px] ${active ? 'stroke-[2.5px]' : ''}`} />
                <span className={`bottom-nav-label ${active ? 'font-bold' : ''}`}>
                  {item.name}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
