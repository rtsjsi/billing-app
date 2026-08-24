import React, { useState } from 'react';
import {
  ChartColumn,
  BookOpen,
  CircleDashed,
  FileSpreadsheet,
  FileText,
  Landmark,
  Receipt,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilters } from '../lib/FilterContext';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';

type ReportFormat = 'pdf' | 'xlsx';

type ReportCard = {
  type: string;
  title: string;
  description: string;
  icon: typeof FileText;
};

const REPORT_GROUPS: { heading: string; items: ReportCard[] }[] = [
  {
    heading: 'Billing',
    items: [
      {
        type: 'summary',
        title: 'Billing summary',
        description: 'Pipeline totals: unconfirmed, confirmed, invoiced, outstanding, and collected.',
        icon: ChartColumn,
      },
      {
        type: 'invoices',
        title: 'Invoice register',
        description: 'Every invoice with tax, paid amount, and remaining balance.',
        icon: FileText,
      },
      {
        type: 'outstanding',
        title: 'Outstanding invoices',
        description: 'Unpaid and overdue invoices with aging buckets for follow-up.',
        icon: Wallet,
      },
      {
        type: 'tax',
        title: 'Tax register',
        description: 'Taxable value, rate, and tax amount by invoice (GST or your tax label).',
        icon: Receipt,
      },
    ],
  },
  {
    heading: 'Purchase orders',
    items: [
      {
        type: 'purchase-orders',
        title: 'PO register',
        description: 'PO totals with confirmed, unconfirmed, invoiced, and yet-to-invoice amounts.',
        icon: BookOpen,
      },
      {
        type: 'unconfirmed-pos',
        title: 'Unconfirmed PO lines',
        description: 'Line items not yet confirmed to start, grouped by purchase order.',
        icon: CircleDashed,
      },
    ],
  },
  {
    heading: 'Collections',
    items: [
      {
        type: 'payments',
        title: 'Collections register',
        description: 'Payments received with invoice, client, method, and reference.',
        icon: Landmark,
      },
      {
        type: 'clients',
        title: 'Client-wise summary',
        description: 'Per-client PO, invoiced, collected, outstanding, and estimated TDS.',
        icon: Users,
      },
    ],
  },
];

export default function Reports() {
  const toast = useToast();
  const { availableYears, clients, selectedFY, setSelectedFY } = useFilters();
  const [filterClientId, setFilterClientId] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const hasFilters = Boolean(selectedFY || filterClientId);

  const download = async (type: string, format: ReportFormat) => {
    const key = `${type}:${format}`;
    setDownloading(key);
    try {
      await api.reports.download(type, format, selectedFY || undefined, filterClientId || undefined);
      toast.success(format === 'pdf' ? 'PDF downloaded' : 'Excel downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download report.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="hidden md:block">
        <PageHeader
          title="Reports"
          subtitle="Download PDF and Excel reports for the selected year and client"
        />
      </div>

      <div className="app-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="flex gap-2">
            <select
              className="form-input text-sm py-2 min-h-0"
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFY('');
                  setFilterClientId('');
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

      {REPORT_GROUPS.map((group) => (
        <section key={group.heading}>
          <h2 className="section-title mb-3 px-0.5">{group.heading}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.items.map((item) => {
              const Icon = item.icon;
              const pdfBusy = downloading === `${item.type}:pdf`;
              const xlsxBusy = downloading === `${item.type}:xlsx`;
              const busy = pdfBusy || xlsxBusy;
              return (
                <div key={item.type} className="app-card p-4 sm:p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className="dash-metric-icon bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-5">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <button
                      type="button"
                      className="btn-secondary text-sm py-2 min-h-0"
                      disabled={busy}
                      onClick={() => download(item.type, 'pdf')}
                    >
                      {pdfBusy ? 'Preparing…' : 'PDF'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm py-2 min-h-0"
                      disabled={busy}
                      onClick={() => download(item.type, 'xlsx')}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {xlsxBusy ? 'Preparing…' : 'Excel'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
