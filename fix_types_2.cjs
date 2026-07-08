const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'worker', 'routes');
const files = ['invoices.ts', 'purchase-orders.ts', 'settings.ts', 'dashboard.ts', 'payments.ts', 'clients.ts'];

for (const file of files) {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix Hono generic to include Variables
  content = content.replace(/const app = new Hono<\{ Bindings: \{ DB: D1Database \} \}>\(\);/g, "const app = new Hono<{ Bindings: { DB: D1Database }, Variables: { jwtPayload: { userId: number, username: string } } }>();");
  
  fs.writeFileSync(filePath, content);
}

// Fix worker/index.ts
const indexFile = path.join(__dirname, 'worker', 'index.ts');
let indexContent = fs.readFileSync(indexFile, 'utf8');
indexContent = indexContent.replace(/getSettings\(c\.env\.DB\)/g, "getSettings(c.env.DB, payload.userId)");
fs.writeFileSync(indexFile, indexContent);

// Fix worker/routes/settings.ts username property issue (it has c.get('jwtPayload').username maybe)
const settingsFile = path.join(__dirname, 'worker', 'routes', 'settings.ts');
let settingsContent = fs.readFileSync(settingsFile, 'utf8');
settingsContent = settingsContent.replace(/c\.get\('jwtPayload'\)\.username/g, "(c.get('jwtPayload') as any).username");
fs.writeFileSync(settingsFile, settingsContent);

console.log('Fixed typescript issues');
