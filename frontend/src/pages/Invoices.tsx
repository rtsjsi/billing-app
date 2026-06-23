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
  SlidersHorizontal,
  MoreVertical,
  Eye,
  Edit2
} from 'lucide-react';
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

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { selectedFY, selectedClient, clients } = useFilters();
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [pdfData, setPdfData] = useState<{ invoice: Invoice; items: InvoiceItem[]; settings: BusinessSettings } | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    if (activeDropdownId === null) return;
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeDropdownId]);

  useEffect(() => {
    if (!pdfData) return;
    const generatePDF = async () => {
      const element = document.getElementById('invoice-pdf-template');
      if (!element) return;
      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const opt = {
          margin:       12,
          filename:     `invoice_${pdfData.invoice.invoice_number}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().from(element).set(opt).save();
      } catch (err) {
        console.error('PDF generation failed', err);
        alert('Could not download PDF.');
      } finally {
        setPdfData(null);
      }
    };
    generatePDF();
  }, [pdfData]);

  const handleDownloadPDF = async (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation();
    setDownloadingInvoiceId(inv.id);
    try {
      const invRes = await api.invoices.get(inv.id);
      const settingsRes = await api.settings.get();
      setPdfData({
        invoice: invRes.invoice,
        items: invRes.items,
        settings: settingsRes
      });
    } catch (err: any) {
      alert(err.message || 'Failed to fetch invoice details for PDF.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };
  
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
      const fyRange = getFYDateRange(selectedFY);
      const res = await api.invoices.list({
        status: filterStatus || undefined,
        client_id: selectedClient ? parseInt(selectedClient, 10) : (filterClientId ? parseInt(filterClientId, 10) : undefined),
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
  }, [filterStatus, filterClientId, filterStartDate, filterEndDate, page, selectedFY, selectedClient]);

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
            <div className="overflow-x-auto min-h-[280px]">
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
                      <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-block text-left relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id);
                            }}
                            className="p-1.5 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-colors cursor-pointer"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {activeDropdownId === inv.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()} 
                              className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50 backdrop-blur-sm"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                  navigate(`/invoices/preview/${inv.id}`);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center space-x-2 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View Preview</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                  navigate(`/invoices/edit/${inv.id}`);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center space-x-2 cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span>Edit Invoice</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                  handleDuplicate(e, inv.id);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center space-x-2 cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                <span>Clone Invoice</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                  handleDownloadPDF(e, inv);
                                }}
                                disabled={downloadingInvoiceId === inv.id}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>{downloadingInvoiceId === inv.id ? 'Generating...' : 'Download PDF'}</span>
                              </button>
                              <div className="border-t border-slate-800/60 my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                  handleDelete(e, inv.id);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center space-x-2 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete Invoice</span>
                              </button>
                            </div>
                          )}
                        </div>
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
      
      {pdfData && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px' }}>
          <div 
            id="invoice-pdf-template"
            className="bg-white text-slate-900 p-12 font-sans overflow-hidden text-sm"
            style={{ width: '800px', boxSizing: 'border-box' }}
          >
            {/* Header Branding */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem' }}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2" style={{ display: 'flex', alignItems: 'center' }}>
                  <h2 className="font-display font-extrabold text-2xl tracking-tight text-slate-950 uppercase" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#020617', textTransform: 'uppercase' }}>
                    {pdfData.settings.business_name}
                  </h2>
                </div>
                {pdfData.settings.owner_name && (
                  <p className="text-slate-600 font-medium text-xs" style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
                    Proprietor: {pdfData.settings.owner_name}
                  </p>
                )}
                <p className="text-slate-500 text-xs whitespace-pre-line leading-relaxed max-w-sm" style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'pre-line', lineHeight: 1.625, maxWidth: '24rem' }}>
                  {pdfData.settings.address}
                </p>
              </div>

              <div className="space-y-1.5 text-right" style={{ textAlign: 'right' }}>
                <h1 className="font-display font-black text-3xl tracking-tight text-slate-900" style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a' }}>
                  INVOICE
                </h1>
                <p className="font-mono text-sm font-bold text-sky-700" style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: '#0369a1' }}>
                  {pdfData.invoice.invoice_number}
                </p>
                
                <div className="pt-2 text-xs space-y-0.5 text-slate-500" style={{ paddingTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <div>
                    <span className="font-semibold text-slate-700" style={{ fontWeight: 600, color: '#334155' }}>Date of Issue:</span>{' '}
                    {formatDate(pdfData.invoice.issue_date)}
                  </div>
                  {pdfData.invoice.due_date && (
                    <div>
                      <span className="font-semibold text-slate-700" style={{ fontWeight: 600, color: '#334155' }}>Payment Due:</span>{' '}
                      {formatDate(pdfData.invoice.due_date)}
                    </div>
                  )}
                  {pdfData.invoice.po_number && (
                    <div className="font-mono" style={{ fontFamily: 'monospace' }}>
                      <span className="font-semibold text-slate-700" style={{ fontWeight: 600, color: '#334155' }}>PO Ref:</span>{' '}
                      {pdfData.invoice.po_number}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Billing profiles split */}
            <div className="grid grid-cols-2 gap-8 py-8 border-b border-slate-100" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '2rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2.5" style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
                  Invoiced To
                </h3>
                <p className="font-bold text-slate-900 text-base" style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                  {pdfData.invoice.client_name}
                </p>
                {pdfData.invoice.client_company && (
                  <p className="text-slate-700 font-medium mt-0.5" style={{ color: '#334155', fontWeight: 500, marginTop: '0.125rem' }}>
                    {pdfData.invoice.client_company}
                  </p>
                )}
                <p className="text-slate-500 text-xs mt-2 whitespace-pre-line leading-relaxed" style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem', whiteSpace: 'pre-line', lineHeight: 1.625 }}>
                  Billing address: {pdfData.invoice.client_id ? 'Address details loaded in ledger' : '-'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2" style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Business Tax Registrations
                  </h3>
                  <div className="space-y-1 text-xs text-slate-600" style={{ fontSize: '0.75rem', color: '#475569' }}>
                    {pdfData.settings.gstin && (
                      <div>
                        <span className="font-semibold text-slate-700" style={{ fontWeight: 600, color: '#334155' }}>GSTIN:</span>{' '}
                        <span className="font-mono" style={{ fontFamily: 'monospace' }}>{pdfData.settings.gstin}</span>
                      </div>
                    )}
                    {pdfData.settings.pan && (
                      <div>
                        <span className="font-semibold text-slate-700" style={{ fontWeight: 600, color: '#334155' }}>PAN:</span>{' '}
                        <span className="font-mono" style={{ fontFamily: 'monospace' }}>{pdfData.settings.pan}</span>
                      </div>
                    )}
                    {!pdfData.settings.gstin && !pdfData.settings.pan && (
                      <div className="text-slate-400" style={{ color: '#94a3b8' }}>Not registered for GST/Tax ID</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <table className="w-full text-left border-collapse my-8" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '2rem', marginBottom: '2rem' }}>
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider" style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>
                  <th className="py-2.5 w-3/5" style={{ padding: '0.625rem 0', width: '60%' }}>Job Description</th>
                  <th className="py-2.5 px-4 text-right w-1/12" style={{ padding: '0.625rem 1rem', textAlign: 'right', width: '8.33%' }}>Qty</th>
                  <th className="py-2.5 px-4 text-right w-1/6" style={{ padding: '0.625rem 1rem', textAlign: 'right', width: '16.66%' }}>Unit Rate</th>
                  <th className="py-2.5 pl-4 text-right w-1/6" style={{ padding: '0.625rem 0 0.625rem 1rem', textAlign: 'right', width: '16.66%' }}>
                    Amount ({pdfData.invoice.currency})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-750" style={{ fontSize: '0.75rem', color: '#2d3748' }}>
                {pdfData.items.map((item, index) => (
                  <tr key={item.id || index} className="align-middle" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="py-3.5 pr-4 font-medium text-slate-900 whitespace-pre-line leading-relaxed" style={{ padding: '0.875rem 1rem 0.875rem 0', fontWeight: 500, color: '#0f172a', whiteSpace: 'pre-line', lineHeight: 1.625 }}>
                      {item.description}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono" style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono" style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      {item.unit_price.toFixed(2)}
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono font-semibold text-slate-900" style={{ padding: '0.875rem 0 0.875rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                      {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Calculation splits */}
            <div className="flex justify-between items-start gap-8 mt-8 pt-4 border-t border-slate-100" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
              {/* Payment coordinates */}
              <div className="space-y-4 max-w-sm" style={{ maxWidth: '24rem' }}>
                <div>
                  <h3 className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2" style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Remittance Instructions
                  </h3>
                  <div className="space-y-1 text-xs text-slate-600 leading-relaxed" style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.625 }}>
                    {pdfData.settings.bank_name && (
                      <>
                        <div>Bank Name: <span className="font-semibold text-slate-800" style={{ fontWeight: 600, color: '#1e293b' }}>{pdfData.settings.bank_name}</span></div>
                        <div>A/C Holder: <span className="font-semibold text-slate-800" style={{ fontWeight: 600, color: '#1e293b' }}>{pdfData.settings.bank_account_name}</span></div>
                        <div>A/C Number: <span className="font-semibold text-slate-800 font-mono" style={{ fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>{pdfData.settings.bank_account_number}</span></div>
                        <div>IFSC Code: <span className="font-semibold text-slate-800 font-mono" style={{ fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>{pdfData.settings.bank_ifsc}</span></div>
                      </>
                    )}
                    {pdfData.settings.upi_id && (
                      <div className="mt-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded" style={{ marginTop: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '0.25rem' }}>
                        UPI ID: <span className="font-mono font-semibold text-sky-700" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0369a1' }}>{pdfData.settings.upi_id}</span>
                      </div>
                    )}
                    {!pdfData.settings.bank_name && !pdfData.settings.upi_id && (
                      <div className="text-slate-400 text-xs italic" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        No banking details configured in settings profile.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Calculations right alignment */}
              <div className="w-full sm:w-64 space-y-3.5" style={{ width: '16rem' }}>
                <div className="flex justify-between items-center text-xs text-slate-650" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#4b5563' }}>
                  <span>Subtotal:</span>
                  <span className="font-mono" style={{ fontFamily: 'monospace' }}>{pdfData.invoice.subtotal.toFixed(2)}</span>
                </div>
                
                {pdfData.invoice.tax_rate > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-650" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#4b5563' }}>
                    <span>{pdfData.invoice.tax_label || 'GST'} ({pdfData.invoice.tax_rate}%):</span>
                    <span className="font-mono" style={{ fontFamily: 'monospace' }}>+{pdfData.invoice.tax_amount.toFixed(2)}</span>
                  </div>
                )}

                {pdfData.invoice.discount_amount > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-650" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#4b5563' }}>
                    <span>Discount:</span>
                    <span className="font-mono text-emerald-600" style={{ fontFamily: 'monospace', color: '#059669' }}>-{pdfData.invoice.discount_amount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-slate-900" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a' }}>
                  <span className="font-bold" style={{ fontWeight: 700 }}>Total Due:</span>
                  <span className="font-mono font-extrabold text-lg text-slate-950" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.125rem', color: '#020617' }}>
                    {pdfData.invoice.currency} {pdfData.invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {pdfData.invoice.amount_paid > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#059669', backgroundColor: '#ecfdf5', padding: '0.25rem 0.625rem', borderRadius: '0.25rem', border: '1px solid #d1fae5' }}>
                    <span>Amount Paid:</span>
                    <span className="font-mono font-semibold" style={{ fontFamily: 'monospace', fontWeight: 600 }}>-{pdfData.invoice.amount_paid.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Business Terms footnotes */}
            {(pdfData.invoice.notes || pdfData.invoice.terms) && (
              <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-1 gap-6 text-xs text-slate-500 leading-relaxed" style={{ borderTop: '1px solid #f1f5f9', marginTop: '3rem', paddingTop: '2rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.625 }}>
                {pdfData.invoice.terms && (
                  <div>
                    <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-[9px] mb-1" style={{ fontWeight: 600, color: '#334155', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                      Terms & Conditions
                    </h4>
                    <p>{pdfData.invoice.terms}</p>
                  </div>
                )}
                {pdfData.invoice.notes && (
                  <div>
                    <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-[9px] mb-1" style={{ fontWeight: 600, color: '#334155', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                      Additional Notes
                    </h4>
                    <p>{pdfData.invoice.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
