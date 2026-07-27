import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Download, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Eye,
  Edit2,
  DollarSign
} from 'lucide-react';
import ActionMenu, { ActionMenuItem } from '../components/ActionMenu';
import ConfirmModal from '../components/ConfirmModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { api, Invoice, Client, InvoiceItem, BusinessSettings } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useFilters } from '../lib/FilterContext';
import PageHeader from '../components/PageHeader';
import InvoiceAmounts from '../components/InvoiceAmounts';
import { useToast } from '../components/Toast';

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
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const initialPoId = searchParams.get('po_id');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { selectedFY, selectedClient, clients } = useFilters();
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterPoId, setFilterPoId] = useState(initialPoId || '');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

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

  const handleDelete = (id: number) => {
    setDeleteInvoiceId(id);
  };

  const performDelete = async () => {
    if (!deleteInvoiceId) return;
    try {
      await api.invoices.delete(deleteInvoiceId);
      setDeleteInvoiceId(null);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete invoice.');
    }
  };

  const triggerExport = (entity: 'clients' | 'invoices' | 'purchase-orders') => {
    const url = api.settings.getExportUrl(entity);
    window.open(url, '_blank');
  };

  const getInvoiceActionItems = (inv: Invoice): ActionMenuItem[] => {
    const isOutstanding = inv.status !== 'paid' && inv.status !== 'cancelled';
    const items: ActionMenuItem[] = [
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
    ];

    if (isOutstanding) {
      items.push({
        label: 'Record Payment',
        icon: <DollarSign className="h-4 w-4" />,
        onClick: () => setPaymentInvoice(inv),
      });
    }

    items.push(
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
      }
    );

    return items;
  };

  return (
    <div className="space-y-5">
      <div className="hidden md:block">
        <PageHeader
          title="Invoices"
          subtitle="Generate invoices, record collections, and export CSV backups"
          actions={
            <>
              <button
                onClick={() => triggerExport('invoices')}
                className="btn-secondary"
                title="Download all Invoices as CSV backup"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <Link to="/invoices/new" className="btn-primary">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Link>
            </>
          }
        />
      </div>

      <Link to="/invoices/new" className="md:hidden btn-primary w-full">
        <Plus className="h-4 w-4" />
        Create Invoice
      </Link>

      <div className="app-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client</label>
          <select
            className="form-input text-sm py-2 min-h-0"
            value={filterClientId}
            onChange={(e) => { setFilterClientId(e.target.value); setPage(1); }}
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
          <select
            className="form-input text-sm py-2 min-h-0"
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
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Start Date</label>
          <input
            type="date"
            className="form-input text-sm py-2 min-h-0"
            value={filterStartDate}
            onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">End Date</label>
          <input
            type="date"
            className="form-input text-sm py-2 min-h-0"
            value={filterEndDate}
            onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Linked PO ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="PO id..."
              className="form-input text-sm py-2 min-h-0"
              value={filterPoId}
              onChange={(e) => { setFilterPoId(e.target.value); setPage(1); }}
            />
            {(filterStatus || filterClientId || filterPoId || filterStartDate || filterEndDate) && (
              <button
                type="button"
                onClick={handleClearFilters}
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

      <div className="app-card overflow-visible">
        {loading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No invoices found. Click "Create Invoice" to issue your first bill.
          </div>
        ) : (
          <div className="min-h-[200px]">
            <table className="responsive-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3.5">Invoice</th>
                  <th className="px-6 py-3.5">Client</th>
                  <th className="px-6 py-3.5">Dates</th>
                  <th className="px-6 py-3.5 text-right">Amounts</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/preview/${inv.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer align-top"
                  >
                    <td data-label="Invoice" className="px-6 py-3.5">
                      <div className="font-mono font-semibold text-slate-800 whitespace-nowrap">{inv.invoice_number}</div>
                      {inv.po_number ? (
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">{inv.po_number}</div>
                      ) : null}
                    </td>
                    <td data-label="Client" className="px-6 py-3.5">
                      <div className="font-medium text-slate-800">{inv.client_name}</div>
                      {inv.client_company ? (
                        <div className="text-xs text-slate-400 mt-0.5">{inv.client_company}</div>
                      ) : null}
                    </td>
                    <td data-label="Dates" className="px-6 py-3.5 text-slate-400 whitespace-nowrap">
                      <div className="text-xs text-slate-700">{formatDate(inv.issue_date)}</div>
                      {inv.due_date ? (
                        <div className="text-xs text-slate-400 mt-0.5">Due {formatDate(inv.due_date)}</div>
                      ) : null}
                    </td>
                    <td data-label="Amounts" className="px-6 py-3.5">
                      <div className="flex justify-end">
                        <InvoiceAmounts
                          total={inv.total}
                          amountPaid={inv.amount_paid}
                          currency={inv.currency}
                        />
                      </div>
                    </td>
                    <td data-label="Status" className="px-6 py-3.5 text-center">
                      <span className={`badge badge-${inv.status}`}>
                        {inv.status === 'partially_paid' ? 'partial' : inv.status}
                      </span>
                    </td>
                    <td data-label="Actions" className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        isOpen={activeDropdownId === inv.id}
                        onToggle={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id);
                        }}
                        onClose={() => setActiveDropdownId(null)}
                        title={inv.invoice_number}
                        items={getInvoiceActionItems(inv)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 bg-slate-50">
                <span>Page <b>{page}</b> of <b>{totalPages}</b> · {totalCount} invoices</span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <RecordPaymentModal
        isOpen={paymentInvoice !== null}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onSuccess={fetchInvoices}
      />

      <ConfirmModal
        isOpen={deleteInvoiceId !== null}
        title="Delete Invoice"
        message="Are you sure you want to permanently delete this invoice? This cannot be undone."
        confirmText="Delete"
        onConfirm={performDelete}
        onCancel={() => setDeleteInvoiceId(null)}
      />
    </div>
  );
}
