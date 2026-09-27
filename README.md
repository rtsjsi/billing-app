# Freelancer Invoicing & PO Tracker

A secure, full-stack, single-user invoicing and Purchase Order tracker designed to run entirely on **Cloudflare's $0/month free tier**. 

---

## ⚡ Architecture Overview

- **Backend**: [Hono](https://hono.dev) routing framework running on a Cloudflare Worker.
- **Frontend**: Single Page React Application built with Vite, TypeScript, and Tailwind CSS v4.
- **Database**: Cloudflare D1 (serverless SQLite) for secure query storage.
- **Security**: Self-contained PBKDF2 Web Crypto password hashing & HttpOnly Cookie-based JWT sessions.

---

There is one Cloudflare Worker and one D1 database, `freelancer-invoices`. That deployment is production. Do not run a local server or add another database.

---

## ☁️ Deployment to Cloudflare (Free Tier)

Deploy the application:

### 1. Create a D1 Database
Create the D1 database on your Cloudflare account:
```bash
npx wrangler d1 create freelancer-invoices
```
This command outputs a `database_id`. Paste it into your `wrangler.jsonc` file:
```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "freelancer-invoices",
    "database_id": "PASTE_YOUR_DATABASE_ID_HERE"
  }
]
```

### 2. Configure CLI access (API credentials)
To query and migrate the D1 database, create a `.env` file in the root directory (based on `.env.example`):
```env
CLOUDFLARE_API_TOKEN=your-user-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```
*(Wrangler CLI and coding agents will automatically load these variables from `.env` to execute database queries and apply remote migrations).*

### 3. Apply migrations
Run migrations on the D1 database. `--remote` selects this Cloudflare database:
```bash
npx wrangler d1 migrations apply freelancer-invoices --remote
```

### 4. Configure secrets
Set your unique JWT signing key. Do NOT store it in `wrangler.jsonc`. Generate a strong random key and run:
```bash
npx wrangler secret put JWT_SECRET
```
*When prompted, paste your secret key.*

### 5. Build and Deploy
Compile the frontend static assets and deploy the Worker:
```bash
npm run build
npx wrangler deploy
```

---

## 🔒 Optional Hardening: Cloudflare Access

This application is fully secured with password hashing and HttpOnly JWT cookie sessions. However, for a second layer of defense, you can place your Worker behind **Cloudflare Access** (Zero Trust -> Access, which is free for up to 50 users).
This sets up an edge-level email validation or Google OAuth gateway before anyone can even reach your login page, providing maximum safety without writing or changing any code.

---

## ⚙️ Business Logic Highlights

1. **Invoice Number Reset boundaries**: Under settings, choose resets for `financial_year` (April to March), `calendar_year`, or `never`. The worker checks if ledger documents exist for the current period and resets the index back to `1` automatically on boundaries.
2. **Status Auto-Derivation**: Invoice status shifts to `overdue` automatically at read-time if the `due_date` has passed and `amount_paid < total`, avoiding the need for paid cron trigger background engines.
3. **Data Backups**: Under the **Settings** menu, export off-platform backups of your clients, invoices, and purchase orders as standard CSV spreadsheets.
