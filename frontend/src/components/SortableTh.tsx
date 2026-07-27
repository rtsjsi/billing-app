import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

const DESC_FIRST = new Set([
  'created_at',
  'issue_date',
  'due_date',
  'po_date',
  'total',
  'amount',
  'amount_paid',
]);

export function nextSortState(
  currentKey: string,
  currentDir: SortDir,
  clicked: string
): { key: string; dir: SortDir } {
  if (currentKey === clicked) {
    return { key: clicked, dir: currentDir === 'asc' ? 'desc' : 'asc' };
  }
  return { key: clicked, dir: DESC_FIRST.has(clicked) ? 'desc' : 'asc' };
}

interface SortableThProps {
  label: string;
  column: string;
  sortKey: string;
  sortDir: SortDir;
  onSort: (column: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export default function SortableTh({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className = '',
  align = 'left',
}: SortableThProps) {
  const active = sortKey === column;
  const alignClass =
    align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left';

  return (
    <th className={`px-6 py-3.5 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 w-full ${alignClass} text-xs font-semibold uppercase tracking-wider transition-colors ${
          active ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <span>{label}</span>
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
        )}
      </button>
    </th>
  );
}
