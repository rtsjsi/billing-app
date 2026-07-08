import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  FileText, 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { api, Client, Invoice, PurchaseOrder } from '../lib/api';
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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = id ? parseInt(id, 10) : NaN;

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNaN(clientId)) {
      setError('Invalid Client ID');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await api.clients.get(clientId);
        setClient(res.client);
        setInvoices(res.invoices);
        setPOs(res.pos);
      } catch (err: any) {
        setError(err.message || 'Failed to load client details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => navigate('/clients')}
          className="flex items-center space-x-1.5 text-sm text-slate-400 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Clients</span>
        </button>
        <div className="p-6 bg-red-100 border border-red-500/20 rounded-xl text-red-600 text-sm">
          {error || 'Client profile not found.'}
        </div>
      </div>
    );
  }

  // Calculate client specific aggregates (ignore cancelled invoices)
  const { selectedFY } = useFilters();
  const fyRange = getFYDateRange(selectedFY);

  const filteredInvoices = selectedFY && fyRange.start && fyRange.end
    ? invoices.filter(inv => inv.issue_date >= fyRange.start! && inv.issue_date <= fyRange.end!)
    : invoices;

  const filteredPOs = selectedFY && fyRange.start && fyRange.end
    ? pos.filter(po => po.po_date && po.po_date >= fyRange.start! && po.po_date <= fyRange.end!)
    : pos;

  const activeInvoices = filteredInvoices.filter(inv => inv.status !== 'cancelled');
  const totalBilled = activeInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = activeInvoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const totalOutstanding = activeInvoices.reduce((sum, inv) => {
    // outstanding is (total - amount_paid) for non-drafts
    if (inv.status === 'draft') return sum;
    return sum + (inv.total - inv.amount_paid);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link 
            to="/clients"
            className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Clients</span>
          </Link>
          <h1 className="page-title">{client.name}</h1>
          {client.company_name && (
            <p className="text-slate-600 text-sm flex items-center font-medium">
              <Building className="h-4 w-4 mr-1.5 text-slate-400" />
              <span>{client.company_name}</span>
            </p>
          )}
        </div>
        
        {/* Quick action shortcuts */}
        <div className="flex items-center space-x-3">
          <Link
            to={`/purchase-orders?client_id=${client.id}`}
            className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-white rounded-lg text-sm font-medium text-slate-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add PO</span>
          </Link>
          <Link
            to={`/invoices/new?client_id=${client.id}`}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg text-sm font-medium text-white shadow-lg shadow-sky-500/10 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Bill Client</span>
          </Link>
        </div>
      </div>

      {/* Grid: Details Card & Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border-slate-200 space-y-6">
          <h2 className="text-sm font-semibold text-blue-600 border-b border-slate-200 pb-2 uppercase tracking-wider">
            Contact & billing profile
          </h2>

          <div className="space-y-4 text-sm">
            {client.email && (
              <div className="flex items-center space-x-3 text-slate-700">
                <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                <a href={`mailto:${client.email}`} className="hover:text-blue-600 transition-colors truncate">
                  {client.email}
                </a>
              </div>
            )}
            
            {client.phone && (
              <div className="flex items-center space-x-3 text-slate-700">
                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}

            {client.billing_address && (
              <div className="flex items-start space-x-3 text-slate-700">
                <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                <span className="whitespace-pre-line leading-relaxed">{client.billing_address}</span>
              </div>
            )}

            {client.gstin && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Tax Registration (GSTIN)</p>
                <p className="font-mono text-sm text-slate-800 mt-0.5">{client.gstin}</p>
              </div>
            )}

            {client.notes && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Private Notes</p>
                <p className="text-slate-400 text-xs mt-1 bg-slate-50 p-2.5 rounded border border-slate-850">{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Aggregate stats cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          {/* Total Billed */}
          <div className="glass-card p-5 rounded-2xl flex items-center space-x-4 border-slate-200">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Invoiced</p>
              <h3 className="font-display font-bold text-xl text-slate-900 mt-1">
                {formatCurrency(totalBilled)}
              </h3>
            </div>
          </div>

          {/* Total Paid */}
          <div className="glass-card p-5 rounded-2xl flex items-center space-x-4 border-slate-200">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Collected</p>
              <h3 className="font-display font-bold text-xl text-slate-900 mt-1">
                {formatCurrency(totalPaid)}
              </h3>
            </div>
          </div>

          {/* Outstanding */}
          <div className="glass-card p-5 rounded-2xl flex items-center space-x-4 border-slate-200">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Outstanding Balance</p>
              <h3 className="font-display font-bold text-xl text-slate-900 mt-1">
                {formatCurrency(totalOutstanding)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Invoices & Purchase Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invoices List */}
        <div className="glass-card rounded-2xl border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-white/10">
            <h2 className="font-display font-bold text-base text-slate-900 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Invoice Ledger ({filteredInvoices.length})</span>
            </h2>
          </div>
          <div>
            {filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No invoices issued for this client.
              </div>
            ) : (
              <table className="responsive-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="px-6 py-3">Number</th>
                    <th className="px-6 py-3">Issue Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredInvoices.map((inv) => (
                    <tr 
                      key={inv.id}
                      onClick={() => navigate(`/invoices/preview/${inv.id}`)}
                      className="hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <td data-label="Number" className="px-6 py-4 font-mono font-medium text-blue-600">{inv.invoice_number}</td>
                      <td data-label="Issue Date" className="px-6 py-4 text-slate-700">{formatDate(inv.issue_date)}</td>
                      <td data-label="Amount" className="px-6 py-4 text-right font-medium text-slate-900">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td data-label="Status" className="px-6 py-4 text-center">
                        <span className={`badge badge-${inv.status}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PO List */}
        <div className="glass-card rounded-2xl border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-white/10">
            <h2 className="font-display font-bold text-base text-slate-900 flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              <span>Purchase Orders ({filteredPOs.length})</span>
            </h2>
          </div>
          <div>
            {filteredPOs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No Purchase Orders recorded for this client.
              </div>
            ) : (
              <table className="responsive-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="px-6 py-3">PO Number</th>
                    <th className="px-6 py-3">PO Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/10 transition-all">
                      <td data-label="PO Number" className="px-6 py-4 font-mono font-medium text-slate-700">{po.po_number}</td>
                      <td data-label="PO Date" className="px-6 py-4 text-slate-400">{formatDate(po.po_date)}</td>
                      <td data-label="Amount" className="px-6 py-4 text-right font-medium text-slate-900">
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
