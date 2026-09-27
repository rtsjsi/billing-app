import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, X, Check } from 'lucide-react';
import { api, Invoice } from '../lib/api';

interface RecordPaymentModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

type AmountMode = 'net' | 'gross';

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function formatMoney(currency: string, n: number) {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RecordPaymentModal({ isOpen, invoice, onClose, onSuccess }: RecordPaymentModalProps) {
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other'>('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tdsPercent, setTdsPercent] = useState(0);
  const [amountMode, setAmountMode] = useState<AmountMode>('net');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !invoice) return;

    let cancelled = false;

    const remaining = invoice.total - invoice.amount_paid;
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('bank_transfer');
    setPayRef('');
    setPayNotes('');
    setAmountMode('net');
    setTdsPercent(0);
    setError('');
    setPayAmount(remaining > 0 ? remaining.toFixed(2) : '0.00');

    (async () => {
      try {
        const detail = await api.clients.get(invoice.client_id);
        if (cancelled) return;
        const rate = detail.client.tds_percent ?? 0;
        setTdsPercent(rate);
        if (rate > 0 && remaining > 0) {
          setAmountMode('net');
          setPayAmount(roundMoney(remaining * (1 - rate / 100)).toFixed(2));
        }
      } catch {
        // Client TDS is optional helper; payment still works without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, invoice]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const remainingDue = invoice ? invoice.total - invoice.amount_paid : 0;
  const entered = parseFloat(payAmount) || 0;

  const breakdown = useMemo(() => {
    if (tdsPercent <= 0 || entered <= 0) {
      return { bank: entered, tds: 0, credit: entered };
    }
    if (amountMode === 'net') {
      const credit = roundMoney(entered / (1 - tdsPercent / 100));
      const tds = roundMoney(credit - entered);
      return { bank: roundMoney(entered), tds, credit };
    }
    const tds = roundMoney(entered * (tdsPercent / 100));
    const bank = roundMoney(entered - tds);
    return { bank, tds, credit: roundMoney(entered) };
  }, [amountMode, entered, tdsPercent]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (breakdown.credit <= 0) {
      setError('Please enter a positive payment amount.');
      return;
    }
    if (breakdown.credit > remainingDue + 0.001) {
      setError('Payment cannot exceed the remaining outstanding balance.');
      return;
    }

    const tdsNote =
      tdsPercent > 0 && breakdown.tds > 0
        ? `Bank ${formatMoney(invoice.currency, breakdown.bank)}; TDS ${breakdown.tds.toFixed(2)} @ ${tdsPercent}%`
        : '';
    const notes = [payNotes.trim(), tdsNote].filter(Boolean).join(' | ') || null;

    setSubmitting(true);
    setError('');
    try {
      await api.payments.record({
        invoice_id: invoice.id,
        amount: breakdown.credit,
        payment_date: payDate,
        method: payMethod,
        reference: payRef || null,
        notes,
      });
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-payment-title"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h2 id="record-payment-title" className="font-display font-semibold text-lg text-slate-900 flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <span>Record Invoice Payment</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Close payment dialog" className="text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="p-3 bg-emerald-100 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs flex items-center space-x-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>
                Remaining Outstanding Balance:{' '}
                <b>{formatMoney(invoice.currency, remainingDue)}</b>
              </span>
            </div>

            {tdsPercent > 0 && (
              <div className="space-y-3">
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  Client TDS rate: <b className="font-mono">{tdsPercent}%</b>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                    Amount entered is
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAmountMode('net');
                        if (remainingDue > 0) {
                          setPayAmount(roundMoney(remainingDue * (1 - tdsPercent / 100)).toFixed(2));
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        amountMode === 'net'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      Net received (bank)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAmountMode('gross');
                        if (remainingDue > 0) {
                          setPayAmount(remainingDue.toFixed(2));
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        amountMode === 'gross'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      Gross (invoice credit)
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="payment-amount" className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                {tdsPercent > 0 && amountMode === 'net'
                  ? `Net received in bank (${invoice.currency}) *`
                  : `Payment Amount (${invoice.currency}) *`}
              </label>
              <input
                id="payment-amount"
                type="number"
                step="0.01"
                required
                className="w-full form-input text-sm font-mono text-emerald-600"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
              />
            </div>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            {tdsPercent > 0 && entered > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between gap-3">
                  <span>Bank received</span>
                  <span className="font-mono">{formatMoney(invoice.currency, breakdown.bank)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>TDS @ {tdsPercent}%</span>
                  <span className="font-mono">{formatMoney(invoice.currency, breakdown.tds)}</span>
                </div>
                <div className="flex justify-between gap-3 pt-1 border-t border-slate-200 font-semibold text-slate-800">
                  <span>Invoice credit</span>
                  <span className="font-mono">{formatMoney(invoice.currency, breakdown.credit)}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="payment-date" className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                Payment Date *
              </label>
              <input
                id="payment-date"
                type="date"
                required
                className="w-full form-input text-sm"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="payment-method" className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                Payment Method *
              </label>
              <select
                id="payment-method"
                className="w-full form-input text-sm"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI (GPay/PhonePe/Paytm)</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                Transaction Reference ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UTR / IMPS / Txn ID"
                className="w-full form-input text-sm font-mono"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                Private Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cleared next day"
                className="w-full form-input text-sm"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold text-white cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
