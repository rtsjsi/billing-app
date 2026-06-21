import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  Download, 
  Copy, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  X,
  SlidersHorizontal
} from 'lucide-react';
import { api, Invoice, Client } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

export default function Invoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.invoices.list({
        status: filterStatus || undefined,
        client_id: filterClientId ? parseInt(filterClientId, 10) : undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        page,
        limit
      });
      setInvoices(res.invoices);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.clients.list('', false);
      setClients(res);
    } catch (err) {
      console.error('Failed to load clients dropdown', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, filterClientId, filterStartDate, filterEndDate, page]);

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterClientId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  const handleDuplicate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // prevent row click navigation
    if (!window.confirm('Clone this invoice into a new draft?')) return;
    
    try {
      const res = await api.invoices.duplicate(id);
      // Redirect straight to editing the new duplicate draft!
      navigate(`/invoices/edit/${res.invoice.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to clone invoice.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // prevent row click navigation
    if (!window.confirm('Are you sure you want to permanently delete this invoice? This cannot be undone.')) return;

    try {
      await api.invoices.delete(id);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice.');
    }
  };

  const triggerExport = (entity: 'clients' | 'invoices' | 'purchase-orders') => {
    const url = api.settings.getExportUrl(entity);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Invoices</h1>
          <p className="text-slate-400 text-sm mt-1">Generate invoices, record collections, and export offsite CSV backups</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Data Export Trigger Button */}
          <button
            onClick={() => triggerExport('invoices')}
            className="flex items-center space-x-1.5 px-4 py-2.5 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 rounded-lg text-sm font-semibold text-slate-300 transition-colors cursor-pointer"
            title="Download all Invoices as CSV backup"
          >
            <Download className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <Link
            to="/invoices/new"
            className="flex items-center space-x-1.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg shadow-sky-500/10 cursor-pointer transition-all duration-200"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Filter Toggles & Actions */}
      <div className="glass-card rounded-xl border-slate-800/80 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}</span>
          </button>
          
          {(filterStatus || filterClientId || filterStartDate || filterEndDate) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center space-x-1 text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Filter Criteria</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-800/50">
            {/* Client picker */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Client</label>
              <select
                className="w-full form-input py-1.5 text-xs"
                value={filterClientId}
                onChange={(e) => { setFilterClientId(e.target.value); setPage(1); }}
              >
                <option value="">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status picker */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Status</label>
              <select
                className="w-full form-input py-1.5 text-xs"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Start Date</label>
              <input 
                type="date"
                className="w-full form-input py-1.5 text-xs"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">End Date</label>
              <input 
                type="date"
                className="w-full form-input py-1.5 text-xs"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Invoice Ledger Table */}
      <div className="glass-card rounded-2xl border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No invoices found. Click "Create Invoice" to issue your first bill.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/20">
                    <th className="px-6 py-3.5">Invoice Number</th>
                    <th className="px-6 py-3.5">Client Details</th>
                    <th className="px-6 py-3.5">PO Linked</th>
                    <th className="px-6 py-3.5">Dates</th>
                    <th className="px-6 py-3.5 text-right">Amount Due</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30 text-sm">
                  {invoices.map((inv) => (
                    <tr 
                      key={inv.id}
                      onClick={() => navigate(`/invoices/preview/${inv.id}`)}
                      className="hover:bg-slate-800/10 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-slate-200">
                        {inv.invoice_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{inv.client_name}</div>
                        {inv.client_company && (
                          <div className="text-[10px] text-slate-500">{inv.client_company}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {inv.po_number ? inv.po_number : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="px-6 py-4 space-y-0.5">
                        <div className="text-xs text-slate-300">Issued: {formatDate(inv.issue_date)}</div>
                        {inv.due_date && (
                          <div className="text-[10px] text-slate-500">Due: {formatDate(inv.due_date)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-white">{formatCurrency(inv.total, inv.currency)}</div>
                        {inv.amount_paid > 0 && (
                          <div className="text-[10px] text-emerald-400">Paid: {formatCurrency(inv.amount_paid, inv.currency)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`badge badge-${inv.status}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5">
                        <button
                          onClick={(e) => handleDuplicate(e, inv.id)}
                          className="inline-flex p-1.5 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-colors cursor-pointer"
                          title="Clone Invoice"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, inv.id)}
                          className="inline-flex p-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-500/70 hover:text-red-400 rounded border border-red-500/10 transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-400 bg-slate-950/10">
                <span>Showing page <b>{page}</b> of <b>{totalPages}</b> (Total: {totalCount} invoices)</span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
