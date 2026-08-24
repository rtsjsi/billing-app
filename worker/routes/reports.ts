import { Hono } from 'hono';
import { buildTablePdf } from '../lib/pdf-report';
import {
  buildReport,
  isReportType,
  reportFilename,
  toPdfInput,
} from '../lib/report-data';
import { slugifyFilename } from '../lib/report-format';
import { buildXlsx } from '../lib/xlsx';

const app = new Hono<{ Bindings: { DB: D1Database }; Variables: { jwtPayload: { userId: number; username: string } } }>();

function attachment(filename: string, contentType: string, body: Uint8Array | string) {
  const safe = slugifyFilename(filename);
  return new Response(body as any, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`,
      'Cache-Control': 'no-store',
    },
  });
}

app.get('/:type', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const type = c.req.param('type');
    if (!isReportType(type)) {
      return c.json({ error: 'Unknown report type' }, 400);
    }

    const format = (c.req.query('format') || 'pdf').toLowerCase();
    if (format !== 'pdf' && format !== 'xlsx') {
      return c.json({ error: 'Format must be pdf or xlsx' }, 400);
    }

    const financialYear = c.req.query('financialYear') || undefined;
    const clientIdStr = c.req.query('clientId');
    const clientId = clientIdStr ? parseInt(clientIdStr, 10) : undefined;
    if (clientIdStr && !Number.isFinite(clientId)) {
      return c.json({ error: 'Invalid client ID' }, 400);
    }

    const report = await buildReport(c.env.DB, userId, type, { financialYear, clientId });
    const filename = reportFilename(report, format, financialYear);

    if (format === 'xlsx') {
      const bytes = buildXlsx(report.excelSheets);
      return attachment(
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        bytes
      );
    }

    const pdfBytes = await buildTablePdf(toPdfInput(report));
    return attachment(filename, 'application/pdf', pdfBytes);
  } catch (error: any) {
    const message = error.message || 'Failed to generate report';
    const status = message.includes('financial year') ? 400 : 500;
    return c.json({ error: message }, status);
  }
});

export default app;
