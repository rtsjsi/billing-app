import { formatCurrency, getPOOutstanding } from '../lib/utils';

type POAmountsProps = {
  amount: number | null | undefined;
  confirmedAmount?: number | null;
  invoicedAmount?: number | null;
  currency: string;
  className?: string;
};

/** Compact PO / Confirmed / Outstanding stack for table cells. */
export default function POAmounts({
  amount,
  confirmedAmount,
  invoicedAmount,
  currency,
  className = '',
}: POAmountsProps) {
  const confirmed = confirmedAmount ?? 0;
  const outstanding = getPOOutstanding(confirmedAmount ?? amount, invoicedAmount);

  return (
    <div
      className={`inline-grid grid-cols-[auto_auto] gap-x-2.5 gap-y-0.5 items-baseline justify-items-end text-xs tabular-nums whitespace-nowrap ${className}`}
    >
      <span className="justify-self-start text-slate-400 font-medium">Total</span>
      <span className="font-semibold text-slate-800">
        {amount != null ? formatCurrency(amount, currency) : '—'}
      </span>

      <span className="justify-self-start text-emerald-600/90 font-medium">Confirmed</span>
      <span className="font-semibold text-emerald-700">
        {formatCurrency(confirmed, currency)}
      </span>

      <span className="justify-self-start text-amber-600/90 font-medium">Outstanding</span>
      <span className="font-semibold text-amber-700">
        {formatCurrency(outstanding, currency)}
      </span>
    </div>
  );
}
