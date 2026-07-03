# Deployment Guide — Founder OS

Founder OS ships as a **single self-contained Node.js process**. There is no
separate hosting platform, database service, or external control plane: one
`node dist/server/index.js` process serves both the JSON API (`/api/*`) and the
built React SPA (static files from `web/dist/`) on a single port. It is
**host-agnostic** — it runs anywhere Node.js >= 18.18.0 runs (bare VM, container,
PaaS worker, systemd unit, etc.). This document is the deployment package for
that process.

---

## 1. Environment variables

The list below is the **complete** set of `process.env.*` references found across
`src/server/`, `src/research/`, `src/connectors/`, and `src/utils/`. Behavior
descriptions reflect the actual code, not assumptions.

### Required for a functional login

| Variable | Required | Behavior if missing |
| --- | --- | --- |
| `FOUNDER_EMAIL` | **Required** | Login is disabled. `POST /api/auth/login` logs `"FOUNDER_EMAIL / FOUNDER_PASSWORD not configured"` and returns **HTTP 500** (`"Login is not configured on this server."`). No one can authenticate, so the dashboard and research features are unreachable. (`src/server/routes/auth.ts`) |
| `FOUNDER_PASSWORD` | **Required** | Same as above — login returns HTTP 500 until both `FOUNDER_EMAIL` and `FOUNDER_PASSWORD` are set. (`src/server/routes/auth.ts`) |

### Optional — Google Sign-In (second, additional login method)

Google Sign-In is a second, additive login method alongside founder
email/password — it does not replace it, and founder login works identically
whether or not these variables are set. There is still no database or user
table: a successful Google sign-in issues the exact same stateless,
HMAC-signed session cookie the founder login issues, just carrying the
Google-verified email instead of the founder email.

| Variable | Required | Behavior if missing |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Optional (required for Google Sign-In) | If unset, `GET /api/auth/google` logs `"GOOGLE_CLIENT_ID not configured"` and returns **HTTP 500** (`{"error": "Google Sign-In is not configured on this server."}`) instead of redirecting to a broken consent screen. Founder login is completely unaffected. (`src/server/routes/auth.ts`) |
| `GOOGLE_CLIENT_SECRET` | Optional (required alongside `GOOGLE_CLIENT_ID`) | Required by `GET /api/auth/google/callback` to exchange the authorization code for a token. If unset, the callback redirects to `/login?error=oauth_failed` and logs the misconfiguration server-side. (`src/server/routes/auth.ts`) |
| `GOOGLE_REDIRECT_URI` | Optional | Defaults to `http://localhost:{PORT}/api/auth/google/callback` (same "sensible default, explicit override" pattern `PORT` itself uses). **Must be set explicitly in production** to the real public callback URL, and must exactly match the redirect URI registered in the Google Cloud Console OAuth client, or Google will reject the exchange. (`src/server/routes/auth.ts`) |

### Strongly recommended for production

| Variable | Required | Behavior if missing |
| --- | --- | --- |
| `SESSION_SECRET` | Recommended | Falls back to a **random secret generated once per process** and logs a warning: `"SESSION_SECRET not set — generated a random secret for this process only. Sessions will not survive a restart."` Every restart invalidates all existing session cookies, forcing all users to log in again. Set a stable value in production. (`src/server/session.ts`) |
| `NODE_ENV` | Recommended | When set to `production`, the session cookie gets the `Secure` attribute (HTTPS-only). If unset/non-production, the cookie is sent without `Secure` — acceptable for local/dev, not for a production TLS deployment. Set `NODE_ENV=production` behind TLS. (`src/server/session.ts`) |

### Optional — server networking

| Variable | Required | Behavior if missing |
| --- | --- | --- |
| `PORT` | Optional | Defaults to **4173**. Sets the single port serving both the API and the SPA. (`src/server/index.ts`) |

### Optional — research source credentials

The research engine degrades gracefully. Missing a source's credentials disables
only that source; the rest of the pipeline continues and returns results from the
remaining sources.

| Variable | Required | Behavior if missing |
| --- | --- | --- |
| `GITHUB_TOKEN` | Optional | GitHub search still runs **unauthenticated** — the `Authorization` header is simply omitted. This works but is subject to GitHub's low unauthenticated rate limit, so the GitHub source may intermittently fail with a rate-limit status and contribute no results. Set a token to raise quota. (`src/research/sources/github.ts`) |
| `YOUTUBE_API_KEY` | Optional (source-gating) | The YouTube source returns `{ ok: false, error: "Missing YOUTUBE_API_KEY" }` and contributes **no results**. Research still completes using the other sources. Required only if YouTube results are wanted. (`src/research/sources/youtube.ts`) |
| `STACK_EXCHANGE_KEY` | Optional | Stack Exchange search still runs **without a key** — it just isn't appended to the query. Works at the lower anonymous quota; set a key to raise quota. (`src/research/sources/stackexchange.ts`) |

> The keyless research sources **Hacker News** and **RSS** need no credentials and
> are always available. GitHub and Stack Exchange run keyless-degraded; YouTube is
> the only source fully gated behind its key.

### Optional — logging

| Variable | Required | Behavior if missing |
| --- | --- | --- |
| `AGENT_FACTORY_LOG_LEVEL` | Optional | Sets log verbosity. Defaults to the built-in level when unset. (`src/utils/logger.ts`) |
| `AGENT_FACTORY_LOG_FORMAT` | Optional | `json` emits structured JSON logs; anything else (default) emits text logs. (`src/utils/logger.ts`) |

> Note: `src/connectors/registry.ts` declares `requiredEnv`/`optionalEnv` for many
> other connectors (Supabase, Stripe, Slack, Notion, Linear, etc.). Those are
> **not** referenced by the running web server or the research engine — they are
> only read when their respective connector is activated. None are required to
> deploy or run the Founder OS web frontend, so they are intentionally excluded
> from the required/recommended lists above.

---

## 2. Build

```bash
npm install
npm run build
```

`npm run build` runs `tsc -p tsconfig.json` (server -> `dist/`) followed by
`vite build --config web/vite.config.ts` (SPA -> `web/dist/`). Both outputs are
required at runtime.

---

## 3. Start

```bash
npm start
```

This runs `node dist/server/index.js` (see `scripts.start` in `package.json`). The
process serves the API and the SPA on `PORT` (default `4173`).

Run `npm install && npm run build` before the first `npm start`, and again after
every deploy of new code.

---

## 4. Health / readiness checks

There is **no dedicated `/api/health` or `/api/status` endpoint** in the codebase.
Use the following signals instead:

- **Liveness:** `GET /` returns **HTTP 200** with the built `index.html` once
  `web/dist/` exists and the process is listening. This is the basic "process is
  up and serving" signal. (`src/server/index.ts`, `serveStatic`)
  - If the build hasn't produced `web/dist/`, `GET /` still returns 200 but with a
    placeholder page stating the frontend hasn't been built — treat that as a
    failed deploy, not a healthy process.
- **Readiness (research capability):** `GET /api/connectors/status` returns the
  per-source configuration state (`github`, `youtube`, `stackexchange`, plus the
  keyless `hackernews` and `rss`), including each source's `missingEnv`. This is
  the readiness signal for the research feature.
  - **This endpoint requires an authenticated session** (`requireSession`); it
    returns 401 without a valid `founder_session` cookie. It is therefore a
    post-login readiness probe, not an anonymous health check.
    (`src/server/routes/connectors.ts`)

Recommended external monitor: `GET /` for uptime; the connectors-status endpoint
for a deeper, authenticated readiness check of research capability.

---

## 5. Rollback procedure (git-based)

This is a **git-based rollback, not a managed-platform rollback.** The process has
no external state to migrate or revert beyond:

- local file storage under `.runtime/` (artifacts, gitignored), and
- environment variables / secrets supplied by the runtime.

Neither of those requires a schema migration or a platform snapshot, so rollback is
simply reverting code and rebuilding:

1. **Stop** the running process (e.g. `Ctrl-C`, `systemctl stop`, or your process
   manager's stop command).
2. **Check out** the previous known-good commit or tag:
   ```bash
   git checkout <previous-good-tag-or-commit>
   ```
3. **Rebuild** from that revision:
   ```bash
   npm install
   npm run build
   ```
4. **Restart:**
   ```bash
   npm start
   ```
5. **Verify** liveness (`GET /`) and, after logging in, readiness
   (`GET /api/connectors/status`).

Environment variables are unchanged by rollback — they live in the runtime
environment, not in git. Existing sessions may be invalidated after a restart if
`SESSION_SECRET` is not set (see section 1); set `SESSION_SECRET` to make rollback
restarts transparent to logged-in users.

The `.runtime/` artifact directory is backward-compatible local JSON storage and is
not deleted by a rollback. If a specific rollback needs to discard artifacts written
by the newer build, remove or archive `.runtime/` manually before restarting.

---

## 6. Secrets handling

- **Secrets are never committed to the repository.** They are supplied **only**
  through the runtime environment (shell export, container env, process-manager
  unit file, or a secrets manager). No secret value appears in any tracked file.
- **`.env` files are gitignored.** Verified in `.gitignore`:
  - `.env`
  - `.env.*`
  - `!.env.example` (only the value-less template is tracked)
  - `.runtime/` (local artifact storage) is also gitignored.
- Use `.env.example` (tracked, no values) as the canonical list of variable names.
  Copy it to `.env` locally, or inject the same names via your secrets manager in
  production — never commit the populated file.

### Rotate-before-use warning (important)

Three API keys were pasted earlier in founder chat history — a **YouTube API key**,
a **GitHub personal access token (PAT)**, and a **third token**. These were already
flagged as **compromised**.

- They **MUST NEVER** be placed in this file, in `.env.example`, or in any other
  committed file.
- They **MUST be rotated** (reissued from their respective providers) **before use**.
  Treat the leaked values as revoked.
- All credentials must be supplied at runtime via the environment / secrets manager
  and never hardcoded in source, config, or documentation.

A repository secret scan (`AIzaSy`, `ghp_`, `rl_c88`) was run across `src/`, `web/`,
and `tests/` and returned **zero matches** — no secret is hardcoded in the codebase.
Keep it that way.

## 7. Railway deployment

This app is a **single self-contained Node process holding in-memory state**
(sessions, SSE progress subscriptions, the runtime object graph) — exactly the
model Railway's persistent-container runtime supports natively, unlike a
stateless serverless platform. No code changes were required to run here.

**Confirmed compatible, unmodified:**
- `src/server/index.ts` reads `PORT` from the environment (`Number(process.env.PORT) || 4173`)
  and binds via `server.listen(port)` with no explicit host, which defaults to
  all interfaces — required for a containerized platform to route traffic in.
  Verified locally with `PORT=5555` injected exactly as Railway would.
- Sessions and SSE re-verified against the existing Playwright E2E suite after
  the above check — 6/6 specs still pass, no regression from confirming
  Railway compatibility.

**Deployment config:** `railway.json` at the repo root pins the Nixpacks
builder and `npm start` as the start command, with an on-failure restart
policy. Railway's Nixpacks builder auto-detects the `build`/`start` scripts
in `package.json` even without this file; it is included for explicitness
and reproducibility.

**Steps to deploy (requires a human with Railway account access):**
1. `npm install -g @railway/cli` (or use `npx @railway/cli`), then `railway login`
   — this opens a browser OAuth flow and cannot be done headlessly by an agent.
2. From the repo root: `railway init` (or `railway link` if a project already
   exists), then `railway up`.
3. In the Railway project dashboard (or via `railway variables set KEY=value`),
   set at minimum: `FOUNDER_EMAIL`, `FOUNDER_PASSWORD`, `SESSION_SECRET`. Set
   `NODE_ENV=production` to enable the `Secure` cookie attribute. Add
   `GITHUB_TOKEN` / `YOUTUBE_API_KEY` / `STACK_EXCHANGE_KEY` if those research
   sources should be active. Railway injects `PORT` automatically — do not set
   it manually.
4. Railway assigns a public `*.up.railway.app` HTTPS domain automatically on
   first deploy (or a custom domain if configured) — that URL only exists
   after step 2 actually runs against an authenticated Railway account.
