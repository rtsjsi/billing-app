import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileCheck, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  AlertCircle,
} from 'lucide-react';
import ActionMenu from '../components/ActionMenu';
import ConfirmModal from '../components/ConfirmModal';
import { api, PurchaseOrder, Client, PurchaseOrderItem } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { useFilters } from '../lib/FilterContext';
import PageHeader from '../components/PageHeader';

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

export default function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialClientId = searchParams.get('client_id');

  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const { selectedFY, selectedClient, clients } = useFilters();
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  const [filterClientId, setFilterClientId] = useState(initialClientId || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [deletePOId, setDeletePOId] = useState<number | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [formClientId, setFormClientId] = useState('');
  const [formPoNumber, setFormPoNumber] = useState('');
  const [formPoDate, setFormPoDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formStatus, setFormStatus] = useState<'open' | 'partially_invoiced' | 'fulfilled' | 'cancelled'>('open');
  const [formItems, setFormItems] = useState<PurchaseOrderItem[]>([]);

  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const cId = selectedClient ? parseInt(selectedClient, 10) : (filterClientId ? parseInt(filterClientId, 10) : undefined);
      const res = await api.pos.list(cId, filterStatus || undefined);
      
      let filtered = res;
      if (selectedFY) {
        const fyRange = getFYDateRange(selectedFY);
        if (fyRange.start && fyRange.end) {
          filtered = res.filter(po => {
            if (!po.po_date) return false;
            return po.po_date >= fyRange.start! && po.po_date <= fyRange.end!;
          });
        }
      }
      setPOs(filtered);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Purchase Orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, [selectedClient, selectedFY, filterStatus, filterClientId]);

  const openCreateModal = () => {
    setEditingPO(null);
    setFormClientId(clients[0]?.id.toString() || '');
    setFormPoNumber('');
    setFormPoDate(new Date().toISOString().split('T')[0]); // today
    setFormDescription('');
    setFormAmount('');
    setFormCurrency('INR');
    setFormStatus('open');
    setFormItems([{ description: '', quantity: 1, unit_price: 0, amount: 0, sort_order: 0 }]);

    setError('');
    setModalOpen(true);
  };

  const openEditModal = async (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormClientId(po.client_id.toString());
    setFormPoNumber(po.po_number);
    setFormPoDate(po.po_date || '');
    setFormDescription(po.description || '');
    setFormCurrency(po.currency);
    setFormStatus(po.status);
    setFormItems([{ description: 'Loading...', quantity: 1, unit_price: 0, amount: 0, sort_order: 0 }]);

    setError('');
    setModalOpen(true);

    try {
      const details = await api.pos.get(po.id);
      if (details.items && details.items.length > 0) {
        setFormItems(details.items);
      } else {
        setFormItems([{ description: '', quantity: 1, unit_price: 0, amount: 0, sort_order: 0 }]);
      }
    } catch (err) {
      console.error(err);
      setFormItems([{ description: '', quantity: 1, unit_price: 0, amount: 0, sort_order: 0 }]);
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
    if (formItems.length === 0) {
      setError('At least one line item is required.');
      return;
    }

    setFormSubmitting(true);
    setError('');

    const payload = {
      client_id: parseInt(formClientId, 10),
      po_number: formPoNumber,
      po_date: formPoDate || null,
      description: formDescription || null,
      amount: formItems.reduce((sum, item) => sum + item.amount, 0),
      currency: formCurrency,
      status: formStatus,
      attachment_key: null,
      notes: '', // Placeholder or not needed
      items: formItems.map((item, index) => ({ ...item, sort_order: index }))
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

  const handleDeletePO = (id: number) => {
    setDeletePOId(id);
  };

  const performDelete = async () => {
    if (!deletePOId) return;
    try {
      await api.pos.delete(deletePOId);
      setDeletePOId(null);
      fetchPOs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete Purchase Order.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="hidden md:block">
        <PageHeader
          title="Purchase Orders"
          subtitle="Record client PO contracts and map them to invoices"
          actions={
            <button onClick={openCreateModal} className="btn-primary">
              <Plus className="h-4 w-4" />
              New PO
            </button>
          }
        />
      </div>

      <button onClick={openCreateModal} className="md:hidden btn-primary w-full">
        <Plus className="h-4 w-4" />
        New PO
      </button>

      <div className="app-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client</label>
          <select className="form-input text-sm py-2 min-h-0" value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
          <select className="form-input text-sm py-2 min-h-0" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="partially_invoiced">Partially Invoiced</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="app-card overflow-visible md:overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto" />
          </div>
        ) : pos.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No Purchase Orders found. Click "New PO" to record one!
          </div>
        ) : (
          <div className="min-h-[200px]">
            <table className="responsive-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3.5">PO details</th>
                  <th className="px-6 py-3.5">Client</th>
                  <th className="px-6 py-3.5">PO Date</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>

                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {pos.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td data-label="PO Details" className="px-6 py-4">
                      <div className="font-mono font-semibold text-slate-800">{po.po_number}</div>
                      {po.description && (
                        <div className="text-slate-400 text-xs mt-0.5 truncate max-w-xs">{po.description}</div>
                      )}
                    </td>
                    <td data-label="Client" className="px-6 py-4 text-slate-800 font-medium">{po.client_name}</td>
                    <td data-label="PO Date" className="px-6 py-4 text-slate-400">{formatDate(po.po_date)}</td>
                    <td data-label="Amount" className="px-6 py-4 text-right font-medium text-slate-800">
                      {po.amount ? formatCurrency(po.amount, po.currency) : '-'}
                    </td>

                    <td data-label="Status" className="px-6 py-4 text-center">
                      <span className={`badge badge-${po.status}`}>
                        {po.status === 'partially_invoiced' ? 'Part. Invoiced' : po.status}
                      </span>
                    </td>
                    <td data-label="Actions" className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        isOpen={activeDropdownId === po.id}
                        onToggle={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === po.id ? null : po.id);
                        }}
                        onClose={() => setActiveDropdownId(null)}
                        title={po.po_number}
                        items={[
                          {
                            label: 'Edit PO',
                            icon: <Edit2 className="h-4 w-4" />,
                            onClick: () => openEditModal(po),
                          },
                          {
                            label: 'Related Invoices',
                            icon: <FileCheck className="h-4 w-4" />,
                            onClick: () => navigate(`/invoices?po_id=${po.id}`),
                          },
                          {
                            label: 'Delete PO',
                            icon: <Trash2 className="h-4 w-4" />,
                            variant: 'danger',
                            onClick: () => handleDeletePO(po.id),
                          },
                        ]}
                      />
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h2 className="font-display font-semibold text-lg text-slate-900">
                {editingPO ? 'Edit Purchase Order' : 'Record Purchase Order'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="p-3 bg-red-100 border border-red-500/20 text-red-600 rounded-lg text-xs flex items-start space-x-2">
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
                    <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Currency</label>
                    <select 
                      className="w-full form-input text-sm"
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
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

                <div className="mt-6 border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700">Line Items *</h3>
                    <button
                      type="button"
                      onClick={() => setFormItems([...formItems, { description: '', quantity: 1, unit_price: 0, amount: 0, sort_order: formItems.length }])}
                      className="text-xs flex items-center space-x-1 text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formItems.map((item, index) => (
                      <div key={index} className="flex flex-wrap sm:flex-nowrap items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="w-full sm:flex-1">
                          <input
                            type="text"
                            required
                            placeholder="Description"
                            className="w-full form-input text-xs"
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...formItems];
                              newItems[index].description = e.target.value;
                              setFormItems(newItems);
                            }}
                          />
                        </div>
                        <div className="w-24 shrink-0">
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            placeholder="Qty"
                            className="w-full form-input text-xs"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => {
                              const newItems = [...formItems];
                              newItems[index].quantity = parseFloat(e.target.value) || 0;
                              newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
                              setFormItems(newItems);
                            }}
                          />
                        </div>
                        <div className="w-32 shrink-0">
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            placeholder="Price"
                            className="w-full form-input text-xs"
                            value={item.unit_price === 0 ? '' : item.unit_price}
                            onChange={(e) => {
                              const newItems = [...formItems];
                              newItems[index].unit_price = parseFloat(e.target.value) || 0;
                              newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
                              setFormItems(newItems);
                            }}
                          />
                        </div>
                        <div className="w-32 shrink-0">
                          <div className="w-full form-input text-xs bg-white text-slate-400 flex items-center">
                            {formatCurrency(item.amount, formCurrency)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = formItems.filter((_, i) => i !== index);
                            setFormItems(newItems);
                          }}
                          className="shrink-0 p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors mt-0.5 sm:mt-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {formItems.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
                        No line items added. At least one item is required.
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">Total Amount</div>
                      <div className="text-xl font-mono font-semibold text-slate-900">
                        {formatCurrency(formItems.reduce((sum, item) => sum + item.amount, 0), formCurrency)}
                      </div>
                    </div>
                  </div>
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


              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg text-sm font-semibold text-white shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {formSubmitting ? 'Saving...' : 'Save PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deletePOId !== null}
        title="Delete Purchase Order"
        message="Are you sure you want to permanently delete this Purchase Order? Any links to existing invoices will remain but the PO reference itself will be destroyed."
        confirmText="Delete"
        onConfirm={performDelete}
        onCancel={() => setDeletePOId(null)}
      />
    </div>
  );
}
