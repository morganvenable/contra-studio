# Dancer feedback

Dancers can tell us what looks wrong in a dance without describing where they
are. The app attaches that automatically, and the owner pulls the notes into a
file Claude can read, reproduce and fix.

## How it works

1. **Button.** On the dance view, **Feedback** sits next to "Source & notes".
   It only appears when the build sets `VITE_FEEDBACK_URL`; without it the app
   has no button and makes no feedback requests.
2. **Panel.** One plain text box ("What looks wrong, or what would you
   change?"), an optional name and Send. The text box works with dictation
   tools: it is a plain `<textarea data-dictate>`, nothing intercepts keys, and
   buttons do not steal focus. The draft is kept in `sessionStorage` until it is
   sent; the name is remembered in `localStorage`.
3. **Context.** When the panel opens, the app captures the dance id and title,
   the current figure (index and label), phrase and beat (absolute and within
   the dance), the time through, camera and followed dancer, set size, engine
   (`next` or `old`), the app commit, the page path and query, the window size
   and a timestamp. The panel shows this as one line so the dancer can see what
   is attached. The fields are defined in `src/feedback/context.ts` and
   validated in `worker/feedback/src/validate.ts`.
4. **Send.** The note goes to the feedback Worker. If sending fails, the text
   stays and the button becomes **Try again**, which resends the same moment.
   After a successful send, the panel says thanks.
5. **Worker.** `worker/feedback/` is a Cloudflare Worker with a D1 database:
   - `POST /feedback` checks the origin (exact list in `ALLOWED_ORIGINS`), the
     size (16 KB body, 4,000-character note, 80-character name), an hourly
     per-visitor limit (`RATE_LIMIT_PER_HOUR`, default 10) and Turnstile, then
     stores the note.
   - `GET /feedback?status=&dance=&since=&limit=` and
     `PATCH /feedback/<id>` (`{"status": "fixed", "note": "..."}`) are for the
     owner only, behind `Authorization: Bearer <OWNER_TOKEN>`.
   - Statuses are `new`, `fixed` and `wontfix`.
6. **Triage.** `scripts/feedback-pull.mjs` downloads notes into
   `feedback-inbox/feedback.md` and `feedback.json`, grouped by dance, with the
   context and a `__contra.actions.seek(<beat>)` line to reproduce each one.
   `feedback-inbox/` is git-ignored.

## Owner: pulling and marking notes

Set the two variables once per shell (PowerShell shown):

```powershell
$env:CONTRA_FEEDBACK_URL = "https://contra-feedback.<you>.workers.dev"
$env:CONTRA_FEEDBACK_TOKEN = "<the OWNER_TOKEN>"
```

Then:

```bash
node scripts/feedback-pull.mjs
node scripts/feedback-pull.mjs --status new
node scripts/feedback-pull.mjs mark <id> fixed "what changed"
```

## Deploying the Worker (one time)

`powershell -File scripts/feedback-setup.ps1` does all of the steps below: it
signs in, creates the database, applies the schema, deploys, stores the
secrets (the owner token goes to `Svalboard\private\contra-feedback-token.txt`)
and sets the `VITE_FEEDBACK_URL` repository variable that the Pages build
reads. Turnstile starts off (`TURNSTILE_ENABLED` in `wrangler.jsonc`); the
hourly per-visitor limit still applies.

By hand, from the repository root. Each line is a separate command.

```bash
cd worker/feedback
npm install
npx wrangler login
npx wrangler d1 create contra-feedback
```

`d1 create` prints a `database_id`. Paste it into `wrangler.jsonc` in place of
the zero id, then:

```bash
npx wrangler d1 migrations apply contra-feedback --remote
npx wrangler secret put OWNER_TOKEN
npx wrangler secret put RATE_LIMIT_SALT
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler deploy
```

- `OWNER_TOKEN` and `RATE_LIMIT_SALT`: long random strings (at least 16
  characters). One way to make one:
  `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`.
- `TURNSTILE_SECRET_KEY`: create a Turnstile widget in the Cloudflare
  dashboard for `morganvenable.github.io`. It gives a site key (public) and a
  secret key (this one).
- `deploy` prints the Worker address, such as
  `https://contra-feedback.<you>.workers.dev`.

Then build the site with the address and the Turnstile site key:

```powershell
$env:VITE_FEEDBACK_URL = "https://contra-feedback.<you>.workers.dev"
$env:VITE_TURNSTILE_SITE_KEY = "<the Turnstile site key>"
npm run build:pages
```

For the GitHub Pages workflow, set the same two values as repository variables
and pass them to the build step as environment variables. Neither is a secret.

## Running it locally

```bash
cd worker/feedback
npm install
copy .dev.vars.example .dev.vars
npm run migrate:local
npm run dev
```

That serves the Worker at `http://127.0.0.1:8787` with Turnstile off
(`.dev.vars`), a local D1 database under `.wrangler/`, and the owner token
from `.dev.vars`. In another shell, from the repository root:

```powershell
$env:VITE_FEEDBACK_URL = "http://127.0.0.1:8787"
npm run dev
```

## Tests

```bash
npm run test:feedback-worker
npm test
node --test scripts/feedback-pull.test.mjs
npm run test:feedback-e2e
```

- Worker unit tests run the real migration on `node:sqlite` and cover
  validation, size limits, CORS, the rate limit, Turnstile and owner auth.
- Client tests (`src/feedback/feedback.test.ts`) cover context capture and
  retry.
- The end-to-end flow starts `wrangler dev` and Vite itself, opens Debra's
  Dance, steps to a figure, sends a note after one failed attempt, checks the
  owner GET returns the right dance, figure and beat, runs the pull script and
  marks the note fixed.

## Privacy

- Stored per note: the text, the optional name, the captured app context and
  the server time. No IP address, user agent, cookie or account.
- Rate limiting keys on a SHA-256 of a secret salt, the IP address and the
  current hour. The address cannot be recovered from it, the same visitor gets
  an unrelated key each hour, and keys older than the current hour are deleted.
- Turnstile is Cloudflare's spam check. When it is on, the dancer's browser
  talks to `challenges.cloudflare.com` while the panel is open, and the Worker
  verifies the token with Cloudflare.
- Only the owner token can read notes. Cloudflare's own request logs follow
  Cloudflare's policies; the Worker logs no note text.
- Local tooling: wrangler's optional image library (`sharp`, which bundles
  LGPL libvips) is replaced by an empty stub in `worker/feedback/stubs/sharp`.
  This Worker does not use the Images binding.
