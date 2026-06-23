import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Mail, 
  DollarSign, 
  Copy, 
  FileEdit, 
  X,
  CreditCard,
  Building,
  Check,
  AlertCircle,
  Calendar,
  Sparkles,
  Trash2
} from 'lucide-react';
import { api, Invoice, InvoiceItem, Payment, BusinessSettings } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

export default function InvoicePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceId = id ? parseInt(id, 10) : NaN;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other'>('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const settingsRes = await api.settings.get();
      setSettings(settingsRes);

      const invRes = await api.invoices.get(invoiceId);
      setInvoice(invRes.invoice);
      setItems(invRes.items);
      setPayments(invRes.payments);
      
      // Pre-fill payment modal amount with remaining outstanding balance
      const remaining = invRes.invoice.total - invRes.invoice.amount_paid;
      setPayAmount(remaining > 0 ? remaining.toFixed(2) : '0.00');
      setPayDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isNaN(invoiceId)) {
      setError('Invalid Invoice ID');
      setLoading(false);
      return;
    }
    fetchData();
  }, [invoiceId]);

  const handleDownloadPDF = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    try {
      // Dynamic import to prevent bundler errors and type conflicts
      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      const opt = {
        margin:       12,
        filename:     `invoice_${invoice?.invoice_number}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          windowWidth: 800,
          onclone: (doc: any) => {
            const el = doc.getElementById('invoice-preview-container');
            if (el) {
              el.style.width = '800px';
              el.style.maxWidth = '800px';
              el.style.overflow = 'visible';
            }
          }
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Could not download PDF.');
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await api.invoices.updateStatus(invoiceId, status);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(payAmount) || 0;
    if (parsedAmount <= 0) {
      alert('Please enter a positive payment amount.');
      return;
    }

    setPaySubmitting(true);
    try {
      await api.payments.record({
        invoice_id: invoiceId,
        amount: parsedAmount,
        payment_date: payDate,
        method: payMethod,
        reference: payRef || null,
        notes: payNotes || null
      });
      setPaymentModalOpen(false);
      setPayRef('');
      setPayNotes('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to remove this payment entry?')) return;
    try {
      await api.payments.delete(paymentId);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !invoice || !settings) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/invoices')} className="flex items-center space-x-1 text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices Ledger</span>
        </button>
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200">
          {error || 'Invoice not found.'}
        </div>
      </div>
    );
  }

  const isOutstanding = invoice.status !== 'paid' && invoice.status !== 'cancelled';
  const remainingDue = invoice.total - invoice.amount_paid;

  return (
    <div className="space-y-6">
      {/* Control panel (Hidden on Print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link 
            to="/invoices" 
            className="flex items-center space-x-2 px-4 py-2.5 border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold text-slate-200 transition-colors cursor-pointer shadow-sm shadow-slate-900/20"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices Ledger</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {invoice.status === 'draft' && (
              <button 
                onClick={() => handleUpdateStatus('sent')}
                className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center space-x-1 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Mark Sent</span>
              </button>
            )}
            {isOutstanding && (
              <button 
                onClick={() => setPaymentModalOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center space-x-1 cursor-pointer shadow-md shadow-emerald-500/10"
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Record Payment</span>
              </button>
            )}
            <Link 
              to={`/invoices/edit/${invoice.id}`}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 text-xs font-semibold py-1.5 px-3 rounded flex items-center space-x-1"
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Link>
            {invoice.status !== 'cancelled' && (
              <button 
                onClick={() => handleUpdateStatus('cancelled')}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-550/20 text-red-400 text-xs font-semibold py-1.5 px-3 rounded cursor-pointer"
              >
                <span>Cancel Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Big Action Buttons */}
        <div className="glass-card p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <span className="text-slate-400 text-sm">Status:</span>
            <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>
            {invoice.status === 'partially_paid' && (
              <span className="text-xs text-slate-400">
                Paid: {formatCurrency(invoice.amount_paid, invoice.currency)} / Total: {formatCurrency(invoice.total, invoice.currency)}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center space-x-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-sm font-semibold rounded-lg text-white cursor-pointer transition-colors shadow-lg shadow-sky-500/20"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER INVOICE (This block is styled clean white during prints) */}
      <div className="flex justify-center">
        <div 
          ref={invoiceRef}
          id="invoice-preview-container"
          className="print-container bg-white text-slate-900 border border-slate-200 shadow-xl rounded-2xl w-full max-w-[800px] p-8 md:p-12 font-sans overflow-hidden text-sm"
        >
          {/* Header Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-sky-600 fill-sky-600/10 no-print" />
                <h2 className="font-display font-extrabold text-2xl tracking-tight text-slate-950 uppercase">{settings.business_name}</h2>
              </div>
              {settings.owner_name && <p className="text-slate-600 font-medium text-xs">Proprietor: {settings.owner_name}</p>}
              <p className="text-slate-500 text-xs whitespace-pre-line leading-relaxed max-w-sm">{settings.address}</p>
            </div>

            <div className="space-y-1.5 text-right sm:text-right w-full sm:w-auto">
              <h1 className="font-display font-black text-3xl tracking-tight text-slate-900">INVOICE</h1>
              <p className="font-mono text-sm font-bold text-sky-700">{invoice.invoice_number}</p>
              
              <div className="pt-2 text-xs space-y-0.5 text-slate-500">
                <div><span className="font-semibold text-slate-700">Date of Issue:</span> {formatDate(invoice.issue_date)}</div>
                {invoice.due_date && (
                  <div><span className="font-semibold text-slate-700">Payment Due:</span> {formatDate(invoice.due_date)}</div>
                )}
                {invoice.po_number && (
                  <div className="font-mono"><span className="font-semibold text-slate-700">PO Ref:</span> {invoice.po_number}</div>
                )}
              </div>
            </div>
          </div>

          {/* Billing profiles split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-100">
            <div>
              <h3 className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2.5">Invoiced To</h3>
              <p className="font-bold text-slate-900 text-base">{invoice.client_name}</p>
              {invoice.client_company && <p className="text-slate-700 font-medium mt-0.5">{invoice.client_company}</p>}
              
              {/* Fetching details logic or display details */}
              <p className="text-slate-500 text-xs mt-2 whitespace-pre-line leading-relaxed">
                Billing address: {invoice.client_id ? 'Address details loaded in ledger' : '-'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2">Business Tax Registrations</h3>
                <div className="space-y-1 text-xs text-slate-600">
                  {settings.gstin && (
                    <div><span className="font-semibold text-slate-700">GSTIN:</span> <span className="font-mono">{settings.gstin}</span></div>
                  )}
                  {settings.pan && (
                    <div><span className="font-semibold text-slate-700">PAN:</span> <span className="font-mono">{settings.pan}</span></div>
                  )}
                  {!settings.gstin && !settings.pan && <div className="text-slate-400">Not registered for GST/Tax ID</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <table className="w-full text-left border-collapse my-8">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 w-3/5">Job Description</th>
                <th className="py-2.5 px-4 text-right w-1/12">Qty</th>
                <th className="py-2.5 px-4 text-right w-1/6">Unit Rate</th>
                <th className="py-2.5 pl-4 text-right w-1/6">Amount ({invoice.currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-750">
              {items.map((item) => (
                <tr key={item.id} className="align-middle">
                  <td className="py-3.5 pr-4 font-medium text-slate-900 whitespace-pre-line leading-relaxed">{item.description}</td>
                  <td className="py-3.5 px-4 text-right font-mono">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right font-mono">{item.unit_price.toFixed(2)}</td>
                  <td className="py-3.5 pl-4 text-right font-mono font-semibold text-slate-900">{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Calculation splits */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mt-8 pt-4 border-t border-slate-100 print-page-break">
            {/* Payment coordinates */}
            <div className="space-y-4 max-w-sm">
              <div>
                <h3 className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2">Remittance Instructions</h3>
                <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
                  {settings.bank_name && (
                    <>
                      <div>Bank Name: <span className="font-semibold text-slate-800">{settings.bank_name}</span></div>
                      <div>A/C Holder: <span className="font-semibold text-slate-800">{settings.bank_account_name}</span></div>
                      <div>A/C Number: <span className="font-semibold text-slate-800 font-mono">{settings.bank_account_number}</span></div>
                      <div>IFSC Code: <span className="font-semibold text-slate-800 font-mono">{settings.bank_ifsc}</span></div>
                    </>
                  )}
                  {settings.upi_id && (
                    <div className="mt-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded">
                      UPI ID: <span className="font-mono font-semibold text-sky-700">{settings.upi_id}</span>
                    </div>
                  )}
                  {!settings.bank_name && !settings.upi_id && (
                    <div className="text-slate-400 text-xs italic">No banking details configured in settings profile.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Calculations right alignment */}
            <div className="w-full sm:w-64 space-y-3.5">
              <div className="flex justify-between items-center text-xs text-slate-650">
                <span>Subtotal:</span>
                <span className="font-mono">{invoice.subtotal.toFixed(2)}</span>
              </div>
              
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span>{invoice.tax_label || 'GST'} ({invoice.tax_rate}%):</span>
                  <span className="font-mono">+{invoice.tax_amount.toFixed(2)}</span>
                </div>
              )}

              {invoice.discount_amount > 0 && (
                <div className="flex justify-between items-center text-xs text-slate-650">
                  <span>Discount:</span>
                  <span className="font-mono text-emerald-600">-{invoice.discount_amount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-slate-900">
                <span className="font-bold">Total Due:</span>
                <span className="font-mono font-extrabold text-lg text-slate-950">
                  {invoice.currency} {invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              {invoice.amount_paid > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-semibold">-{invoice.amount_paid.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Business Terms footnotes */}
          {(invoice.notes || invoice.terms) && (
            <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-1 gap-6 text-xs text-slate-500 leading-relaxed print-page-break">
              {invoice.terms && (
                <div>
                  <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-[9px] mb-1">Terms & Conditions</h4>
                  <p>{invoice.terms}</p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-[9px] mb-1">Additional Notes</h4>
                  <p>{invoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payments History log (Hidden on print) */}
      {payments.length > 0 && (
        <div className="no-print glass-card rounded-2xl border-slate-800/80 p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg text-white flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-sky-400" />
            <span>Payments History Log ({payments.length})</span>
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/20">
                  <th className="px-6 py-2.5">Date</th>
                  <th className="px-6 py-2.5">Method</th>
                  <th className="px-6 py-2.5">Reference ID</th>
                  <th className="px-6 py-2.5">Notes</th>
                  <th className="px-6 py-2.5 text-right">Amount</th>
                  <th className="px-6 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-xs">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/10">
                    <td className="px-6 py-3 text-slate-300">{formatDate(p.payment_date)}</td>
                    <td className="px-6 py-3 text-slate-400 font-medium capitalize">{p.method?.replace('_', ' ')}</td>
                    <td className="px-6 py-3 font-mono text-slate-300">{p.reference || '-'}</td>
                    <td className="px-6 py-3 text-slate-400">{p.notes || '-'}</td>
                    <td className="px-6 py-3 text-right font-medium text-emerald-400 font-mono">{formatCurrency(p.amount, invoice.currency)}</td>
                    <td className="px-6 py-3 text-right">
                      <button 
                        onClick={() => handleDeletePayment(p.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded cursor-pointer"
                        title="Delete Payment Entry"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h2 className="font-display font-semibold text-lg text-white flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <span>Record Invoice Payment</span>
              </h2>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="p-6 space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs flex items-center space-x-2">
                  <Check className="h-4 w-4" />
                  <span>Remaining Outstanding Balance: <b>{invoice.currency} {remainingDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Payment Amount ({invoice.currency}) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    className="w-full form-input text-sm font-mono text-emerald-400"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Payment Date *</label>
                  <input 
                    type="date"
                    required
                    className="w-full form-input text-sm"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Payment Method *</label>
                  <select
                    className="w-full form-input text-sm"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI (GPay/PhonePe/Paytm)</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Transaction Reference ID (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. UTR / IMPS / Txn ID"
                    className="w-full form-input text-sm font-mono"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Private Notes (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cleared next day"
                    className="w-full form-input text-sm"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/20 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/50 rounded-lg text-sm font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold text-white cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  {paySubmitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
