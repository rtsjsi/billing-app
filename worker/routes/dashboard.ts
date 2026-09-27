import { Hono } from 'hono';
import { getDashboardStats, getRecentActivity, getAvailableFinancialYears } from '../db/queries';

const app = new Hono<{ Bindings: { DB: D1Database }, Variables: { jwtPayload: { userId: number, username: string } } }>();

app.get('/stats', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const financialYear = c.req.query('financialYear') || undefined;
    const clientIdStr = c.req.query('clientId');
    const clientId = clientIdStr ? parseInt(clientIdStr, 10) : undefined;

    const stats = await getDashboardStats(c.env.DB, userId, financialYear, clientId);
    const activity = await getRecentActivity(c.env.DB, userId, financialYear, clientId);
    const availableYears = await getAvailableFinancialYears(c.env.DB, userId);

    return c.json({
      stats,
      recentInvoices: activity.recentInvoices,
      openPOs: activity.openPOs,
      availableYears
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to load dashboard statistics' }, 500);
  }
});

export default app;
