import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  AlertCircle,
  Save,
  UserPlus,
  X
} from 'lucide-react';
import { api, Client, PurchaseOrder, BusinessSettings } from '../lib/api';

interface LineItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export type InvoiceEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingInvoiceId?: number | null;
  initialClientId?: string | null;
  onSaved?: () => void;
};

export default function InvoiceEditorModal({
  isOpen,
  onClose,
  editingInvoiceId,
  initialClientId,
  onSaved
}: InvoiceEditorModalProps) {
  const navigate = useNavigate();
  const isEdit = Boolean(editingInvoiceId);

  // Lists
  const [clients, setClients] = useState<Client[]>([]);
  const [clientPOs, setClientPOs] = useState<PurchaseOrder[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Form fields
  const [clientId, setClientId] = useState('');
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

  // Inline client creation
  const [inlineClientOpen, setInlineClientOpen] = useState(false);
  const [inlineName, setInlineName] = useState('');
  const [inlineCompany, setInlineCompany] = useState('');
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');
  const [inlineAddress, setInlineAddress] = useState('');
  const [inlineGstin, setInlineGstin] = useState('');
  const [inlineTdsPercent, setInlineTdsPercent] = useState('0');
  const [inlineError, setInlineError] = useState('');

  // Modal states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const computeDueDate = (issueDateStr: string, termsDays: number): string => {
    if (!issueDateStr) return '';
    const date = new Date(issueDateStr);
    date.setDate(date.getDate() + termsDays);
    return date.toISOString().split('T')[0];
  };

  // Initialize / reset form when modal opens or editingInvoiceId changes
  useEffect(() => {
    if (!isOpen) return;

    const initializeModal = async () => {
      setLoading(true);
      setError('');
      setInlineClientOpen(false);

      try {
        const [settingsRes, clientsRes] = await Promise.all([
          api.settings.get(),
          api.clients.list('', false)
        ]);
        setSettings(settingsRes);
        setClients(clientsRes);

        if (editingInvoiceId) {
          // Edit mode: load existing invoice
          const invRes = await api.invoices.get(editingInvoiceId);
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
        } else {
          // Create mode: reset to defaults
          const todayStr = new Date().toISOString().split('T')[0];
          setClientId(initialClientId || '');
          setPoId('');
          setIssueDate(todayStr);
          setDueDate(computeDueDate(todayStr, settingsRes.default_payment_terms_days));
          setCurrency(settingsRes.currency);
          setTaxLabel(settingsRes.tax_label);
          setTaxRate(settingsRes.default_tax_rate);
          setDiscountAmount(0);
          setNotes(settingsRes.default_notes || '');
          setTerms(settingsRes.default_terms || '');
          setItems([{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize editor.');
      } finally {
        setLoading(false);
      }
    };

    initializeModal();
  }, [isOpen, editingInvoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch linked client POs when client changes
  useEffect(() => {
    if (!clientId) {
      setClientPOs([]);
      setPoId('');
      return;
    }

    const fetchPOs = async () => {
      try {
        const posRes = await api.pos.list(parseInt(clientId, 10));
        const activePOs = posRes.filter(po => po.status === 'open' || po.id.toString() === poId);
        setClientPOs(activePOs);
      } catch (err) {
        console.error('Failed to load client Purchase Orders', err);
      }
    };

    fetchPOs();
  }, [clientId, poId]);

  const handlePoChange = async (selectedPoId: string) => {
    setPoId(selectedPoId);
    if (!selectedPoId) return;

    if (!isEdit) {
      try {
        const fullPo = await api.pos.get(parseInt(selectedPoId, 10));
        if (fullPo.items && fullPo.items.length > 0) {
          const confirmedItems = fullPo.items.filter((item) => Boolean(Number(item.work_confirmed)));
          if (confirmedItems.length > 0) {
            setItems(confirmedItems.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              amount: item.amount
            })));
          } else {
            setItems([{
              description: fullPo.description || `Invoice against ${fullPo.po_number}`,
              quantity: 1,
              unit_price: 0,
              amount: 0
            }]);
          }
        } else {
          const po = clientPOs.find(p => p.id.toString() === selectedPoId);
          if (po) {
            const base = po.confirmed_amount ?? po.amount;
            const remaining = base ? Math.max(0, base - (po.invoiced_amount || 0)) : 0;
            setItems([{
              description: po.description || `Invoice against ${po.po_number}`,
              quantity: 1,
              unit_price: remaining,
              amount: remaining
            }]);
          }
        }
      } catch (err) {
        console.error('Failed to load PO details', err);
      }
    }
  };

  const handleIssueDateChange = (val: string) => {
    setIssueDate(val);
    if (settings) {
      setDueDate(computeDueDate(val, settings.default_payment_terms_days));
    }
  };

  const handleItemFieldChange = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...items];
    const item = updated[index];

    if (field === 'description') {
      item.description = val;
    } else {
      const numVal = parseFloat(val) || 0;
      (item as any)[field] = numVal;
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

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discountAmount;

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
      if (isEdit && editingInvoiceId) {
        if (saveStatus === 'sent') {
          const checkRes = await api.invoices.get(editingInvoiceId);
          if (checkRes.invoice.amount_paid >= total) {
            payload.status = 'paid';
          } else if (checkRes.invoice.amount_paid > 0) {
            payload.status = 'partially_paid';
          }
        }
        await api.invoices.update(editingInvoiceId, payload);
        onSaved?.();
        onClose();
        navigate(`/invoices/preview/${editingInvoiceId}`);
      } else {
        const res = await api.invoices.create(payload);
        onSaved?.();
        onClose();
        navigate(`/invoices/preview/${res.invoice.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInlineClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineName.trim()) {
      setInlineError('Client name is required.');
      return;
    }

    setInlineError('');
    const tds = parseFloat(inlineTdsPercent);
    if (Number.isNaN(tds) || tds < 0 || tds > 100) {
      setInlineError('TDS % must be between 0 and 100.');
      return;
    }

    const payload = {
      name: inlineName,
      company_name: inlineCompany || null,
      email: inlineEmail || null,
      phone: inlinePhone || null,
      billing_address: inlineAddress || null,
      gstin: inlineGstin || null,
      notes: null,
      tds_percent: tds,
    };

    try {
      const res = await api.clients.create(payload);
      const updatedClients = await api.clients.list('', false);
      setClients(updatedClients);
      setClientId(res.client.id.toString());
      setInlineClientOpen(false);

      setInlineName('');
      setInlineCompany('');
      setInlineEmail('');
      setInlinePhone('');
      setInlineAddress('');
      setInlineGstin('');
      setInlineTdsPercent('0');
    } catch (err: any) {
      setInlineError(err.message || 'Failed to create client.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[210] flex items-start md:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[96vh] my-2 md:my-0 flex flex-col form-dense">

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="font-display font-semibold text-base text-slate-900">
              {isEdit ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? 'Modify billing details' : 'Fill in details to generate a new invoice'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-[40vh]">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {error && (
                <div className="p-2.5 bg-red-100 border border-red-500/20 text-red-600 rounded-lg text-xs flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Client *</label>
                    <button
                      type="button"
                      onClick={() => setInlineClientOpen(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-500 font-medium flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      New
                    </button>
                  </div>
                  <select
                    required
                    className="w-full form-input"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="" disabled>Select billing client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Link PO</label>
                  <select
                    className="w-full form-input"
                    value={poId}
                    onChange={(e) => handlePoChange(e.target.value)}
                    disabled={!clientId}
                  >
                    <option value="">No PO Linked</option>
                    {clientPOs.map(po => (
                      <option key={po.id} value={po.id}>{po.po_number}{po.description ? ` - ${po.description}` : ''} ({po.status})</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Currency</label>
                  <select
                    className="w-full form-input"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Issue Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full form-input"
                    value={issueDate}
                    onChange={(e) => handleIssueDateChange(e.target.value)}
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Due Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Line Items *</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs flex items-center space-x-1 text-blue-600 hover:text-blue-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7rem_2rem] gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Amount</span>
                    <span />
                  </div>
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7rem_2rem] gap-2 items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Description"
                        className="w-full form-input"
                        value={item.description}
                        onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                      />
                      <input
                        type="number"
                        required
                        step="any"
                        placeholder="Qty"
                        className="w-full form-input text-right"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                      />
                      <input
                        type="number"
                        required
                        step="0.01"
                        placeholder="Price"
                        className="w-full form-input text-right font-mono"
                        value={item.unit_price === 0 ? '' : item.unit_price}
                        onChange={(e) => handleItemFieldChange(index, 'unit_price', e.target.value)}
                      />
                      <div className="form-input bg-white text-slate-500 flex items-center justify-end tabular-nums">
                        {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={items.length <= 1}
                        className="justify-self-center p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Payment Terms</label>
                    <textarea
                      placeholder="Details of payment terms..."
                      rows={2}
                      className="w-full form-input text-xs resize-none"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Notes to Client</label>
                    <textarea
                      placeholder="Bank coordinates or UPI details..."
                      rows={2}
                      className="w-full form-input text-xs resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-w-md ml-auto w-full">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="font-mono text-slate-800">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
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
                    <span className="font-mono text-slate-800">+{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Discount</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="form-input py-0.5 px-2 text-xs w-24 text-right font-mono"
                      value={discountAmount === 0 ? '' : discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Grand Total</span>
                    <span className="font-mono font-semibold text-brand-600">
                      {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700 text-center"
          >
            Discard
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={submitting || loading}
              onClick={() => handleSubmit('draft')}
              className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              disabled={submitting || loading}
              onClick={() => handleSubmit('sent')}
              className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg text-sm font-semibold text-white shadow-lg shadow-sky-500/10 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span>{isEdit ? 'Update & Finalize' : 'Create & Mark Sent'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Client Creator — raised above outer modal */}
      {inlineClientOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[220] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h2 className="font-display font-semibold text-slate-900 flex items-center space-x-1.5">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <span>Quick Client Creation</span>
              </h2>
              <button onClick={() => setInlineClientOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInlineClient}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {inlineError && (
                  <div className="p-3 bg-red-100 border border-red-500/20 text-red-600 rounded-lg text-xs">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">TDS %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="e.g. 10"
                      className="w-full form-input text-sm font-mono"
                      value={inlineTdsPercent}
                      onChange={(e) => setInlineTdsPercent(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setInlineClientOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
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
