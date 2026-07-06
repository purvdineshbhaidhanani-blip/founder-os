# Founder OS — Technical Debt Report (honest)

Known, intentional, or environment-bound gaps. Nothing here is a hidden
placeholder — the codebase contains no TODO markers, mocked production
features, or fake implementations.

## Testing
- **No jsdom/RTL component tests.** The vitest harness is node-only and RTL is
  not installed. Component behavior is instead verified by Playwright E2E
  (real browser) plus unit tests of the extracted pure helpers. Adding
  `@testing-library/react` + jsdom would allow finer-grained component tests.
- **Copilot free-text E2E** only asserts the suggested-question path and one
  free-text ask; arbitrary/unmatched-query rendering is not E2E-asserted.

## Environment-bound
- **Live external data** (GitHub/Reddit/HN/RSS/StackExchange) is unreachable in
  the sandbox (egress blocked at the proxy). Collectors and monitoring providers
  are correct but only exercised against mocked fetch and their graceful-failure
  paths. No screenshots of real ranked data are possible here.

## Backend intentionally unchanged
- **Scoring/ranking/calibration algorithms are frozen** to preserve
  deterministic, backward-compatible output covered by the test suite.
  Improvements to ranking math would change tested outputs and are deferred to a
  dedicated, test-updating change — not folded into UI/hardening work.

## Feature surface
- **Monitoring provider credential status** is derived only from the `keyless`
  flag; the API exposes no per-provider "missing-credentials / disabled /
  unsupported" state, so the UI shows "Ready" vs "Needs credentials" and never
  fabricates a finer status.
- **Report sub-diagnostics** (`semanticCluster`, per-report `calibration`,
  aggregate `calibration`, `semanticMerge`) are now rendered but are dense;
  they are diagnostic-grade, not yet visually polished dashboards.

## Web UX
- Suggested-question chips render the full 16-question vocabulary inline; for a
  large future vocabulary this would want virtualization.
