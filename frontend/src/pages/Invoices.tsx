import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import SortableTh, { SortDir, nextSortState } from '../components/SortableTh';
import { api, Invoice } from '../lib/api';
import { formatDate, getFYDateRange } from '../lib/utils';
import { useFilters } from '../lib/FilterContext';
import PageHeader from '../components/PageHeader';
import InvoiceAmounts from '../components/InvoiceAmounts';
import { useToast } from '../components/Toast';
import InvoiceEditorModal from './InvoiceEditor';

export default function Invoices() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const linkedPoId = searchParams.get('po_id');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { selectedFY, setSelectedFY, availableYears, clients } = useFilters();
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  // Invoice editor modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [modalClientId, setModalClientId] = useState<string>('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClientId, setFilterClientId] = useState('');

  // Sorting (default: creation date descending)
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
        client_id: filterClientId ? parseInt(filterClientId, 10) : undefined,
        po_id: linkedPoId ? parseInt(linkedPoId, 10) : undefined,
        startDate: fyRange.start || undefined,
        endDate: fyRange.end || undefined,
        page,
        limit,
        sortBy: sortKey,
        sortDir,
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
  }, [filterStatus, filterClientId, linkedPoId, page, selectedFY, sortKey, sortDir]);

  // Open modal when URL contains ?new=1 or ?edit=<id>
  useEffect(() => {
    const newInvoice = searchParams.get('new');
    const editId = searchParams.get('edit');
    const clientIdParam = searchParams.get('client_id');

    if (newInvoice === '1') {
      setModalClientId(clientIdParam || '');
      setEditingInvoiceId(null);
      setModalOpen(true);
      navigate('/invoices', { replace: true });
    } else if (editId) {
      const numId = parseInt(editId, 10);
      if (!isNaN(numId)) {
        setEditingInvoiceId(numId);
        setModalOpen(true);
        navigate('/invoices', { replace: true });
      }
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterClientId('');
    setSelectedFY('');
    setPage(1);
  };

  const handleSort = (column: string) => {
    const next = nextSortState(sortKey, sortDir, column);
    setSortKey(next.key);
    setSortDir(next.dir);
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
        onClick: () => {
          setEditingInvoiceId(inv.id);
          setModalOpen(true);
        },
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
              <button
                onClick={() => { setEditingInvoiceId(null); setModalClientId(''); setModalOpen(true); }}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </button>
            </>
          }
        />
      </div>

      <button
        onClick={() => { setEditingInvoiceId(null); setModalClientId(''); setModalOpen(true); }}
        className="md:hidden btn-primary w-full"
      >
        <Plus className="h-4 w-4" />
        Create Invoice
      </button>

      <div className="app-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Financial Year</label>
          <select
            className="form-input text-sm py-2 min-h-0"
            value={selectedFY}
            onChange={(e) => { setSelectedFY(e.target.value); setPage(1); }}
          >
            <option value="">All Years</option>
            {availableYears.map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
        </div>
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
          <div className="flex gap-2">
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
            {(filterStatus || filterClientId || selectedFY) && (
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

      {linkedPoId && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sm text-sky-800">
          <span>Showing invoices linked to PO #{linkedPoId}</span>
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900"
          >
            Clear
          </button>
        </div>
      )}

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
                <tr className="border-b border-slate-200 bg-slate-50">
                  <SortableTh label="Invoice" column="invoice_number" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortableTh label="Client" column="client_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortableTh label="Dates" column="issue_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortableTh label="Amounts" column="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortableTh label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="center" />
                  <th className="px-6 py-3.5 text-right text-xs text-slate-400 font-semibold uppercase tracking-wider">Actions</th>
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

      <InvoiceEditorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingInvoiceId={editingInvoiceId}
        initialClientId={modalClientId || null}
        onSaved={fetchInvoices}
      />
    </div>
  );
}
