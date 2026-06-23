import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Zap
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilters } from '../lib/FilterContext';

interface LayoutProps {
  children: React.ReactNode;
  user: { username: string; businessName: string; currency: string } | null;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: FileSpreadsheet },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // If in print mode, we render just the children without any layout elements (no sidebar, no headers)
  const isPrint = location.pathname.includes('/invoices/preview/');

  if (isPrint) {
    return <div className="min-h-screen bg-white text-black p-0 print:p-0">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-sky-400 fill-sky-400" />
          <span className="font-display font-bold text-lg text-white">BillingApp</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/90 backdrop-blur-md border-r border-slate-800/80 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo & Header */}
          <div className="px-6 py-5 hidden md:flex items-center space-x-2 border-b border-slate-800/50">
            <div className="p-1.5 bg-sky-500/10 rounded-lg border border-sky-500/20">
              <Zap className="h-5 w-5 text-sky-400 fill-sky-400/30" />
            </div>
            <span className="font-display font-extrabold text-xl bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              BillingApp
            </span>
          </div>

          {/* Business Name Badge */}
          <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-950/40">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Business Profile</p>
            <p className="font-medium text-slate-200 mt-1 truncate" title={user?.businessName}>
              {user?.businessName || 'Freelance Profile'}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              User: <span className="text-slate-400 font-mono font-bold">{user?.username}</span>
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? 'bg-sky-500/10 border-l-4 border-sky-400 text-sky-400 shadow-[inset_4px_0_12px_rgba(14,165,233,0.05)]' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-4 border-transparent'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-105" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User / Logout Section */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-950/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 group"
          >
            <LogOut className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-950 relative">
        {/* Top Sticky Global Filter Header */}
        <header className="no-print sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/60 z-30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Global context filters</span>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
            {/* Financial Year Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Financial Year:</span>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-all font-medium cursor-pointer shadow-sm"
              >
                <option value="">All Years</option>
                {availableYears.map((fy) => (
                  <option key={fy} value={fy}>FY {fy}</option>
                ))}
              </select>
            </div>

            {/* Client Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Client:</span>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-all font-medium cursor-pointer shadow-sm max-w-[200px]"
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
