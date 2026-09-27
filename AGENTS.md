# Freelancer Invoicing & PO Tracker

A secure, full-stack, single-user invoicing and Purchase Order tracker on Cloudflare's free tier.

## Architecture

- **Backend**: [Hono](https://hono.dev) on a Cloudflare Worker.
- **Frontend**: React SPA built with Vite, TypeScript, and Tailwind CSS v4.
- **Database**: Cloudflare D1 (SQLite), database name `freelancer-invoices`, binding `DB`.
- **Security**: PBKDF2 password hashing and HttpOnly cookie JWT sessions.

## Runtime

There is one Cloudflare Worker and one D1 database, `freelancer-invoices`. That deployment is production. Do not add a local, preview, or staging copy of the app or database. Do not start `npm run dev`, `wrangler dev`, or any local server. Verify behavior on the deployed Cloudflare app.

## Git: always commit and push

After completing any code or config changes in this repo:

1. Stage the relevant files (never stage secrets like `.env`).
2. Create a concise commit that explains **why** the change was made.
3. Push to `origin` on the current branch (`git push -u origin HEAD`).

Do this automatically at the end of a task — do not wait for the user to ask “push to git” unless they explicitly say **not** to push. After the push, if the change should go live and Cloudflare credentials are available, apply D1 migrations and deploy. If deploy or auth fails, the push still stands; tell the user what remains.

## Deploy

`npm run deploy` builds the frontend and runs `wrangler deploy`. It does not apply migrations.

### D1 database

The database id lives in `wrangler.jsonc`:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "freelancer-invoices",
    "database_id": "<database-id>"
  }
]
```

To create that database on a new account: `npx wrangler d1 create freelancer-invoices`, then paste the printed `database_id` into `wrangler.jsonc`.

### CLI credentials

Wrangler loads Cloudflare credentials from a root `.env` (see `.env.example`). Never commit `.env`.

```env
CLOUDFLARE_API_TOKEN=your-user-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

### Migrations

Schema changes are numbered SQL files in `migrations/`. Wrangler records applied files in `d1_migrations`, so applying again only runs pending files.

Before a Worker deploy that depends on the new schema, apply migrations. `--remote` is Wrangler's flag for this Cloudflare database:

```bash
npx wrangler d1 migrations apply freelancer-invoices --remote
```

Then `npm run deploy`. Set `CI=true` in a non-interactive shell so the confirmation prompt is skipped. Do not use `--local`. Leave `migrations_dir` unset while files stay as top-level `migrations/*.sql`.

### JWT secret

Set the JWT signing key with `npx wrangler secret put JWT_SECRET`. Do not store it in `wrangler.jsonc`.

## Optional hardening: Cloudflare Access

Password hashing and HttpOnly JWT cookies already protect the app. Cloudflare Access (Zero Trust → Access, free for up to 50 users) can sit in front of the Worker and require email or Google sign-in before the login page. That needs no application code changes.

## Business logic

1. **Invoice number reset**: Under settings, resets are `financial_year` (April to March), `calendar_year`, or `never`. On a period boundary the worker checks whether ledger documents exist for the current period and resets the index to `1`.
2. **Status**: Invoice status becomes `overdue` at read time when `due_date` has passed and `amount_paid < total`.
3. **Backups**: Settings exports clients, invoices, and purchase orders as CSV.
