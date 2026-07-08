import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Archive, 
  Trash2, 
  X,
  Mail,
  Phone,
  Building,
  Eye,
  ArchiveRestore,
} from 'lucide-react';
import ActionMenu from '../components/ActionMenu';
import { api, Client } from '../lib/api';
import { useFilters } from '../lib/FilterContext';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const { selectedClient } = useFilters();
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConflict, setDeleteConflict] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  const displayedClients = selectedClient
    ? clients.filter(c => c.id === parseInt(selectedClient, 10))
    : clients;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await api.clients.list(search, includeArchived);
      setClients(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, includeArchived]);

  const openCreateModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormGstin('');
    setFormNotes('');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormCompany(client.company_name || '');
    setFormEmail(client.email || '');
    setFormPhone(client.phone || '');
    setFormAddress(client.billing_address || '');
    setFormGstin(client.gstin || '');
    setFormNotes(client.notes || '');
    setError('');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError('Client name is required.');
      return;
    }

    setFormSubmitting(true);
    setError('');
    
    const payload = {
      name: formName,
      company_name: formCompany || null,
      email: formEmail || null,
      phone: formPhone || null,
      billing_address: formAddress || null,
      gstin: formGstin || null,
      notes: formNotes || null
    };

    try {
      if (editingClient) {
        await api.clients.update(editingClient.id, payload);
      } else {
        await api.clients.create(payload);
      }
      setModalOpen(false);
      fetchClients();
    } catch (err: any) {
      setError(err.message || 'Failed to save client.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchiveToggle = async (client: Client) => {
    try {
      if (client.is_archived === 0) {
        await api.clients.archive(client.id);
      } else {
        await api.clients.unarchive(client.id);
      }
      fetchClients();
    } catch (err: any) {
      alert(err.message || 'Failed to update client status');
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this client?')) return;
    
    setDeleteConflict(null);
    try {
      await api.clients.delete(id);
      fetchClients();
    } catch (err: any) {
      if (err.message.includes('Cannot delete client')) {
        setDeleteConflict(err.message);
      } else {
        alert(err.message || 'Failed to delete client');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage your customer profiles and billing directory</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer shadow-lg shadow-sky-500/10 transition-all duration-200"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New Client</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by client or company name..."
            className="w-full form-input pl-10 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 select-none">
          <input 
            type="checkbox"
            id="archived"
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          <label htmlFor="archived" className="text-sm text-slate-300 font-medium cursor-pointer">
            Include archived clients
          </label>
        </div>
      </div>

      {/* Delete Conflict Toast */}
      {deleteConflict && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start justify-between text-red-200 text-sm">
          <span>{deleteConflict}</span>
          <button onClick={() => setDeleteConflict(null)} className="text-red-400 hover:text-red-300 ml-4 font-bold">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table Listing */}
      <div className="glass-card rounded-2xl overflow-visible md:overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          </div>
        ) : displayedClients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No clients found. Click "New Client" to create one.
          </div>
        ) : (
          <div className="min-h-[220px]">
            <table className="responsive-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3.5">Client Details</th>
                  <th className="px-6 py-3.5">Contact info</th>
                  <th className="px-6 py-3.5">Tax Details</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {displayedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td data-label="Client Details" className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{client.name}</div>
                      {client.company_name && (
                        <div className="text-slate-500 text-xs flex items-center mt-1">
                          <Building className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          <span>{client.company_name}</span>
                        </div>
                      )}
                    </td>
                    <td data-label="Contact Info" className="px-6 py-4 space-y-1">
                      {client.email && (
                        <div className="text-slate-600 text-xs flex items-center">
                          <Mail className="h-3.5 w-3.5 mr-1.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={client.email}>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="text-slate-600 text-xs flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-1.5 text-slate-400 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </td>
                    <td data-label="Tax Details" className="px-6 py-4">
                      {client.gstin ? (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">
                          GSTIN: {client.gstin}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td data-label="Status" className="px-6 py-4">
                      {client.is_archived === 1 ? (
                        <span className="badge badge-draft">Archived</span>
                      ) : (
                        <span className="badge badge-paid">Active</span>
                      )}
                    </td>
                    <td data-label="Actions" className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        isOpen={activeDropdownId === client.id}
                        onToggle={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === client.id ? null : client.id);
                        }}
                        onClose={() => setActiveDropdownId(null)}
                        title={client.name}
                        items={[
                          {
                            label: 'View History',
                            icon: <Eye className="h-4 w-4" />,
                            onClick: () => navigate(`/clients/${client.id}`),
                          },
                          {
                            label: 'Edit Profile',
                            icon: <Edit2 className="h-4 w-4" />,
                            onClick: () => openEditModal(client),
                          },
                          {
                            label: client.is_archived === 1 ? 'Restore Client' : 'Archive Client',
                            icon: client.is_archived === 1
                              ? <ArchiveRestore className="h-4 w-4" />
                              : <Archive className="h-4 w-4" />,
                            onClick: () => handleArchiveToggle(client),
                          },
                          {
                            label: 'Delete Client',
                            icon: <Trash2 className="h-4 w-4" />,
                            variant: 'danger',
                            onClick: () => handleDeleteClient(client.id),
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h2 className="font-display font-semibold text-lg text-white">
                {editingClient ? 'Edit Client Profile' : 'Create New Client'}
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
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Client Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Acme Corp Inc"
                    className="w-full form-input text-sm"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Company Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Consulting Services"
                    className="w-full form-input text-sm"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Email (Optional)</label>
                    <input 
                      type="email" 
                      placeholder="client@acme.com"
                      className="w-full form-input text-sm"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Phone (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="+91 98765 43210"
                      className="w-full form-input text-sm"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Billing Address (Optional)</label>
                  <textarea 
                    placeholder="Physical address for invoice rendering..."
                    rows={3}
                    className="w-full form-input text-sm resize-none"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">India GSTIN / Tax ID (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    className="w-full form-input text-sm font-mono uppercase"
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Private Notes (Optional)</label>
                  <textarea 
                    placeholder="Hidden notes for internal reference..."
                    rows={2}
                    className="w-full form-input text-sm resize-none"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
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
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg text-sm font-semibold text-white shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {formSubmitting ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
