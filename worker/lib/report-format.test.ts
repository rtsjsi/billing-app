import { describe, expect, it } from 'vitest';
import {
  columnLetter,
  excelSafeString,
  slugifyFilename,
  toPdfSafe,
  xmlEscape,
} from './report-format';
import { buildXlsx, zipStore } from './xlsx';
import { buildTablePdf } from './pdf-report';
import { isReportType } from './report-data';

describe('report format helpers', () => {
  it('escapes XML special characters', () => {
    expect(xmlEscape('A & B <C> "q"')).toBe('A &amp; B &lt;C&gt; &quot;q&quot;');
  });

  it('neutralizes spreadsheet formula injection', () => {
    expect(excelSafeString('=CMD()')).toBe("'=CMD()");
    expect(excelSafeString('+1+1')).toBe("'+1+1");
    expect(excelSafeString('PO-100')).toBe('PO-100');
  });

  it('maps rupee and non-latin characters for WinAnsi PDFs', () => {
    expect(toPdfSafe('₹ 100')).toBe('Rs. 100');
    expect(toPdfSafe('Café')).toBe('Caf?');
  });

  it('builds Excel column letters', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
  });

  it('slugifies download names', () => {
    expect(slugifyFilename('Invoice register FY 2025-26')).toBe('Invoice_register_FY_2025-26');
  });
});

describe('xlsx builder', () => {
  it('emits a ZIP-backed workbook', () => {
    const bytes = buildXlsx([
      {
        name: 'Invoices',
        headers: ['Number', 'Amount'],
        rows: [
          [{ type: 'string', value: 'INV-1' }, { type: 'number', value: 1500.5 }],
          [{ type: 'string', value: '=1+1' }, { type: 'number', value: null }],
        ],
      },
    ]);
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
    expect(bytes.length).toBeGreaterThan(200);
    const asText = new TextDecoder().decode(bytes);
    expect(asText).toContain('xl/worksheets/sheet1.xml');
    expect(asText).toContain("'=1+1");
  });

  it('stores uncompressed zip entries', () => {
    const payload = new TextEncoder().encode('hello');
    const zip = zipStore([{ name: 'hello.txt', data: payload }]);
    expect(String.fromCharCode(zip[0], zip[1])).toBe('PK');
  });
});

describe('report types', () => {
  it('accepts known report slugs', () => {
    expect(isReportType('summary')).toBe(true);
    expect(isReportType('unconfirmed-pos')).toBe(true);
    expect(isReportType('unknown')).toBe(false);
  });
});

describe('pdf report', () => {
  it('writes a multi-page PDF with an empty-state message', async () => {
    const bytes = await buildTablePdf({
      title: 'Invoice register',
      subtitle: 'FY 2025-26',
      businessName: 'Test Business',
      generatedAt: 'Generated 2026-08-24',
      orientation: 'landscape',
      columns: [
        { header: 'Invoice', width: 2 },
        { header: 'Amount', width: 1, align: 'right' },
      ],
      rows: [],
    });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
