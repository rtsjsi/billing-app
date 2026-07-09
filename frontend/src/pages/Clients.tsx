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
import ConfirmModal from '../components/ConfirmModal';
import { api, Client } from '../lib/api';
import { useFilters } from '../lib/FilterContext';
import PageHeader from '../components/PageHeader';
import MobileModal from '../components/MobileModal';

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
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
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

  const handleDeleteClient = (id: number) => {
    setDeleteClientId(id);
  };

  const performDelete = async () => {
    if (!deleteClientId) return;
    setDeleteConflict(null);
    try {
      await api.clients.delete(deleteClientId);
      setDeleteClientId(null);
      fetchClients();
    } catch (err: any) {
      if (err.message.includes('Cannot delete client')) {
        setDeleteConflict(err.message);
      } else {
        alert(err.message || 'Failed to delete client');
      }
      setDeleteClientId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="hidden md:block">
        <PageHeader
          title="Clients"
          subtitle="Manage your customer profiles and billing directory"
          actions={
            <button onClick={openCreateModal} className="btn-primary">
              <Plus className="h-4 w-4" />
              New Client
            </button>
          }
        />
      </div>

      <button onClick={openCreateModal} className="md:hidden btn-primary w-full">
        <Plus className="h-4 w-4" />
        New Client
      </button>

      <div className="app-card p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          <span className="text-sm text-slate-600">Include archived</span>
        </label>
      </div>

      {/* Delete Conflict Toast */}
      {deleteConflict && (
        <div className="p-4 bg-red-100 border border-red-500/20 rounded-xl flex items-start justify-between text-red-600 text-sm">
          <span>{deleteConflict}</span>
          <button onClick={() => setDeleteConflict(null)} className="text-red-600 hover:text-red-600 ml-4 font-bold">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="app-card overflow-visible md:overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto" />
          </div>
        ) : displayedClients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No clients found. Click "New Client" to create one.
          </div>
        ) : (
          <div className="min-h-[220px]">
            <table className="responsive-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3.5">Client Details</th>
                  <th className="px-6 py-3.5">Contact info</th>
                  <th className="px-6 py-3.5">Tax Details</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {displayedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td data-label="Client Details" className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{client.name}</div>
                      {client.company_name && (
                        <div className="text-slate-400 text-xs flex items-center mt-1">
                          <Building className="h-3.5 w-3.5 mr-1 text-slate-500" />
                          <span>{client.company_name}</span>
                        </div>
                      )}
                    </td>
                    <td data-label="Contact Info" className="px-6 py-4 space-y-1">
                      {client.email && (
                        <div className="text-slate-400 text-xs flex items-center">
                          <Mail className="h-3.5 w-3.5 mr-1.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[200px]" title={client.email}>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="text-slate-400 text-xs flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-1.5 text-slate-500 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </td>
                    <td data-label="Tax Details" className="px-6 py-4">
                      {client.gstin ? (
                        <span className="font-mono text-xs bg-slate-50 px-2 py-1 rounded text-slate-700 border border-slate-300">
                          GSTIN: {client.gstin}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
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

      <MobileModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClient ? 'Edit Client' : 'New Client'}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              form="client-form"
              disabled={formSubmitting}
              className="btn-primary"
            >
              {formSubmitting ? 'Saving...' : 'Save Client'}
            </button>
          </>
        }
      >
        <form id="client-form" onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client Name *</label>
            <input type="text" required placeholder="e.g. Acme Corp" className="form-input text-sm" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Company Name</label>
            <input type="text" placeholder="Optional" className="form-input text-sm" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
              <input type="email" placeholder="client@acme.com" className="form-input text-sm" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone</label>
              <input type="text" placeholder="+91 98765 43210" className="form-input text-sm" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Billing Address</label>
            <textarea placeholder="Physical address..." rows={3} className="form-input text-sm resize-none" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">GSTIN / Tax ID</label>
            <input type="text" placeholder="27AAAAA1111A1Z1" className="form-input text-sm font-mono uppercase" value={formGstin} onChange={(e) => setFormGstin(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Private Notes</label>
            <textarea placeholder="Internal notes..." rows={2} className="form-input text-sm resize-none" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
          </div>
        </form>
      </MobileModal>

      <ConfirmModal
        isOpen={deleteClientId !== null}
        title="Delete Client"
        message="Are you sure you want to permanently delete this client?"
        confirmText="Delete"
        onConfirm={performDelete}
        onCancel={() => setDeleteClientId(null)}
      />
    </div>
  );
}
