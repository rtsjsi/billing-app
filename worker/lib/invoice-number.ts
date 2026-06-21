export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed, January is 0, April is 3
  if (month >= 3) {
    // April to December
    const nextYearShort = String(year + 1).slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    // January to March
    const prevYear = year - 1;
    const currentYearShort = String(year).slice(-2);
    return `${prevYear}-${currentYearShort}`;
  }
}

export function getCalendarYear(date: Date = new Date()): string {
  return date.getFullYear().toString();
}

export function formatInvoiceNumber(
  prefix: string,
  nextNumber: number,
  resetMode: 'never' | 'calendar_year' | 'financial_year',
  date: Date = new Date()
): string {
  const padded = String(nextNumber).padStart(4, '0');
  
  if (resetMode === 'never') {
    return `${prefix}${padded}`;
  } else if (resetMode === 'calendar_year') {
    const year = getCalendarYear(date);
    return `${prefix}${year}-${padded}`;
  } else {
    const fy = getFinancialYear(date);
    return `${prefix}${fy}-${padded}`;
  }
}

export function getPeriodPattern(
  prefix: string,
  resetMode: 'never' | 'calendar_year' | 'financial_year',
  date: Date = new Date()
): string {
  if (resetMode === 'never') {
    return `${prefix}%`;
  } else if (resetMode === 'calendar_year') {
    const year = getCalendarYear(date);
    return `${prefix}${year}-%`;
  } else {
    const fy = getFinancialYear(date);
    return `${prefix}${fy}-%`;
  }
}
