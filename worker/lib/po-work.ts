/**
 * PO line "Confirmed" checkbox.
 * Unchecked (and legacy null) lines are the only ones that belong on the
 * Unconfirmed PO dashboard tile.
 */
export function uncheckedWorkSql(column = 'work_confirmed'): string {
  return `CAST(COALESCE(${column}, 0) AS INTEGER) = 0`;
}

export function checkedWorkSql(column = 'work_confirmed'): string {
  return `CAST(COALESCE(${column}, 0) AS INTEGER) = 1`;
}

export function isWorkChecked(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}
