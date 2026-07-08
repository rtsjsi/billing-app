const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'worker', 'routes');
const files = ['invoices.ts', 'purchase-orders.ts', 'settings.ts', 'dashboard.ts', 'payments.ts'];

const queryFunctions = [
  'listInvoices', 'countInvoices', 'getInvoiceById', 'getInvoiceItems', 'createInvoice', 'updateInvoice', 'deleteInvoice', 'updateInvoiceStatus',
  'listPOs', 'getPOById', 'getPOItems', 'createPO', 'updatePO', 'deletePO',
  'getSettings', 'updateSettings',
  'getDashboardStats', 'getRecentActivity', 'getAvailableFinancialYears', 'exportClients', 'exportInvoices', 'exportPOs',
  'listPaymentsByInvoiceId', 'addPayment', 'deletePayment'
];

for (const file of files) {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Inject const userId = c.get('user').userId; inside route handlers
  content = content.replace(/(app\.(get|post|put|delete)\(['`"][^'`"]+['`"],\s*async\s*\(\s*c\s*\)\s*=>\s*\{\s*try\s*\{)/g, '$1\n    const userId = c.get(\'user\').userId;');
  
  // Replace query function calls to include userId
  for (const fn of queryFunctions) {
    const regex = new RegExp(`(?<!function\\s)(${fn})\\(\\s*c\\.env\\.DB\\s*,`, 'g');
    content = content.replace(regex, `$1(c.env.DB, userId,`);
    
    // For calls that don't have arguments other than c.env.DB
    const regex2 = new RegExp(`(?<!function\\s)(${fn})\\(\\s*c\\.env\\.DB\\s*\\)`, 'g');
    content = content.replace(regex2, `$1(c.env.DB, userId)`);
  }

  // settings.ts specifically does not have a try-catch block for some reason maybe? Let's check if there are routes without try-catch
  content = content.replace(/(app\.(get|post|put|delete)\(['`"][^'`"]+['`"],\s*(?:async\s*)?\(\s*c\s*\)\s*=>\s*\{(?!\s*try\s*\{))/g, '$1\n  const userId = c.get(\'user\').userId;');

  fs.writeFileSync(filePath, content);
  console.log(`Refactored ${file}`);
}
