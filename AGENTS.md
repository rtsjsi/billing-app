# Agent instructions

## Git: always commit and push

After completing any code or config changes in this repo:

1. Stage the relevant files (never stage secrets like `.env`).
2. Create a concise commit that explains **why** the change was made.
3. Push to `origin` on the current branch (`git push -u origin HEAD`).

Do this automatically at the end of a task — do not wait for the user to ask “push to git” unless they explicitly say **not** to push.

If Cloudflare auth is available (e.g. `CLOUDFLARE_API_TOKEN` in `.env`), also apply pending D1 migrations and deploy when the change needs to be live. If deploy/auth fails, still push git and tell the user what remains.
