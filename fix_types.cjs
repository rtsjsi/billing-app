const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'worker', 'routes');
const files = ['invoices.ts', 'purchase-orders.ts', 'settings.ts', 'dashboard.ts', 'payments.ts', 'clients.ts'];

for (const file of files) {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the generic Hono typing so c.get('jwtPayload') is valid, and change c.get('user') to c.get('jwtPayload')
  content = content.replace(/c\.get\('user'\)/g, "c.get('jwtPayload')");
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
}
