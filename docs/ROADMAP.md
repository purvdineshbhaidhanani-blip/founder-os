# Founder OS — Future Roadmap

Ordered by value. Everything here is incremental on the existing, deterministic
architecture — no rewrites.

## Near-term (highest value)
1. **jsdom + React Testing Library** — add component-level tests for
   CopilotPanel, CitationList, MonitorRunResultView, and the pages, complementing
   the existing Playwright E2E and pure-helper unit tests.
2. **Live-data validation** — run the pipeline and monitoring against real
   sources in an egress-enabled environment; capture ranked-output snapshots.
3. **Copilot free-text E2E** — assert arbitrary and unmatched-query rendering.

## Mid-term
4. **Monitoring credential status (backend)** — add a per-provider eligibility
   field (mirroring the research connector registry) so the UI can show
   Ready / Missing-credentials / Disabled precisely, and pre-skip ineligible
   providers.
5. **Scheduled monitoring** — periodic runs + change alerts, reusing the memory
   engine and event bus already present.
6. **Report diagnostics dashboards** — turn the dense calibration/semantic
   sections into compact visual summaries.

## Longer-term
7. **Ranking/calibration algorithm iteration** — a dedicated, test-updating
   change to improve prioritization math (kept out of UI work to preserve
   deterministic backward compatibility).
8. **Persistence backend** — swap the in-memory stores for a durable store
   behind the existing `MemoryStore` interface (already abstracted).
9. **Multi-opportunity copilot** — cross-opportunity comparison questions.

## Explicitly out of scope for the current phase
- Any feature requiring external accounts, API keys, OAuth, payment, or a
  hosted deployment — the project is built to run and be verified entirely
  inside the repository.
