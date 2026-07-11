import React, { useEffect, useState } from 'react';
import { DollarSign, X, Check } from 'lucide-react';
import { api, Invoice } from '../lib/api';

interface RecordPaymentModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecordPaymentModal({ isOpen, invoice, onClose, onSuccess }: RecordPaymentModalProps) {
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other'>('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice) return;

    const remaining = invoice.total - invoice.amount_paid;
    setPayAmount(remaining > 0 ? remaining.toFixed(2) : '0.00');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('bank_transfer');
    setPayRef('');
    setPayNotes('');
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const remainingDue = invoice.total - invoice.amount_paid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(payAmount) || 0;
    if (parsedAmount <= 0) {
      alert('Please enter a positive payment amount.');
      return;
    }

    setSubmitting(true);
    try {
      await api.payments.record({
        invoice_id: invoice.id,
        amount: parsedAmount,
        payment_date: payDate,
        method: payMethod,
        reference: payRef || null,
        notes: payNotes || null,
      });
      onClose();
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h2 className="font-display font-semibold text-lg text-slate-900 flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <span>Record Invoice Payment</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="p-3 bg-emerald-100 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>
                Remaining Outstanding Balance:{' '}
                <b>
                  {invoice.currency} {remainingDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </b>
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                Payment Amount ({invoice.currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full form-input text-sm font-mono text-emerald-600"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                Payment Date *
              </label>
              <input
                type="date"
                required
                className="w-full form-input text-sm"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
                Payment Method *
              </label>
              <select
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
