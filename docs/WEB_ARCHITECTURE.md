# Founder OS — Web Application Architecture

The web app (`web/`) is a Vite + React + TypeScript SPA that consumes the
Founder OS HTTP API. It is a **thin, read-only presentation layer**: no
business logic, scoring, or reasoning lives here — it renders exactly what the
server returns.

## Folder structure

```
web/src/
  main.tsx            App bootstrap, wrapped in <ErrorBoundary> and <BrowserRouter>
  App.tsx             Route table (React Router); heavy routes lazy-loaded
  router.tsx          AuthProvider / RequireAuth / useAuth
  api/
    types.ts          TypeScript mirrors of the server response shapes (subset, no invented fields)
    client.ts         fetch wrapper: credentials, 15s timeout, friendly errors, typed functions
  lib/
    errors.ts         errorMessage() — single source of user-facing error text
    copilot-format.ts Pure helpers for copilot rendering (unit-tested)
    monitoring-format.ts Pure helpers for monitoring rendering (unit-tested)
  components/         Reusable presentational components
  pages/             Route-level screens
  index.css          Design system (cards, badges, mobile-first layout)
```

## Data flow
1. A page calls a typed function in `api/client.ts`.
2. `request()` adds `credentials: "include"`, a 15s `AbortController` timeout,
   parses JSON defensively, and throws `ApiError` on any non-OK / malformed /
   timeout / network failure.
3. The page renders one of four states: **loading → error (with retry) →
   empty → populated**. `lib/errors.ts#errorMessage` produces the message.
4. Any uncaught render error is caught by the app-level `ErrorBoundary`
   (recoverable "Try again" / "Reload") instead of a blank screen.

## Key components
- **CopilotPanel** — conversational Q&A over one opportunity: suggested-question
  chips, free-text ask, per-opportunity transcript, retry, copy, citations, and
  a lazy-loaded "Show all insights" battery with search. Consumes only
  `/api/copilot/*`.
- **CopilotAnswerCard** (memoized) — single answer rendering, reused by the
  transcript and the battery (one source of truth).
- **CitationList** — collapsible field-level provenance.
- **Monitoring** page + **MonitorRunResultView** (memoized) — provider list with
  status, filters, manual run, last-run breakdown (changes, newly-detected,
  first-run vs incremental, failure reasons), snapshot viewer, run history.

## Performance
- `OpportunityDetail` and `Monitoring` are `React.lazy` code-split chunks
  (`Suspense` fallback), keeping the main bundle small.
- `React.memo` on reused list/card components; `useMemo`/`useCallback` for
  derived data and stable handlers; the copilot battery is fetched once, lazily.

## Testing
- Pure helpers (`lib/*`) are unit-tested in the root node vitest harness
  (`tests/web/`).
- Full user flows are covered by Playwright E2E (`tests/web-e2e/`): login,
  pipeline → opportunity detail → copilot ask/battery/citations, and the
  monitoring page (providers, run, graceful failure, history, mobile viewport).
- Component-level jsdom/RTL tests are intentionally not present — see
  `docs/TECH_DEBT.md`.
