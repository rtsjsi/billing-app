import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import { toPdfSafe } from './report-format';

export type PdfAlign = 'left' | 'right';

export type PdfColumn = {
  header: string;
  width: number;
  align?: PdfAlign;
};

export type PdfTableReport = {
  title: string;
  subtitle?: string;
  businessName: string;
  generatedAt: string;
  orientation?: 'portrait' | 'landscape';
  columns: PdfColumn[];
  rows: string[][];
  totals?: string[];
};

const PAGE_PORTRAIT: [number, number] = [595.28, 841.89];
const PAGE_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 36;
const HEADER_BAND = 64;
const ROW_HEIGHT = 16;
const FONT_SIZE = 8;
const HEADER_SIZE = 8;
const FOOTER_SIZE = 8;

function ellipsize(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const safe = toPdfSafe(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let truncated = safe;
  while (truncated.length > 1 && font.widthOfTextAtSize(`${truncated}...`, size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

function drawCell(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number,
  align: PdfAlign,
  color = rgb(0.1, 0.12, 0.16)
) {
  const padded = width - 8;
  const drawn = ellipsize(text, font, size, padded);
  const textWidth = font.widthOfTextAtSize(drawn, size);
  const tx = align === 'right' ? x + width - 4 - textWidth : x + 4;
  page.drawText(drawn, { x: tx, y, font, size, color });
}

export async function buildTablePdf(report: PdfTableReport): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const size = report.orientation === 'landscape' ? PAGE_LANDSCAPE : PAGE_PORTRAIT;
  const weightSum = report.columns.reduce((sum, col) => sum + col.width, 0) || 1;
  const usableWidth = size[0] - MARGIN * 2;
  const colWidths = report.columns.map((col) => (col.width / weightSum) * usableWidth);

  const pages: PDFPage[] = [];
  let page = pdfDoc.addPage(size);
  pages.push(page);
  let y = 0;

  const paintHeader = (target: PDFPage) => {
    const { width, height } = target.getSize();
    target.drawRectangle({
      x: 0,
      y: height - HEADER_BAND,
      width,
      height: HEADER_BAND,
      color: rgb(0.02, 0.48, 0.43),
    });
    target.drawText(toPdfSafe(report.businessName), {
      x: MARGIN,
      y: height - 26,
      font: bold,
      size: 12,
      color: rgb(1, 1, 1),
    });
    target.drawText(toPdfSafe(report.title), {
      x: MARGIN,
      y: height - 44,
      font,
      size: 10,
      color: rgb(0.85, 0.97, 0.93),
    });
    const rightMeta = toPdfSafe(report.generatedAt);
    const metaWidth = font.widthOfTextAtSize(rightMeta, 8);
    target.drawText(rightMeta, {
      x: width - MARGIN - metaWidth,
      y: height - 26,
      font,
      size: 8,
      color: rgb(0.85, 0.97, 0.93),
    });
    if (report.subtitle) {
      const sub = toPdfSafe(report.subtitle);
      const subWidth = font.widthOfTextAtSize(sub, 8);
      target.drawText(sub, {
        x: width - MARGIN - subWidth,
        y: height - 44,
        font,
        size: 8,
        color: rgb(0.85, 0.97, 0.93),
      });
    }
  };

  const paintTableHeader = (target: PDFPage, headerY: number) => {
    target.drawRectangle({
      x: MARGIN,
      y: headerY - 4,
      width: usableWidth,
      height: ROW_HEIGHT,
      color: rgb(0.94, 0.96, 0.98),
    });
    let x = MARGIN;
    report.columns.forEach((col, i) => {
      drawCell(target, col.header, x, headerY, colWidths[i], bold, HEADER_SIZE, col.align || 'left', rgb(0.29, 0.33, 0.39));
      x += colWidths[i];
    });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 18) {
      page = pdfDoc.addPage(size);
      pages.push(page);
      paintHeader(page);
      y = page.getSize().height - HEADER_BAND - 20;
      paintTableHeader(page, y);
      y -= ROW_HEIGHT;
    }
  };

  paintHeader(page);
  y = page.getSize().height - HEADER_BAND - 20;
  paintTableHeader(page, y);
  y -= ROW_HEIGHT;

  if (report.rows.length === 0) {
    ensureSpace(ROW_HEIGHT);
    page.drawText('No records for the selected filters.', {
      x: MARGIN + 4,
      y,
      font,
      size: 9,
      color: rgb(0.45, 0.5, 0.55),
    });
  } else {
    report.rows.forEach((row, rowIndex) => {
      ensureSpace(ROW_HEIGHT);
      if (rowIndex % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: y - 4,
          width: usableWidth,
          height: ROW_HEIGHT,
          color: rgb(0.98, 0.98, 0.99),
        });
      }
      let x = MARGIN;
      report.columns.forEach((col, i) => {
        drawCell(page, row[i] ?? '', x, y, colWidths[i], font, FONT_SIZE, col.align || 'left');
        x += colWidths[i];
      });
      y -= ROW_HEIGHT;
    });
  }

  if (report.totals && report.totals.length > 0) {
    ensureSpace(ROW_HEIGHT + 6);
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: usableWidth,
      height: ROW_HEIGHT,
      color: rgb(0.9, 0.97, 0.94),
    });
    let x = MARGIN;
    report.columns.forEach((col, i) => {
      drawCell(page, report.totals![i] ?? '', x, y, colWidths[i], bold, FONT_SIZE, col.align || 'left', rgb(0.02, 0.4, 0.36));
      x += colWidths[i];
    });
  }

  const totalPages = pages.length;
  pages.forEach((p, i) => {
    const label = `Page ${i + 1} of ${totalPages}`;
    const { width } = p.getSize();
    const w = font.widthOfTextAtSize(label, FOOTER_SIZE);
    p.drawText(label, {
      x: width - MARGIN - w,
      y: 16,
      font,
      size: FOOTER_SIZE,
      color: rgb(0.55, 0.6, 0.65),
    });
  });

  return pdfDoc.save();
}
