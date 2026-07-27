import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Plus,
  Wallet,
  X,
} from 'lucide-react';
import { api, DashboardData } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { useFilters } from '../lib/FilterContext';
import PageHeader from '../components/PageHeader';

export default function Dashboard() {
  const { availableYears, clients } = useFilters();
  const [filterFY, setFilterFY] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.dashboard.getStats(
          filterFY || undefined,
          filterClientId || undefined
        );
        setData(res);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data.');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchDashboard();
  }, [filterFY, filterClientId]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
        {error}
      </div>
    );
  }

  const stats = data?.stats;
  const overdueCount = stats?.overdueCount ?? 0;
  const outstanding = stats?.totalOutstanding ?? 0;
  const collected = stats?.totalPaidAmount ?? 0;
  const confirmedPO = stats?.totalPOAmount ?? 0;
  const invoiced = stats?.totalInvoiceAmount ?? 0;
  const pending = stats?.invoicePendingAmount ?? 0;
  const hasFilters = Boolean(filterFY || filterClientId);

  const pipeline = [
    {
      label: 'Confirmed PO',
      hint: 'Work confirmed to start',
      value: formatCurrency(confirmedPO),
      icon: FileCheck,
      tone: 'text-slate-700',
      iconBg: 'bg-slate-100 text-slate-600',
      to: '/purchase-orders',
    },
    {
      label: 'Invoiced',
      hint: 'Billed to clients',
      value: formatCurrency(invoiced),
      icon: FileText,
      tone: 'text-slate-700',
      iconBg: 'bg-sky-50 text-sky-600',
      to: '/invoices',
    },
    {
      label: 'Yet to invoice',
      hint: 'Confirmed PO − invoiced',
      value: formatCurrency(pending),
      icon: Clock,
      tone: 'text-violet-700',
      iconBg: 'bg-violet-50 text-violet-600',
      to: '/purchase-orders',
    },
  ];

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="hidden md:block">
        <PageHeader
          title="Dashboard"
          subtitle="Cash position and billing pipeline at a glance"
          actions={
            <>
              <Link to="/purchase-orders" className="btn-secondary">
                <Plus className="h-4 w-4" />
                New PO
              </Link>
              <Link to="/invoices?new=1" className="btn-primary">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Link>
            </>
          }
        />
      </div>

      {/* Mobile quick actions */}
      <div className="flex gap-2 md:hidden">
        <Link to="/invoices?new=1" className="btn-primary flex-1">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Link>
        <Link to="/purchase-orders" className="btn-secondary flex-1">
          <Plus className="h-4 w-4" />
          New PO
        </Link>
      </div>

      <div className="app-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Financial Year</label>
          <select
            className="form-input text-sm py-2 min-h-0"
            value={filterFY}
            onChange={(e) => setFilterFY(e.target.value)}
          >
            <option value="">All Years</option>
            {availableYears.map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client</label>
          <div className="flex gap-2">
            <select
              className="form-input text-sm py-2 min-h-0"
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterFY('');
                  setFilterClientId('');
                }}
                className="shrink-0 px-2 text-xs text-red-600 hover:text-red-700 font-semibold"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {overdueCount > 0 && (
        <Link
          to="/invoices"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 hover:bg-red-100/80 transition-colors"
        >
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''} need follow-up
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
            View
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {/* Cash position — primary */}
      <section>
        <h2 className="section-title mb-3 px-0.5">Cash position</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="dash-metric dash-metric-amber">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="dash-metric-label">Outstanding</p>
                <p className="dash-metric-hint">Unpaid on sent invoices</p>
              </div>
              <span className="dash-metric-icon bg-amber-100 text-amber-700">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p className="dash-metric-value text-amber-800">
              {formatCurrency(outstanding)}
            </p>
          </div>

          <div className="dash-metric dash-metric-green">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="dash-metric-label">Collected</p>
                <p className="dash-metric-hint">Payments received</p>
              </div>
              <span className="dash-metric-icon bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="dash-metric-value text-emerald-800">
              {formatCurrency(collected)}
            </p>
          </div>
        </div>
      </section>

      {/* Billing pipeline — secondary */}
      <section>
        <h2 className="section-title mb-3 px-0.5">Billing pipeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pipeline.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className="dash-metric dash-metric-plain group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="dash-metric-label">{item.label}</p>
                    <p className="dash-metric-hint">{item.hint}</p>
                  </div>
                  <span className={`dash-metric-icon ${item.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className={`dash-metric-value ${item.tone}`}>
                  {item.value}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
