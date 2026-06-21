import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Save, 
  CheckCircle,
  Building,
  UserPlus,
  X
} from 'lucide-react';
import { api, Client, PurchaseOrder, BusinessSettings, InvoiceItem } from '../lib/api';

interface LineItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export default function InvoiceEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialClientId = searchParams.get('client_id');
  const navigate = useNavigate();
  const invoiceId = id ? parseInt(id, 10) : NaN;
  const isEdit = !isNaN(invoiceId);

  // Lists
  const [clients, setClients] = useState<Client[]>([]);
  const [clientPOs, setClientPOs] = useState<PurchaseOrder[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Form Fields
  const [clientId, setClientId] = useState(initialClientId || '');
  const [poId, setPoId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [taxLabel, setTaxLabel] = useState('GST');
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, amount: 0 }
  ]);

  // Inline Client Creation Drawer/Popup
  const [inlineClientOpen, setInlineClientOpen] = useState(false);
  const [inlineName, setInlineName] = useState('');
  const [inlineCompany, setInlineCompany] = useState('');
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');
  const [inlineAddress, setInlineAddress] = useState('');
  const [inlineGstin, setInlineGstin] = useState('');
  const [inlineError, setInlineError] = useState('');

  // Page states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch initial dropdown data & profile settings
  useEffect(() => {
    const initializePage = async () => {
      try {
        const settingsRes = await api.settings.get();
        setSettings(settingsRes);
        setTaxLabel(settingsRes.tax_label);
        setTaxRate(settingsRes.default_tax_rate);
        setCurrency(settingsRes.currency);
        setNotes(settingsRes.default_notes || '');
        setTerms(settingsRes.default_terms || '');
        
        // Compute default dates (issue date = today)
        const todayStr = new Date().toISOString().split('T')[0];
        setIssueDate(todayStr);
        computeDueDate(todayStr, settingsRes.default_payment_terms_days);

        const clientsRes = await api.clients.list('', false);
        setClients(clientsRes);

        // If editing an existing invoice, fetch details
        if (isEdit) {
          const invRes = await api.invoices.get(invoiceId);
          const { invoice, items: invItems } = invRes;
          
          setClientId(invoice.client_id.toString());
          setPoId(invoice.po_id ? invoice.po_id.toString() : '');
          setIssueDate(invoice.issue_date);
          setDueDate(invoice.due_date || '');
          setCurrency(invoice.currency);
          setTaxLabel(invoice.tax_label || 'GST');
          setTaxRate(invoice.tax_rate);
          setDiscountAmount(invoice.discount_amount);
          setNotes(invoice.notes || '');
          setTerms(invoice.terms || '');
          setItems(invItems.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount
          })));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize editor.');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [isEdit, invoiceId]);

  // 2. Fetch linked client POs when client changes
  useEffect(() => {
    if (!clientId) {
      setClientPOs([]);
      setPoId('');
      return;
    }

    const fetchPOs = async () => {
      try {
        const cId = parseInt(clientId, 10);
        // Only load 'open' or 'partially_invoiced' POs for linking
        const posRes = await api.pos.list(cId);
        const activePOs = posRes.filter(po => po.status === 'open' || po.status === 'partially_invoiced' || po.id.toString() === poId);
        setClientPOs(activePOs);
      } catch (err) {
        console.error('Failed to load client Purchase Orders', err);
      }
    };

    fetchPOs();
  }, [clientId, poId]);

  // Date handlers
  const handleIssueDateChange = (val: string) => {
    setIssueDate(val);
    if (settings) {
      computeDueDate(val, settings.default_payment_terms_days);
    }
  };

  const computeDueDate = (issueDateStr: string, termsDays: number) => {
    if (!issueDateStr) return;
    const date = new Date(issueDateStr);
    date.setDate(date.getDate() + termsDays);
    setDueDate(date.toISOString().split('T')[0]);
  };

  // Line item handlers
  const handleItemFieldChange = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...items];
    const item = updated[index];
    
    if (field === 'description') {
      item.description = val;
    } else {
      const numVal = parseFloat(val) || 0;
      (item as any)[field] = numVal;
      
      // Calculate row amount
      item.amount = item.quantity * item.unit_price;
    }
    
    setItems(updated);
  };

  const addLineItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate Aggregates
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discountAmount;

  // Submit invoice
  const handleSubmit = async (saveStatus: 'draft' | 'sent') => {
    if (!clientId) {
      setError('Please select a client.');
      return;
    }

    const hasEmptyItem = items.some(item => !item.description.trim() || item.quantity <= 0);
    if (hasEmptyItem) {
      setError('Please fill in description and positive quantity for all items.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      client_id: parseInt(clientId, 10),
      po_id: poId ? parseInt(poId, 10) : null,
      issue_date: issueDate,
      due_date: dueDate || null,
      status: saveStatus as any,
      currency,
      subtotal,
      tax_label: taxLabel || null,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total,
      notes: notes || null,
      terms: terms || null,
      items: items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        sort_order: index
      }))
    };

    try {
      if (isEdit) {
        // If invoice is already paid/partially paid, retain status
        if (saveStatus === 'sent') {
          // check if we already have payments and need to retain paid status
          const checkRes = await api.invoices.get(invoiceId);
          if (checkRes.invoice.amount_paid >= total) {
            payload.status = 'paid';
          } else if (checkRes.invoice.amount_paid > 0) {
            payload.status = 'partially_paid';
          }
        }
        await api.invoices.update(invoiceId, payload);
        navigate(`/invoices/preview/${invoiceId}`);
      } else {
        const res = await api.invoices.create(payload);
        navigate(`/invoices/preview/${res.invoice.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  // Inline client creation handler
  const handleCreateInlineClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineName.trim()) {
      setInlineError('Client name is required.');
      return;
    }

    setInlineError('');
    const payload = {
      name: inlineName,
      company_name: inlineCompany || null,
      email: inlineEmail || null,
      phone: inlinePhone || null,
      billing_address: inlineAddress || null,
      gstin: inlineGstin || null,
      notes: null
    };

    try {
      const res = await api.clients.create(payload);
      // Add client to active array and select it
      const updatedClients = await api.clients.list('', false);
      setClients(updatedClients);
      setClientId(res.client.id.toString());
      setInlineClientOpen(false);
      
      // Clear forms
      setInlineName('');
      setInlineCompany('');
      setInlineEmail('');
      setInlinePhone('');
      setInlineAddress('');
      setInlineGstin('');
    } catch (err: any) {
      setInlineError(err.message || 'Failed to create client.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Back Navigation */}
      <div className="space-y-1.5">
        <Link 
          to="/invoices"
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Invoices Ledger</span>
        </Link>
        <h1 className="font-display font-bold text-3xl text-white">
          {isEdit ? 'Edit Invoice' : 'Create Invoice'}
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {isEdit ? 'Modify details of existing billing invoice' : 'Fill details below to generate a new billing invoice'}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="glass-card rounded-2xl border-slate-800/80 p-6 md:p-8 space-y-8">
        
        {/* Core fields (Client, PO, dates) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Client picker & Shortcut */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider">Client *</label>
              <button
                type="button"
                onClick={() => setInlineClientOpen(true)}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1 cursor-pointer"
              >
                <UserPlus className="h-3 w-3" />
                <span>+ New Client</span>
              </button>
            </div>
            <select
              required
              className="w-full form-input text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="" disabled>Select billing client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
              ))}
            </select>
          </div>

          {/* PO Picker */}
          <div>
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Link PO (Optional)</label>
            <select
              className="w-full form-input text-sm"
              value={poId}
              onChange={(e) => setPoId(e.target.value)}
              disabled={!clientId}
            >
              <option value="">No PO Linked</option>
              {clientPOs.map(po => (
                <option key={po.id} value={po.id}>{po.po_number} ({po.status})</option>
              ))}
            </select>
            {!clientId && (
              <span className="text-[10px] text-slate-500 mt-1 block">Pick client first to load POs</span>
            )}
          </div>

          {/* Currency selection */}
          <div>
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Currency</label>
            <select
              className="w-full form-input text-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Issue Date *</label>
            <input 
              type="date"
              required
              className="w-full form-input text-sm"
              value={issueDate}
              onChange={(e) => handleIssueDateChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Due Date *</label>
            <input 
              type="date"
              required
              className="w-full form-input text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-lg text-white border-b border-slate-800/80 pb-2">
            Line Items
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800/60 pb-2">
                  <th className="py-2 pr-4 w-3/5">Item Description *</th>
                  <th className="py-2 px-4 w-1/12 text-right">Quantity</th>
                  <th className="py-2 px-4 w-1/6 text-right">Unit Price</th>
                  <th className="py-2 pl-4 w-1/6 text-right">Amount</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {items.map((item, index) => (
                  <tr key={index} className="align-top py-2">
                    <td className="py-3 pr-4">
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Consulting Services - Q2 Milestones"
                        className="w-full form-input text-sm"
                        value={item.description}
                        onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input 
                        type="number" 
                        required
                        step="any"
                        placeholder="1"
                        className="w-full form-input text-sm text-right"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        placeholder="0.00"
                        className="w-full form-input text-sm text-right font-mono"
                        value={item.unit_price === 0 ? '' : item.unit_price}
                        onChange={(e) => handleItemFieldChange(index, 'unit_price', e.target.value)}
                      />
                    </td>
                    <td className="py-3 pl-4 text-right align-middle font-mono font-medium text-white text-sm">
                      {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right align-middle">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={items.length <= 1}
                        className="text-slate-500 hover:text-red-400 p-1 rounded disabled:opacity-30 disabled:hover:text-slate-500 cursor-pointer"
                        title="Remove Line Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/60 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Row</span>
          </button>
        </div>

        {/* Aggregates Calculations & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-800/80">
          {/* Notes / Terms */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Payment Terms</label>
              <textarea
                placeholder="Details of payment terms..."
                rows={2}
                className="w-full form-input text-xs resize-none"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Notes to Client</label>
              <textarea
                placeholder="Bank coordinates or UPI details..."
                rows={3}
                className="w-full form-input text-xs resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Live Totals summary */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4 max-w-md ml-auto w-full">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Subtotal:</span>
              <span className="font-mono text-slate-200">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Tax Settings */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  className="form-input py-0.5 px-1.5 text-[10px] w-12 font-semibold uppercase tracking-wider text-center"
                  value={taxLabel}
                  onChange={(e) => setTaxLabel(e.target.value)}
                  placeholder="Tax"
                />
                <input 
                  type="number" 
                  className="form-input py-0.5 px-1.5 text-[10px] w-12 text-right font-mono"
                  value={taxRate === 0 ? '' : taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="%"
                />
                <span className="text-slate-400 text-xs">%</span>
              </div>
              <span className="font-mono text-slate-200">+{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Discount Amount:</span>
              <div className="flex items-center space-x-2">
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="form-input py-0.5 px-2 text-xs w-24 text-right font-mono"
                  value={discountAmount === 0 ? '' : discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Grand Total */}
            <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center">
              <span className="font-display font-semibold text-white">Grand Total:</span>
              <span className="font-display font-extrabold text-2xl text-sky-400 bg-sky-500/5 border border-sky-500/10 px-3 py-1 rounded">
                {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Form Action Controls */}
        <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
          <Link
            to="/invoices"
            className="px-5 py-2.5 border border-slate-800 hover:border-slate-700 bg-slate-900/50 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Discard
          </Link>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('draft')}
              className="px-5 py-2.5 border border-slate-800 hover:border-slate-750 bg-slate-850 hover:bg-slate-800 rounded-lg text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('sent')}
              className="bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-semibold py-2.5 px-5 rounded-lg flex items-center space-x-2 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-all text-sm duration-200"
            >
              <Save className="h-4.5 w-4.5" />
              <span>{isEdit ? 'Update & Finalize' : 'Create & Mark Sent'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Inline Client Creator Panel */}
      {inlineClientOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h2 className="font-display font-semibold text-white flex items-center space-x-1.5">
                <UserPlus className="h-5 w-5 text-sky-400" />
                <span>Quick Client Creation</span>
              </h2>
              <button onClick={() => setInlineClientOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateInlineClient}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {inlineError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs">
                    {inlineError}
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Client Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Tesla India"
                    className="w-full form-input text-sm" 
                    value={inlineName}
                    onChange={(e) => setInlineName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tesla Motors Ltd"
                    className="w-full form-input text-sm" 
                    value={inlineCompany}
                    onChange={(e) => setInlineCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    placeholder="finance@tesla.com"
                    className="w-full form-input text-sm" 
                    value={inlineEmail}
                    onChange={(e) => setInlineEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Phone</label>
                  <input 
                    type="text" 
                    placeholder="+91 99999 88888"
                    className="w-full form-input text-sm" 
                    value={inlinePhone}
                    onChange={(e) => setInlinePhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Billing Address</label>
                  <textarea 
                    placeholder="Client's invoice address..." 
                    rows={2}
                    className="w-full form-input text-xs resize-none" 
                    value={inlineAddress}
                    onChange={(e) => setInlineAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">India GSTIN / Tax ID</label>
                  <input 
                    type="text" 
                    placeholder="27AAAAA1111A1Z1"
                    className="w-full form-input text-sm font-mono uppercase" 
                    value={inlineGstin}
                    onChange={(e) => setInlineGstin(e.target.value)}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/20 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setInlineClientOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/50 rounded-lg text-sm font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg text-sm font-semibold text-white cursor-pointer shadow-lg shadow-sky-500/10"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
