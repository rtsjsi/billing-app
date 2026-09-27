# Freelancer Invoicing & PO Tracker

Invoicing and purchase-order tracker. One Cloudflare Worker (`billing-app`) and one D1 database (`freelancer-invoices`). That deployment is production. Do not add another app or database, and do not start `npm run dev`, `wrangler dev`, or any local server. Check the deployed app.

## Layout

- `frontend/` — React SPA (Vite, TypeScript, Tailwind CSS v4). Wrangler serves `frontend/dist` as `ASSETS` with SPA fallback.
- `worker/` — Hono API. Routes under `/api`: dashboard, clients, purchase-orders, invoices, payments, settings, reports.
- `migrations/` — numbered SQL files, applied in filename order.
- `wrangler.jsonc` — Worker config and the D1 binding `DB`, including `database_id`.
- Passwords use PBKDF2. Sessions are an HttpOnly JWT cookie. `JWT_SECRET` is a Wrangler secret (`npx wrangler secret put JWT_SECRET`), not a var in `wrangler.jsonc`.

## Behavior

- Invoice numbers reset from settings: `financial_year` (April–March, the default), `calendar_year`, or `never`. On a period boundary the worker sets the index back to 1 when the new period has no ledger documents.
- Invoice status is `overdue` at read time when `due_date` has passed and `amount_paid < total`.
- Every invoice requires a purchase order. New invoices cannot be saved without one, and an existing link cannot be cleared. Invoices saved earlier without a purchase order stay as they are until the next edit, which must choose one.
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

Apply schema changes with the D1 HTTP API before a deploy that needs them. The database id is in `wrangler.jsonc`. Send `Authorization: Bearer <CLOUDFLARE_API_TOKEN>`. One-statement calls, including listing what is already applied, go to `POST /accounts/{account_id}/d1/database/{database_id}/query` with body `{ "sql": "..." }`.

Do not use `wrangler d1 migrations apply`. That command sends the whole `.sql` file to `/query`, which returns `incomplete input` when the file has more than one statement or a trigger.

List applied names with `SELECT name FROM d1_migrations ORDER BY id`. For each pending file in `migrations/`, in filename order:

1. Build an import body from that file plus one line: `INSERT INTO d1_migrations (name) VALUES ('<filename>');` Use the filename only, such as `0008_invoice_item_po_link.sql`. Leave the file in `migrations/` unchanged.
2. MD5 the import body. `POST .../import` with `{ "action": "init", "etag": "<md5>" }`.
3. If the response includes `upload_url`, `PUT` the body there and confirm the returned `ETag` matches that MD5. Then `POST .../import` with `{ "action": "ingest", "etag": "<md5>", "filename": "<filename from init>" }`.
4. While `status` is not `complete`, `POST .../import` with `{ "action": "poll", "current_bookmark": "<at_bookmark>" }`. A failed import leaves the database as it was.

Then `npm run deploy`.

CI (`.github/workflows/ci.yml`) runs `npm ci`, typecheck, test, and build. It does not migrate or deploy.
