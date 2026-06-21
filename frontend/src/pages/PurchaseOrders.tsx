import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Calendar,
  DollarSign,
  Paperclip,
  ArrowUpRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { api, PurchaseOrder, Client } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

export default function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const initialClientId = searchParams.get('client_id');

  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filterClientId, setFilterClientId] = useState(initialClientId || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [formClientId, setFormClientId] = useState('');
  const [formPoNumber, setFormPoNumber] = useState('');
  const [formPoDate, setFormPoDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formStatus, setFormStatus] = useState<'open' | 'partially_invoiced' | 'fulfilled' | 'cancelled'>('open');
  const [formAttachmentKey, setFormAttachmentKey] = useState<string | null>(null);
  const [formAttachmentName, setFormAttachmentName] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchPOs = async () => {
    try {
      const cId = filterClientId ? parseInt(filterClientId, 10) : undefined;
      const res = await api.pos.list(cId, filterStatus || undefined);
      setPOs(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Purchase Orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      // List active clients for dropdown pickers
      const res = await api.clients.list('', false);
      setClients(res);
    } catch (err) {
      console.error('Failed to load clients list', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchPOs();
  }, [filterClientId, filterStatus]);

  const openCreateModal = () => {
    setEditingPO(null);
    setFormClientId(clients[0]?.id.toString() || '');
    setFormPoNumber('');
    setFormPoDate(new Date().toISOString().split('T')[0]); // today
    setFormDescription('');
    setFormAmount('');
    setFormCurrency('INR');
    setFormStatus('open');
    setFormAttachmentKey(null);
    setFormAttachmentName(null);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormClientId(po.client_id.toString());
    setFormPoNumber(po.po_number);
    setFormPoDate(po.po_date || '');
    setFormDescription(po.description || '');
    setFormAmount(po.amount ? po.amount.toString() : '');
    setFormCurrency(po.currency);
    setFormStatus(po.status);
    setFormAttachmentKey(po.attachment_key);
    // Extract filename from attachment key if it is present
    setFormAttachmentName(po.attachment_key ? po.attachment_key.split('/').pop() || 'Attachment' : null);
    setError('');
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingFile(true);
    setError('');

    try {
      const res = await api.pos.uploadAttachment(file);
      setFormAttachmentKey(res.key);
      setFormAttachmentName(file.name);
    } catch (err: any) {
      setError(err.message || 'Attachment upload failed.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formClientId) {
      setError('Please select a client.');
      return;
    }
    if (!formPoNumber.trim()) {
      setError('PO number is required.');
      return;
    }

    setFormSubmitting(true);
    setError('');

    const payload = {
      client_id: parseInt(formClientId, 10),
      po_number: formPoNumber,
      po_date: formPoDate || null,
      description: formDescription || null,
      amount: formAmount ? parseFloat(formAmount) : null,
      currency: formCurrency,
      status: formStatus,
      attachment_key: formAttachmentKey || null,
      notes: '' // Placeholder or not needed
    };

    try {
      if (editingPO) {
        await api.pos.update(editingPO.id, payload);
      } else {
        await api.pos.create(payload as any);
      }
      setModalOpen(false);
      fetchPOs();
    } catch (err: any) {
      setError(err.message || 'Failed to save Purchase Order.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePO = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this Purchase Order? Any links to existing invoices will remain but the PO reference itself will be destroyed.')) return;

    try {
      await api.pos.delete(id);
      fetchPOs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete Purchase Order.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Purchase Orders</h1>
          <p className="text-slate-400 text-sm mt-1">Record client PO contracts and map them to invoice line items</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg shadow-sky-500/10 cursor-pointer transition-all duration-200"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New PO</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center gap-4 border-slate-800/80">
        {/* Client filter */}
        <div className="flex-1">
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Filter by Client</label>
          <select
            className="w-full form-input py-1.5 text-xs"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="w-full md:w-48">
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Filter by Status</label>
          <select
            className="w-full form-input py-1.5 text-xs"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="partially_invoiced">Partially Invoiced</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* PO Listing Table */}
      <div className="glass-card rounded-2xl border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          </div>
        ) : pos.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No Purchase Orders found. Click "New PO" to record one!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/20">
                  <th className="px-6 py-3.5">PO details</th>
                  <th className="px-6 py-3.5">Client</th>
                  <th className="px-6 py-3.5">PO Date</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-center">File</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-sm">
                {pos.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-semibold text-slate-200">{po.po_number}</div>
                      {po.description && (
                        <div className="text-slate-500 text-xs mt-0.5 truncate max-w-xs">{po.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">{po.client_name}</td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(po.po_date)}</td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {po.amount ? formatCurrency(po.amount, po.currency) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {po.attachment_key ? (
                        <a 
                          href={api.pos.getAttachmentUrl(po.attachment_key)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/5 px-2 py-1 rounded border border-sky-500/10"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>View</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`badge badge-${po.status}`}>
                        {po.status === 'partially_invoiced' ? 'Part. Invoiced' : po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => openEditModal(po)}
                        className="inline-flex p-1.5 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-colors cursor-pointer"
                        title="Edit PO"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePO(po.id)}
                        className="inline-flex p-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-500/70 hover:text-red-400 rounded border border-red-500/10 transition-colors cursor-pointer"
                        title="Delete PO"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h2 className="font-display font-semibold text-lg text-white">
                {editingPO ? 'Edit Purchase Order' : 'Record Purchase Order'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Client *</label>
                  <select
                    required
                    className="w-full form-input text-sm"
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                  >
                    <option value="" disabled>Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">PO Number / Code *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. PO-2026-0492"
                    className="w-full form-input text-sm font-mono"
                    value={formPoNumber}
                    onChange={(e) => setFormPoNumber(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">PO Date (Optional)</label>
                    <input 
                      type="date"
                      className="w-full form-input text-sm"
                      value={formPoDate}
                      onChange={(e) => setFormPoDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">PO Total Amount (Optional)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        className="w-full form-input text-sm pl-12"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                      />
                      <select 
                        className="absolute left-1 top-1.5 bottom-1.5 bg-transparent border-0 text-slate-400 text-xs focus:ring-0 focus:outline-none cursor-pointer"
                        value={formCurrency}
                        onChange={(e) => setFormCurrency(e.target.value)}
                      >
                        <option value="INR">₹</option>
                        <option value="USD">$</option>
                        <option value="EUR">€</option>
                        <option value="GBP">£</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Q2 Software Development Services contract"
                    className="w-full form-input text-sm"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                {editingPO && (
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">PO Status</label>
                    <select
                      className="w-full form-input text-sm"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                    >
                      <option value="open">Open / Active</option>
                      <option value="partially_invoiced">Partially Invoiced</option>
                      <option value="fulfilled">Fulfilled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {/* Cloudflare R2 Upload Widget */}
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">PO File Attachment (PDF/Image) *</label>
                  <div className="mt-1 flex items-center justify-between p-3.5 bg-slate-950/30 rounded-lg border border-slate-800">
                    <div className="flex items-center space-x-2 shrink-0">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      <span className="text-xs text-slate-300 truncate max-w-[200px]">
                        {formAttachmentName ? formAttachmentName : 'No file selected (Optional)'}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        className="hidden" 
                        id="po-file-file" 
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                      <label 
                        htmlFor="po-file-file"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded cursor-pointer border border-slate-700 inline-block disabled:opacity-50"
                      >
                        {uploadingFile ? 'Uploading...' : 'Choose File'}
                      </label>
                    </div>
                  </div>
                  {formAttachmentKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormAttachmentKey(null);
                        setFormAttachmentName(null);
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-semibold mt-1 flex items-center space-x-1"
                    >
                      <X className="h-3 w-3" />
                      <span>Remove Attachment</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/20 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/50 rounded-lg text-sm font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || uploadingFile}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg text-sm font-semibold text-white shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {formSubmitting ? 'Saving...' : 'Save PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
