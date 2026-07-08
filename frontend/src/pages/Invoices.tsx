import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  SlidersHorizontal,
  Eye,
  Edit2
} from 'lucide-react';
import ActionMenu from '../components/ActionMenu';
import { api, Invoice, Client, InvoiceItem, BusinessSettings } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { useFilters } from '../lib/FilterContext';

function getFYDateRange(fy: string) {
  if (!fy) return { start: undefined, end: undefined };
  const match = fy.match(/^(\d{4})-\d{2}$/);
  if (!match) return { start: undefined, end: undefined };
  const startYear = parseInt(match[1], 10);
  const endYear = startYear + 1;
  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`
  };
}

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPoId = searchParams.get('po_id');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { selectedFY, selectedClient, clients } = useFilters();
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);

  const handleDownloadPDF = (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation();
    window.location.href = api.invoices.getPDFUrl(inv.id);
  };
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterPoId, setFilterPoId] = useState(initialPoId || '');
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
      const fyRange = getFYDateRange(selectedFY);
      const res = await api.invoices.list({
        status: filterStatus || undefined,
        client_id: selectedClient ? parseInt(selectedClient, 10) : (filterClientId ? parseInt(filterClientId, 10) : undefined),
        po_id: filterPoId ? parseInt(filterPoId, 10) : undefined,
        startDate: fyRange.start || filterStartDate || undefined,
        endDate: fyRange.end || filterEndDate || undefined,
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

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, filterClientId, filterPoId, filterStartDate, filterEndDate, page, selectedFY, selectedClient]);

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterClientId('');
    setFilterPoId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  const handleDelete = async (id: number) => {
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
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Generate invoices, record collections, and export offsite CSV backups</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Data Export Trigger Button */}
          <button
            onClick={() => triggerExport('invoices')}
            className="flex items-center space-x-1.5 px-4 py-2.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-white rounded-lg text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
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
      <div className="glass-card rounded-xl border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}</span>
          </button>
          
          {(filterStatus || filterClientId || filterPoId || filterStartDate || filterEndDate) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-600 font-semibold cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Filter Criteria</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
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

            {/* PO ID */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">PO ID</label>
              <input 
                type="text"
                placeholder="Linked PO ID..."
                className="w-full form-input py-1.5 text-xs"
                value={filterPoId}
                onChange={(e) => { setFilterPoId(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Invoice Ledger Table */}
      <div className="glass-card rounded-2xl overflow-visible md:overflow-hidden">
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
            <div className="min-h-[280px]">
              <table className="responsive-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="px-6 py-3.5">Invoice Number</th>
                    <th className="px-6 py-3.5">Client Details</th>
                    <th className="px-6 py-3.5">PO Linked</th>
                    <th className="px-6 py-3.5">Dates</th>
                    <th className="px-6 py-3.5 text-right">Amount Due</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {invoices.map((inv) => (
                    <tr 
                      key={inv.id}
                      onClick={() => navigate(`/invoices/preview/${inv.id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td data-label="Invoice Number" className="px-6 py-4 font-mono font-medium text-slate-800">
                        {inv.invoice_number}
                      </td>
                      <td data-label="Client Details" className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{inv.client_name}</div>
                        {inv.client_company && (
                          <div className="text-xs text-slate-400">{inv.client_company}</div>
                        )}
                      </td>
                      <td data-label="PO Linked" className="px-6 py-4 font-mono text-xs text-slate-400">
                        {inv.po_number ? inv.po_number : <span className="text-slate-500">-</span>}
                      </td>
                      <td data-label="Dates" className="px-6 py-4 space-y-0.5">
                        <div className="text-xs text-slate-700">Issued: {formatDate(inv.issue_date)}</div>
                        {inv.due_date && (
                          <div className="text-xs text-slate-400">Due: {formatDate(inv.due_date)}</div>
                        )}
                      </td>
                      <td data-label="Amount Due" className="px-6 py-4 text-right">
                        <div className="font-medium text-slate-800">{formatCurrency(inv.total, inv.currency)}</div>
                        {inv.amount_paid > 0 && (
                          <div className="text-xs text-emerald-600">Paid: {formatCurrency(inv.amount_paid, inv.currency)}</div>
                        )}
                      </td>
                      <td data-label="Status" className="px-6 py-4 text-center">
                        <span className={`badge badge-${inv.status}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td data-label="Actions" className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          isOpen={activeDropdownId === inv.id}
                          onToggle={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id);
                          }}
                          onClose={() => setActiveDropdownId(null)}
                          title={inv.invoice_number}
                          items={[
                            {
                              label: 'View Preview',
                              icon: <Eye className="h-4 w-4" />,
                              onClick: () => navigate(`/invoices/preview/${inv.id}`),
                            },
                            {
                              label: 'Edit Invoice',
                              icon: <Edit2 className="h-4 w-4" />,
                              onClick: () => navigate(`/invoices/edit/${inv.id}`),
                            },
                            {
                              label: downloadingInvoiceId === inv.id ? 'Generating...' : 'Download PDF',
                              icon: <Download className="h-4 w-4" />,
                              disabled: downloadingInvoiceId === inv.id,
                              onClick: () => { window.location.href = api.invoices.getPDFUrl(inv.id); },
                            },
                            {
                              label: 'Delete Invoice',
                              icon: <Trash2 className="h-4 w-4" />,
                              variant: 'danger',
                              onClick: () => handleDelete(inv.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 bg-slate-50">
                <span>Showing page <b>{page}</b> of <b>{totalPages}</b> (Total: {totalCount} invoices)</span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded bg-slate-50 border border-slate-300 hover:bg-slate-700 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded bg-slate-50 border border-slate-300 hover:bg-slate-700 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
