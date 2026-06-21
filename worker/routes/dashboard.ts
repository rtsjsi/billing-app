import { Hono } from 'hono';
import { getDashboardStats, getRecentActivity } from '../db/queries';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.get('/stats', async (c) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed, April is 3
    
    let fyStartStr: string;
    let fyEndStr: string;
    
    if (month >= 3) {
      // April to March (current year to next year)
      fyStartStr = `${year}-04-01`;
      fyEndStr = `${year + 1}-03-31`;
    } else {
      // April to March (previous year to current year)
      fyStartStr = `${year - 1}-04-01`;
      fyEndStr = `${year}-03-31`;
    }

    const stats = await getDashboardStats(c.env.DB, fyStartStr, fyEndStr);
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
