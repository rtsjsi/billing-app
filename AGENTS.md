# Freelancer Invoicing & PO Tracker

Invoicing and purchase-order tracker. One Cloudflare Worker (`billing-app`) and one D1 database (`freelancer-invoices`). That deployment is production. Do not add another app or database, and do not start `npm run dev`, `wrangler dev`, or any local server. Check the deployed app.

## Layout

- `frontend/` — React SPA (Vite, TypeScript, Tailwind CSS v4). Wrangler serves `frontend/dist` as `ASSETS` with SPA fallback.
- `worker/` — Hono API. Routes under `/api`: dashboard, clients, purchase-orders, invoices, payments, settings, reports.
- `migrations/` — numbered SQL files. Leave `migrations_dir` unset.
- `wrangler.jsonc` — Worker config and the D1 binding `DB`, including `database_id`.
- Passwords use PBKDF2. Sessions are an HttpOnly JWT cookie. `JWT_SECRET` is a Wrangler secret (`npx wrangler secret put JWT_SECRET`), not a var in `wrangler.jsonc`.

## Behavior

- Invoice numbers reset from settings: `financial_year` (April–March, the default), `calendar_year`, or `never`. On a period boundary the worker sets the index back to 1 when the new period has no ledger documents.
- Invoice status is `overdue` at read time when `due_date` has passed and `amount_paid < total`.
- Invoice lines may link to a purchase-order line through `po_item_id`. Remaining PO quantity uses that link.
- Clients have a `tds_percent`.
- Settings exports clients, invoices, and purchase orders as CSV. Reports also download PDF and Excel.

## Git

After code or config changes:

1. Stage the relevant files. Never stage `.env` or other secrets.
2. Commit with a message that explains why.
3. Push to `origin` on the current branch (`git push -u origin HEAD`).

Do this at the end of a task unless the user says not to push. Then, if the change should go live and Cloudflare credentials are available, apply migrations when the schema changed and deploy. If deploy or auth fails, the push still stands; say what remains.

## Cloudflare

Wrangler reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the root `.env` (see `.env.example`). Never commit `.env`.

`npm run deploy` builds the frontend and runs `wrangler deploy`. It does not apply migrations.

Pending SQL files are recorded in `d1_migrations`. Apply them before a deploy that needs the new schema. `--remote` selects this Cloudflare database. Set `CI=true` so Wrangler skips the confirmation prompt.

```bash
npx wrangler d1 migrations apply freelancer-invoices --remote
npm run deploy
```

Do not pass `--local`.

CI (`.github/workflows/ci.yml`) runs `npm ci`, typecheck, test, and build. It does not migrate or deploy.
