# Agent instructions

## Git: always commit and push

After completing any code or config changes in this repo:

1. Stage the relevant files (never stage secrets like `.env`).
2. Create a concise commit that explains **why** the change was made.
3. Push to `origin` on the current branch (`git push -u origin HEAD`).

Do this automatically at the end of a task — do not wait for the user to ask “push to git” unless they explicitly say **not** to push.

## Runtime

The app is hosted on Cloudflare and is used only there. Do not run it locally (`npm run dev`, `wrangler dev`, or a local D1 database).

## D1 migrations

Schema changes are numbered SQL files in `migrations/`. Wrangler records applied files in `d1_migrations`, so applying again only runs pending files. `npm run deploy` and `wrangler deploy` do not apply them.

Database name: `freelancer-invoices`. Commands need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the root `.env` (never commit `.env`).

Production, before a Worker deploy that depends on the new schema:

```bash
npx wrangler d1 migrations apply freelancer-invoices --remote
```

Then `npm run deploy`. Set `CI=true` in a non-interactive shell so the confirmation prompt is skipped. Do not use `--local`.

If Cloudflare auth is available, apply pending migrations and deploy when the change needs to be live. If deploy/auth fails, still push git and tell the user what remains.
