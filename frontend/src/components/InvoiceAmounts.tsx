import { formatCurrency } from '../lib/utils';

type InvoiceAmountsProps = {
  total: number;
  amountPaid?: number | null;
  currency: string;
  className?: string;
};

/** Compact Total / Paid / Balance stack for invoice table cells. */
export default function InvoiceAmounts({
  total,
  amountPaid = 0,
  currency,
  className = '',
}: InvoiceAmountsProps) {
  const paid = amountPaid || 0;
  const balance = Math.max(0, total - paid);

  const rows: { label: string; value: string; labelClass: string; valueClass: string }[] = [
    {
      label: 'Total',
      value: formatCurrency(total, currency),
      labelClass: 'text-slate-400',
      valueClass: 'text-slate-800',
    },
    {
      label: 'Paid',
      value: formatCurrency(paid, currency),
      labelClass: 'text-emerald-600/90',
      valueClass: 'text-emerald-700',
    },
    {
      label: 'Balance',
      value: formatCurrency(balance, currency),
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
