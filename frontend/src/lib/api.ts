// Typed Fetch Wrapper for Invoicing & PO API

// ----------------------------------------------------
// Type definitions matching backend DB schema
// ----------------------------------------------------

export interface Client {
  id: number;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  gstin: string | null;
  notes: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: number;
  client_id: number;
  client_name?: string;
  po_number: string;
  po_date: string | null;
  description: string | null;
  amount: number | null;
  currency: string;
  status: 'open' | 'partially_invoiced' | 'fulfilled' | 'cancelled';
  attachment_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name?: string;
  client_company?: string;
  po_id: number | null;
  po_number?: string;
  issue_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  subtotal: number;
  tax_label: string | null;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  payment_date: string;
  method: 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other' | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface BusinessSettings {
  id: number;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  upi_id: string | null;
  currency: string;
  tax_label: string;
  default_tax_rate: number;
  invoice_prefix: string;
  invoice_next_number: number;
  invoice_number_reset: 'never' | 'calendar_year' | 'financial_year';
  default_payment_terms_days: number;
  default_notes: string | null;
  default_terms: string | null;
  updated_at: string;
}

export interface DashboardData {
  stats: {
    totalInvoiceAmount: number;
    totalPaidAmount: number;
    totalOutstanding: number;
    overdueCount: number;
  };
  recentInvoices: Invoice[];
  openPOs: PurchaseOrder[];
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ----------------------------------------------------
// Fetch utility helper
// ----------------------------------------------------

const BASE_URL = '';

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  
  // Always send cookies (credentials) for Hono HttpOnly session validation
  options.credentials = 'include';
  
  // Set default header content-type if not already specified (e.g. multipart/form-data)
  if (options.body && !(options.body instanceof FormData)) {
    options.headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
  }

  const response = await fetch(url, options);

  // Auto-handle unauthorized redirects
  if (response.status === 401 && !path.includes('/api/auth/me')) {
    // Session expired or invalid. Let the application routing state handle it, 
    // or reload/redirect to /login
    window.dispatchEvent(new Event('api-unauthorized'));
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as any;
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ----------------------------------------------------
// API Methods
// ----------------------------------------------------

export const api = {
  // Authentication
  auth: {
    checkSetupStatus: () => request<{ needsSetup: boolean }>('/api/auth/setup-status'),
    setup: (data: any) => request('/api/auth/setup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: any) => request<{ username: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    me: () => request<{ authenticated: boolean; username?: string; businessName?: string; currency?: string }>('/api/auth/me')
  },

  // Dashboard
  dashboard: {
    getStats: () => request<DashboardData>('/api/dashboard/stats')
  },

  // Clients
  clients: {
    list: (search = '', includeArchived = false) => 
      request<Client[]>(`/api/clients?search=${encodeURIComponent(search)}&includeArchived=${includeArchived}`),
    get: (id: number) => request<{ client: Client; invoices: Invoice[]; pos: PurchaseOrder[] }>(`/api/clients/${id}`),
    create: (data: Omit<Client, 'id' | 'is_archived' | 'created_at' | 'updated_at'>) => 
      request<{ message: string; client: Client }>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Client>) => 
      request<{ message: string; client: Client }>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    archive: (id: number) => request(`/api/clients/${id}/archive`, { method: 'POST' }),
    unarchive: (id: number) => request(`/api/clients/${id}/unarchive`, { method: 'POST' }),
    delete: (id: number) => request<{ message: string }>(`/api/clients/${id}`, { method: 'DELETE' })
  },

  // Purchase Orders
  pos: {
    list: (clientId?: number, status?: string) => {
      let query = '';
      if (clientId) query += `client_id=${clientId}&`;
      if (status) query += `status=${status}&`;
      return request<PurchaseOrder[]>(`/api/purchase-orders?${query}`);
    },
    get: (id: number) => request<PurchaseOrder>(`/api/purchase-orders/${id}`),
    create: (data: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>) => 
      request<{ message: string; po: PurchaseOrder }>('/api/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<PurchaseOrder>) => 
      request<{ message: string; po: PurchaseOrder }>(`/api/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ message: string }>(`/api/purchase-orders/${id}`, { method: 'DELETE' }),
    uploadAttachment: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request<{ key: string; filename: string }>('/api/purchase-orders/upload', {
        method: 'POST',
        body: formData
      });
    },
    getAttachmentUrl: (key: string) => `/api/purchase-orders/attachment/${key}`
  },

  // Invoices
  invoices: {
    list: (filters: { status?: string; client_id?: number; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.client_id) params.append('client_id', String(filters.client_id));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      return request<InvoiceListResponse>(`/api/invoices?${params.toString()}`);
    },
    get: (id: number) => request<{ invoice: Invoice; items: InvoiceItem[]; payments: Payment[] }>(`/api/invoices/${id}`),
    create: (data: any) => request<{ message: string; invoice: Invoice }>('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<{ message: string; invoice: Invoice }>(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ message: string }>(`/api/invoices/${id}`, { method: 'DELETE' }),
    updateStatus: (id: number, status: string) => request(`/api/invoices/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    duplicate: (id: number) => request<{ message: string; invoice: Invoice }>(`/api/invoices/${id}/duplicate`, { method: 'POST' })
  },

  // Payments
  payments: {
    record: (data: Omit<Payment, 'id' | 'created_at'>) => 
      request<{ message: string; paymentId: number }>('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ message: string }>(`/api/payments/${id}`, { method: 'DELETE' })
  },

  // Settings & Backups
  settings: {
    get: () => request<BusinessSettings>('/api/settings'),
    update: (data: Partial<BusinessSettings>) => 
      request<{ message: string; settings: BusinessSettings }>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data: any) => request('/api/settings/password', { method: 'PUT', body: JSON.stringify(data) }),
    getExportUrl: (entity: 'clients' | 'invoices' | 'purchase-orders') => `/api/settings/export/${entity}`
  }
};
