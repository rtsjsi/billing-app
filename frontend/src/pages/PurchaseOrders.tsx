import React, { useState, useEffect, useMemo } from 'react';
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
import SortableTh, { SortDir, nextSortState } from '../components/SortableTh';
import { api, PurchaseOrder, PurchaseOrderItem } from '../lib/api';
import { formatCurrency, formatDate, getPOOutstanding, getFYDateRange } from '../lib/utils';
import { useFilters } from '../lib/FilterContext';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';
import Spinner from '../components/Spinner';
import POAmounts from '../components/POAmounts';

export default function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const initialClientId = searchParams.get('client_id');

  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const { selectedFY, setSelectedFY, selectedClient, availableYears, clients } = useFilters();
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  const [filterClientId, setFilterClientId] = useState(initialClientId || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [deletePOId, setDeletePOId] = useState<number | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [formClientId, setFormClientId] = useState('');
  const [formPoNumber, setFormPoNumber] = useState('');
  const [formPoDate, setFormPoDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formStatus, setFormStatus] = useState<'open' | 'closed' | 'cancelled'>('open');
  const [formItems, setFormItems] = useState<PurchaseOrderItem[]>([]);

  const [formSubmitting, setFormSubmitting] = useState(false);

  const blankItem = (): PurchaseOrderItem => ({
    description: '',
    quantity: 1,
    unit_price: 0,
    amount: 0,
    sort_order: 0,
    work_confirmed: false,
  });

  const normalizeItems = (items: PurchaseOrderItem[]): PurchaseOrderItem[] =>
    items.map((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unit_price = Number(item.unit_price) || 0;
      return {
        description: item.description || '',
        quantity,
        unit_price,
        amount: Number(item.amount) || quantity * unit_price,
        sort_order: item.sort_order ?? index,
        work_confirmed: Boolean(Number(item.work_confirmed ?? 0)),
      };
    });

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

  const sortedPOs = useMemo(() => {
    const list = [...pos];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const cmp = (left: string | number | null | undefined, right: string | number | null | undefined) => {
        if (left == null && right == null) return 0;
        if (left == null) return -1;
        if (right == null) return 1;
        if (typeof left === 'number' && typeof right === 'number') return left - right;
        return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
      };

      switch (sortKey) {
        case 'po_number':
          return cmp(a.po_number, b.po_number) * dir;
        case 'client_name':
          return cmp(a.client_name, b.client_name) * dir;
        case 'po_date':
          return cmp(a.po_date, b.po_date) * dir;
        case 'amount':
          return cmp(a.amount ?? 0, b.amount ?? 0) * dir;
        case 'status':
          return cmp(a.status, b.status) * dir;
        case 'created_at':
        default:
          return cmp(a.created_at, b.created_at) * dir;
      }
    });
    return list;
  }, [pos, sortKey, sortDir]);

  const handleSort = (column: string) => {
    const next = nextSortState(sortKey, sortDir, column);
    setSortKey(next.key);
    setSortDir(next.dir);
  };

  // Lock body scroll while the edit/create modal is open
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const openCreateModal = () => {
    setEditingPO(null);
    setFormClientId(clients[0]?.id.toString() || '');
    setFormPoNumber('');
    setFormPoDate(new Date().toISOString().split('T')[0]); // today
    setFormDescription('');
    setFormAmount('');
    setFormCurrency('INR');
    setFormStatus('open');
    setFormItems([blankItem()]);
    setModalLoading(false);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = async (po: PurchaseOrder) => {
    // Snapshot fields up front in case the list re-renders while loading
    const poId = po.id;
    setEditingPO(po);
    setFormClientId(String(po.client_id));
    setFormPoNumber(po.po_number);
    setFormPoDate(po.po_date || '');
    setFormDescription(po.description || '');
    setFormCurrency(po.currency || 'INR');
    setFormStatus(po.status);
    setFormItems([]);
    setModalLoading(true);
    setError('');
    setModalOpen(true);
    setActiveDropdownId(null);

    try {
      const details = await api.pos.get(poId);
      const items = details.items ?? [];
      if (items.length > 0) {
        setFormItems(normalizeItems(items));
      } else {
        // Legacy POs without line items — seed one row from header amount
        setFormItems([
          {
            description: po.description || po.po_number || 'Purchase Order',
            quantity: 1,
            unit_price: Number(po.amount) || 0,
            amount: Number(po.amount) || 0,
            sort_order: 0,
            work_confirmed: true,
          },
        ]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load Purchase Order details.');
      setFormItems([blankItem()]);
    } finally {
      setModalLoading(false);
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
      po_number: formPoNumber.trim(),
      po_date: formPoDate || null,
      description: formDescription || null,
      amount: formItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
      currency: formCurrency,
      status: formStatus,
      attachment_key: null,
      notes: null,
      items: formItems.map((item, index) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        amount: Number(item.amount) || 0,
        sort_order: index,
        work_confirmed: Boolean(item.work_confirmed),
      })),
    };

    try {
      if (editingPO) {
        await api.pos.update(editingPO.id, payload);
        toast.success('Purchase Order updated');
      } else {
        await api.pos.create(payload as any);
        toast.success('Purchase Order created');
      }
      setModalOpen(false);
      setModalLoading(false);
      fetchPOs();
    } catch (err: any) {
      setError(err.message || 'Failed to save Purchase Order.');
      toast.error(err.message || 'Failed to save Purchase Order.');
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
      toast.success('Purchase Order deleted');
      fetchPOs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete Purchase Order.');
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

      <div className="app-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Financial Year</label>
          <select
            className="form-input text-sm py-2 min-h-0"
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
          >
            <option value="">All Years</option>
            {availableYears.map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
        </div>
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
          <div className="flex gap-2">
            <select className="form-input text-sm py-2 min-h-0" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {(filterStatus || filterClientId || selectedFY) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('');
                  setFilterClientId('');
                  setSelectedFY('');
                }}
                className="shrink-0 px-2 text-xs text-red-600 hover:text-red-700 font-semibold"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="app-card overflow-visible">
        {loading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto" />
          </div>
        ) : sortedPOs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No Purchase Orders found. Click "New PO" to record one!
          </div>
        ) : (
          <div className="min-h-[200px]">
            <table className="responsive-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <SortableTh label="PO Number" column="po_number" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortableTh label="Client" column="client_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortableTh label="PO Date" column="po_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortableTh label="Amounts" column="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortableTh label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="center" />
                  <th className="px-6 py-3.5 text-right text-xs text-slate-400 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {sortedPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors align-top">
                    <td data-label="PO Number" className="px-6 py-3.5">
                      <div className="font-mono font-semibold text-slate-800 whitespace-nowrap">{po.po_number}</div>
                      {po.description ? (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-2 max-w-xs">{po.description}</div>
                      ) : null}
                    </td>
                    <td data-label="Client" className="px-6 py-3.5 text-slate-800 font-medium">{po.client_name}</td>
                    <td data-label="PO Date" className="px-6 py-3.5 text-slate-400 whitespace-nowrap">{formatDate(po.po_date)}</td>
                    <td data-label="Amounts" className="px-6 py-3.5">
                      <div className="flex justify-end">
                        <POAmounts
                          amount={po.amount}
                          confirmedAmount={po.confirmed_amount}
                          invoicedAmount={po.invoiced_amount}
                          currency={po.currency}
                        />
                      </div>
                    </td>
                    <td data-label="Status" className="px-6 py-3.5 text-center">
                      <span className={`badge badge-${po.status}`}>
                        {po.status}
                      </span>
                    </td>
                    <td data-label="Actions" className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[210] flex items-start md:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[96vh] my-2 md:my-0 flex flex-col form-dense">
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 shrink-0">
              <h2 className="font-display font-semibold text-base text-slate-900">
                {editingPO ? 'Edit Purchase Order' : 'Record Purchase Order'}
              </h2>
              <button 
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModalLoading(false);
                }} 
                className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {error && (
                  <div className="p-2.5 bg-red-100 border border-red-500/20 text-red-600 rounded-lg text-xs flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-4">
                    <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Client *</label>
                    <select
                      required
                      className="w-full form-input"
                      value={formClientId}
                      onChange={(e) => setFormClientId(e.target.value)}
                    >
                      <option value="" disabled>Select client...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-3">
                    <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">PO Number *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. PO-2026-0492"
                      className="w-full form-input font-mono"
                      value={formPoNumber}
                      onChange={(e) => setFormPoNumber(e.target.value)}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">PO Date</label>
                    <input 
                      type="date"
                      className="w-full form-input"
                      value={formPoDate}
                      onChange={(e) => setFormPoDate(e.target.value)}
                    />
                  </div>

                  <div className="lg:col-span-1">
                    <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Currency</label>
                    <select 
                      className="w-full form-input"
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>

                  {editingPO ? (
                    <div className="lg:col-span-2">
                      <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status</label>
                      <select
                        className="w-full form-input"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  ) : (
                    <div className="lg:col-span-2 hidden lg:block" />
                  )}

                  <div className="sm:col-span-2 lg:col-span-12">
                    <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Description</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Q2 Software Development Services contract"
                      className="w-full form-input"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Line Items *</h3>
                    <button
                      type="button"
                      disabled={modalLoading}
                      onClick={() => setFormItems([...formItems, { ...blankItem(), sort_order: formItems.length }])}
                      className="text-xs flex items-center space-x-1 text-blue-600 hover:text-blue-500 transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {modalLoading ? (
                    <div className="py-6 flex justify-center">
                      <Spinner label="Loading items..." />
                    </div>
                  ) : (
                  <div className="space-y-1.5">
                    <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7rem_7.5rem_2rem] gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Description</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Price</span>
                      <span className="text-right">Amount</span>
                      <span className="text-center">Confirmed</span>
                      <span />
                    </div>
                    {formItems.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7rem_7.5rem_2rem] gap-2 items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Description"
                          className="w-full form-input"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...formItems];
                            newItems[index] = { ...newItems[index], description: e.target.value };
                            setFormItems(newItems);
                          }}
                        />
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          placeholder="Qty"
                          className="w-full form-input text-right"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formItems];
                            const quantity = parseFloat(e.target.value) || 0;
                            const unit_price = newItems[index].unit_price;
                            newItems[index] = {
                              ...newItems[index],
                              quantity,
                              amount: quantity * unit_price,
                            };
                            setFormItems(newItems);
                          }}
                        />
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          className="w-full form-input text-right"
                          value={item.unit_price}
                          onChange={(e) => {
                            const newItems = [...formItems];
                            const unit_price = parseFloat(e.target.value) || 0;
                            const quantity = newItems[index].quantity;
                            newItems[index] = {
                              ...newItems[index],
                              unit_price,
                              amount: quantity * unit_price,
                            };
                            setFormItems(newItems);
                          }}
                        />
                        <div className="form-input bg-white text-slate-500 flex items-center justify-end tabular-nums">
                          {formatCurrency(item.amount, formCurrency)}
                        </div>
                        <label className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            checked={Boolean(item.work_confirmed)}
                            onChange={(e) => {
                              const newItems = [...formItems];
                              newItems[index] = { ...newItems[index], work_confirmed: e.target.checked };
                              setFormItems(newItems);
                            }}
                          />
                          <span className="sm:hidden">Work confirmed</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = formItems.filter((_, i) => i !== index);
                            setFormItems(newItems);
                          }}
                          className="justify-self-center p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {formItems.length === 0 && (
                      <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
                        No line items added. At least one item is required.
                      </div>
                    )}
                  </div>
                  )}
                  
                  <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 mt-3 pt-3 border-t border-slate-200 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-2">Total</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrency(formItems.reduce((sum, item) => sum + item.amount, 0), formCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-500 uppercase tracking-wider font-semibold mr-2">Confirmed</span>
                      <span className="font-mono font-semibold text-emerald-600">
                        {formatCurrency(
                          formItems
                            .filter((item) => item.work_confirmed)
                            .reduce((sum, item) => sum + item.amount, 0),
                          formCurrency
                        )}
                      </span>
                    </div>
                    {editingPO && (
                      <div>
                        <span className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold mr-2">Outstanding</span>
                        <span className="font-mono font-semibold text-amber-600">
                          {formatCurrency(
                            getPOOutstanding(
                              formItems
                                .filter((item) => item.work_confirmed)
                                .reduce((sum, item) => sum + item.amount, 0),
                              editingPO.invoiced_amount
                            ),
                            formCurrency
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setModalLoading(false);
                  }}
                  className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || modalLoading}
                  className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg text-sm font-semibold text-white shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-colors"
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
