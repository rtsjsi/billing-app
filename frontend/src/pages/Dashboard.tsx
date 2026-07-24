import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFilters } from '../lib/FilterContext';
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { api, DashboardData } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import PageHeader from '../components/PageHeader';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const { selectedFY, selectedClient } = useFilters();
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.dashboard.getStats(
          selectedFY || undefined,
          selectedClient || undefined
        );
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data.');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedFY, selectedClient]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
        {error}
      </div>
    );
  }

  const stats = data?.stats;
  const recentInvoices = data?.recentInvoices || [];
  const openPOs = data?.openPOs || [];

  const secondaryStats = [
    { label: 'Total PO Amount', value: formatCurrency(stats?.totalPOAmount), icon: FileCheck, color: 'text-indigo-500' },
    { label: 'Total Invoiced', value: formatCurrency(stats?.totalInvoiceAmount), icon: DollarSign, color: 'text-blue-500' },
    { label: 'Invoice Pending', value: formatCurrency(stats?.invoicePendingAmount), icon: FileText, color: 'text-violet-500' },
    { label: 'Total Paid', value: formatCurrency(stats?.totalPaidAmount), icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Outstanding', value: formatCurrency(stats?.totalOutstanding), icon: Clock, color: 'text-amber-500' },
    { label: 'Overdue', value: String(stats?.overdueCount ?? 0), icon: AlertCircle, color: 'text-red-500', danger: (stats?.overdueCount ?? 0) > 0 },
  ];

  return (
    <div className="space-y-5 md:space-y-8">
      {/* Desktop page header — hidden title on mobile (shown in layout header) */}
      <div className="hidden md:block">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your billings, payments, and purchase orders"
          actions={
            <>
              <Link to="/purchase-orders" className="btn-secondary">
                <Plus className="h-4 w-4" />
                New PO
              </Link>
              <Link to="/invoices/new" className="btn-primary">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Link>
            </>
          }
        />
      </div>

      {/* Hero portfolio card */}
      <div className="hero-card">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="hero-card-label">Total Outstanding</p>
            <p className="hero-card-value">{formatCurrency(stats?.totalOutstanding)}</p>
          </div>
          <div>
            <p className="hero-card-label">Total Collected</p>
            <p className="hero-card-value">{formatCurrency(stats?.totalPaidAmount)}</p>
          </div>
        </div>
        {(stats?.overdueCount ?? 0) > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{stats?.overdueCount} overdue invoice{stats?.overdueCount !== 1 ? 's' : ''} need follow-up</span>
          </div>
        )}
      </div>

      {/* Mobile quick actions */}
      <div className="flex gap-2 md:hidden">
        <Link to="/invoices/new" className="btn-primary flex-1">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Link>
        <Link to="/purchase-orders" className="btn-secondary flex-1">
          <Plus className="h-4 w-4" />
          New PO
        </Link>
      </div>

      {/* Horizontal scroll stats on mobile, grid on desktop */}
      <div>
        <h2 className="section-title mb-3 px-0.5">Overview</h2>
        <div className="stats-scroll md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-3 md:overflow-visible">
          {secondaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card md:min-w-0">
                <div className="flex items-center justify-between">
                  <span className="stat-card-label">{stat.label}</span>
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
                <p className={`stat-card-value ${stat.danger ? 'text-red-500' : ''}`}>
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <h2 className="section-title">Recent Invoices</h2>
          <Link to="/invoices" className="btn-ghost text-xs py-1 px-2">
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No invoices yet. Create your first invoice to get started.
          </div>
        ) : (
          <div className="mobile-list">
            {recentInvoices.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => navigate(`/invoices/preview/${inv.id}`)}
                className="mobile-list-item w-full text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="mobile-list-item-title font-mono">{inv.invoice_number}</p>
                  <p className="mobile-list-item-subtitle">
                    {inv.client_name} · {formatDate(inv.issue_date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="mobile-list-item-amount">{formatCurrency(inv.total, inv.currency)}</p>
                  <span className={`badge badge-${inv.status} mt-1`}>
                    {inv.status === 'partially_paid' ? 'Part. Paid' : inv.status}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 hidden md:block" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active POs */}
      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <h2 className="section-title">Active Purchase Orders</h2>
          <Link to="/purchase-orders" className="btn-ghost text-xs py-1 px-2">
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {openPOs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No active purchase orders. Record a PO to get started.
          </div>
        ) : (
          <div className="mobile-list">
            {openPOs.map((po) => (
              <button
                key={po.id}
                type="button"
                onClick={() => navigate(`/clients/${po.client_id}`)}
                className="mobile-list-item w-full text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="mobile-list-item-title font-mono">{po.po_number}</p>
                  <p className="mobile-list-item-subtitle">
                    {po.client_name} · {formatDate(po.po_date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="mobile-list-item-amount">
                    {po.amount ? formatCurrency(po.amount, po.currency) : '-'}
                  </p>
                  <span className={`badge badge-${po.status} mt-1`}>
                    {po.status === 'partially_invoiced' ? 'Part. Invoiced' : po.status}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 hidden md:block" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
