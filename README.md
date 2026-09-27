# Billing app

The Node.js Worker and React frontend have been removed. The app is moving to Python.

SQL schema changes stay in `migrations/`. Apply them with Wrangler against the D1 database `freelancer-invoices`.

Local:

```bash
npx wrangler d1 migrations apply freelancer-invoices --local
```

Production:

```bash
npx wrangler d1 migrations apply freelancer-invoices --remote
```

Remote commands need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in a root `.env` (see `.env.example`). Set `CI=true` in a non-interactive shell so Wrangler skips the confirmation prompt.
