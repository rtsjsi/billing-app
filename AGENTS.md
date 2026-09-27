# Agent instructions

## Git: always commit and push

After completing any code or config changes in this repo:

1. Stage the relevant files (never stage secrets like `.env`).
2. Create a concise commit that explains **why** the change was made.
3. Push to `origin` on the current branch (`git push -u origin HEAD`).

Do this automatically at the end of a task — do not wait for the user to ask “push to git” unless they explicitly say **not** to push.

## Stack

The Node.js Worker and React frontend have been removed. New application code is Python.

## D1 migrations

Schema changes are numbered SQL files in `migrations/`. Wrangler records applied files in `d1_migrations`, so applying again only runs pending files.

Database name: `freelancer-invoices`. Remote commands need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the root `.env` (never commit `.env`).

- Local: `npx wrangler d1 migrations apply freelancer-invoices --local`
- Production: `npx wrangler d1 migrations apply freelancer-invoices --remote`

Set `CI=true` in a non-interactive shell so the confirmation prompt is skipped.

If Cloudflare auth is available, apply pending migrations when a schema change needs to be live. If that fails, still push git and tell the user what remains.
