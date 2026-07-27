import { formatCurrency, getPOOutstanding } from '../lib/utils';

type POAmountsProps = {
  amount: number | null | undefined;
  confirmedAmount?: number | null;
  invoicedAmount?: number | null;
  currency: string;
  className?: string;
};

/** Compact Total / Confirmed / Outstanding stack for table cells. */
export default function POAmounts({
  amount,
  confirmedAmount,
  invoicedAmount,
  currency,
  className = '',
}: POAmountsProps) {
  const confirmed = confirmedAmount ?? 0;
  const outstanding = getPOOutstanding(confirmedAmount ?? amount, invoicedAmount);

  const rows: { label: string; value: string; labelClass: string; valueClass: string }[] = [
    {
      label: 'Total',
      value: amount != null ? formatCurrency(amount, currency) : '—',
      labelClass: 'text-slate-400',
      valueClass: 'text-slate-800',
    },
    {
      label: 'Confirmed',
      value: formatCurrency(confirmed, currency),
      labelClass: 'text-emerald-600/90',
      valueClass: 'text-emerald-700',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(outstanding, currency),
      labelClass: 'text-amber-600/90',
      valueClass: 'text-amber-700',
    },
  ];

  return (
    <div
      className={`grid grid-cols-[6.5rem_minmax(6.5rem,auto)] gap-x-3 gap-y-1 text-xs tabular-nums ${className}`}
    >
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <span className={`text-left font-medium leading-4 ${row.labelClass}`}>
            {row.label}
          </span>
          <span className={`text-right font-semibold leading-4 whitespace-nowrap ${row.valueClass}`}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
