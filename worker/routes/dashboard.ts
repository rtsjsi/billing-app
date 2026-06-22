import { Hono } from 'hono';
import { getDashboardStats, getRecentActivity } from '../db/queries';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.get('/stats', async (c) => {
  try {
    const stats = await getDashboardStats(c.env.DB);
    const activity = await getRecentActivity(c.env.DB);

    return c.json({
      stats,
      recentInvoices: activity.recentInvoices,
      openPOs: activity.openPOs
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to load dashboard statistics' }, 500);
  }
});

export default app;
