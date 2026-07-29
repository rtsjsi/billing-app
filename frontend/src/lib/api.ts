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
  tds_percent: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id?: number;
  po_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
  /** When true, line counts toward dashboard / outstanding calcs. */
  work_confirmed?: boolean | number;
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
  status: 'open' | 'closed' | 'cancelled';
  attachment_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  invoiced_amount?: number;
  /** Sum of line amounts where work_confirmed = 1 */
  confirmed_amount?: number;
  items?: PurchaseOrderItem[];
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
  client_billing_address?: string | null;
  client_gstin?: string | null;
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
    totalPOAmount: number;
    totalInvoiceAmount: number;
    invoicePendingAmount: number;
    totalPaidAmount: number;
    totalOutstanding: number;
    overdueCount: number;
  };
  recentInvoices: Invoice[];
  openPOs: PurchaseOrder[];
  availableYears: string[];
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

function getCookieValue(name: string): string | null {
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    const [k, ...rest] = c.split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

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

  // CSRF hardening for cookie-based sessions:
  // For any state-changing request, attach X-CSRF-Token from the readable `csrf` cookie.
  const method = (options.method || 'GET').toUpperCase();
  const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (isUnsafeMethod) {
    const csrfToken = getCookieValue('csrf');
    if (csrfToken) {
      options.headers = {
        ...(options.headers || {}),
        'x-csrf-token': csrfToken,
      };
    }
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

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      // fall through
    }
  }
  const asciiMatch = /filename\s*=\s*("?)([^";]+)\1/i.exec(header);
  return asciiMatch?.[2]?.trim() || null;
}

function isLikelyMobileClient(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
}

/**
 * Fetch a binary file with session cookies, then trigger a real download.
 * On mobile, prefers the Web Share sheet (Save to Files / share apps) because
 * navigating to application/pdf often only opens an inline viewer.
 */
async function downloadBinaryFile(path: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, { credentials: 'include' });

  if (response.status === 401) {
    window.dispatchEvent(new Event('api-unauthorized'));
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const blob = await response.blob();
  const filename =
    parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ||
    fallbackFilename;
  const file = new File([blob], filename, { type: blob.type || 'application/pdf' });

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (isLikelyMobileClient() && canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
      });
      return;
    } catch (err: unknown) {
      // User dismissed the share sheet — treat as success (no fallback open).
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Otherwise fall through to anchor download.
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // Delay revoke so the browser can start the download.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
  }
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
    getStats: (financialYear?: string, clientId?: string | number) => {
      const params = new URLSearchParams();
      if (financialYear) params.append('financialYear', financialYear);
      if (clientId) params.append('clientId', String(clientId));
      const queryString = params.toString();
      return request<DashboardData>(`/api/dashboard/stats${queryString ? `?${queryString}` : ''}`);
    }
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
    list: (params: { status?: string, client_id?: number, po_id?: number, startDate?: string, endDate?: string, page?: number, limit?: number, sortBy?: string, sortDir?: 'asc' | 'desc' } = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.append('status', params.status);
      if (params.client_id) query.append('client_id', params.client_id.toString());
      if (params.po_id) query.append('po_id', params.po_id.toString());
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.sortBy) query.append('sortBy', params.sortBy);
      if (params.sortDir) query.append('sortDir', params.sortDir);
      
      return request<InvoiceListResponse>(`/api/invoices?${query.toString()}`);
    },
    get: (id: number) => request<{ invoice: Invoice; items: InvoiceItem[]; payments: Payment[] }>(`/api/invoices/${id}`),
    create: (data: any) => request<{ message: string; invoice: Invoice }>('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<{ message: string; invoice: Invoice }>(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ message: string }>(`/api/invoices/${id}`, { method: 'DELETE' }),
    updateStatus: (id: number, status: string) => request(`/api/invoices/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    duplicate: (id: number) => request<{ message: string; invoice: Invoice }>(`/api/invoices/${id}/duplicate`, { method: 'POST' }),
    getPDFUrl: (id: number) => `/api/invoices/${id}/pdf`,
    /** Fetch PDF as a blob and download/share (avoids mobile inline-only open). */
    downloadPDF: (id: number, invoiceNumber?: string) =>
      downloadBinaryFile(
        `/api/invoices/${id}/pdf`,
        `invoice_${invoiceNumber || id}.pdf`
      ),
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
