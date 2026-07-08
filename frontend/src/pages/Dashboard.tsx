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
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { api, DashboardData } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const { selectedFY, selectedClient, clients } = useFilters();
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch stats whenever selected filters change
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await api.dashboard.getStats(
          selectedFY || undefined,
          selectedClient || undefined
        );
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data.');
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedFY, selectedClient]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm">
        {error}
      </div>
    );
  }

  const stats = data?.stats;
  const recentInvoices = data?.recentInvoices || [];
  const openPOs = data?.openPOs || [];

  return (
    <div className="space-y-8">
      {/* Welcome banner / title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Overview of your client billings, payments, and Purchase Orders</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link 
            to="/purchase-orders" 
            className="flex items-center space-x-1.5 px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 rounded-lg text-sm font-medium transition-all text-slate-300 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New PO</span>
          </Link>
          <Link 
            to="/invoices/new" 
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg text-sm font-medium text-white shadow-lg shadow-sky-500/10 cursor-pointer transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Grid Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total PO Amount */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border-slate-800/80">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total PO Amount</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-white mt-1">
              {formatCurrency(stats?.totalPOAmount)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Sum of all purchase orders</p>
          </div>
        </div>

        {/* Total Invoiced */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border-slate-800/80">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Invoiced</span>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-white mt-1">
              {formatCurrency(stats?.totalInvoiceAmount)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Sum of all invoices (excl. cancelled)</p>
          </div>
        </div>

        {/* Invoice Pending */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border-slate-800/80">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Invoice Pending</span>
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-white mt-1">
              {formatCurrency(stats?.invoicePendingAmount)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Unbilled purchase order balance</p>
          </div>
        </div>

        {/* Total Paid */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border-slate-800/80">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Paid</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-white mt-1">
              {formatCurrency(stats?.totalPaidAmount)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Total payments collected</p>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border-slate-800/80">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Outstanding</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-white mt-1">
              {formatCurrency(stats?.totalOutstanding)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Unpaid balance of sent invoices</p>
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border-slate-800/80">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Overdue Invoices</span>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-red-400 mt-1">
              {stats?.overdueCount}
            </h3>
            <p className="text-[10px] text-red-500/80 mt-1">Needs immediate follow-up</p>
          </div>
        </div>
      </div>

      {/* Grid Split: Recent Invoices & Open Purchase Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Invoices Widget */}
        <div className="glass-card rounded-2xl border-slate-800/80 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-sky-400" />
              <h2 className="font-display font-bold text-lg text-white">Recent Invoices</h2>
            </div>
            <Link 
              to="/invoices" 
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex-1">
            {recentInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No invoices found. Click "Create Invoice" to start billing!
              </div>
            ) : (
              <table className="responsive-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/20">
                    <th className="px-6 py-3">Invoice Number</th>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">Issue Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {recentInvoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      onClick={() => navigate(`/invoices/preview/${inv.id}`)}
                      className="hover:bg-slate-800/20 transition-all duration-150 cursor-pointer text-sm"
                    >
                      <td data-label="Invoice Number" className="px-6 py-4 font-mono font-medium text-slate-300">{inv.invoice_number}</td>
                      <td data-label="Client" className="px-6 py-4 text-slate-200">
                        <div className="font-medium">{inv.client_name}</div>
                        <div className="text-[10px] text-slate-500">{inv.client_company}</div>
                      </td>
                      <td data-label="Issue Date" className="px-6 py-4 text-slate-400">{formatDate(inv.issue_date)}</td>
                      <td data-label="Amount" className="px-6 py-4 text-right font-medium text-white">{formatCurrency(inv.total, inv.currency)}</td>
                      <td data-label="Status" className="px-6 py-4 text-center">
                        <span className={`badge badge-${inv.status}`}>
                          {inv.status === 'partially_paid' ? 'Part. Paid' : inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Open Purchase Orders Widget */}
        <div className="glass-card rounded-2xl border-slate-800/80 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-sky-400" />
              <h2 className="font-display font-bold text-lg text-white">Active Purchase Orders</h2>
            </div>
            <Link 
              to="/purchase-orders" 
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex-1">
            {openPOs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No active Purchase Orders recorded. Click "New PO" to record one!
              </div>
            ) : (
              <table className="responsive-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/20">
                    <th className="px-6 py-3">PO Number</th>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">PO Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {openPOs.map((po) => (
                    <tr 
                      key={po.id} 
                      onClick={() => navigate(`/clients/${po.client_id}`)}
                      className="hover:bg-slate-800/20 transition-all duration-150 cursor-pointer text-sm"
                    >
                      <td data-label="PO Number" className="px-6 py-4 font-mono font-medium text-slate-300">{po.po_number}</td>
                      <td data-label="Client" className="px-6 py-4 text-slate-200 font-medium">{po.client_name}</td>
                      <td data-label="PO Date" className="px-6 py-4 text-slate-400">{formatDate(po.po_date)}</td>
                      <td data-label="Amount" className="px-6 py-4 text-right font-medium text-white">
                        {po.amount ? formatCurrency(po.amount, po.currency) : '-'}
                      </td>
                      <td data-label="Status" className="px-6 py-4 text-center">
                        <span className={`badge badge-${po.status}`}>
                          {po.status === 'partially_invoiced' ? 'Part. Invoiced' : po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
