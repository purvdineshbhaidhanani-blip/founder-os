# Sentinel AI — Marketing Site & Live Dashboard Demo

A self-contained, zero-dependency single-page application implementing the
Sentinel AI SaaS platform design (exported from Google Stitch and rebuilt as
working code).

## Run it

Open `index.html` in any browser — no build step, no server, no dependencies.

## Pages (hash-routed)

| Route | Page |
|---|---|
| `#/` | Landing page |
| `#/features` | Features |
| `#/integrations` | Integrations (with working category filter) |
| `#/pricing` | Pricing (working monthly/annual toggle + comparison table) |
| `#/about` | About / team / careers |
| `#/contact` | Contact (client-side validated form) |
| `#/signin` | Auth (sign-in / multi-step sign-up demo) |
| `#/dashboard` | Live dashboard demo (animated metrics, hoverable risk chart, streaming activity feed) |

## Design system

Implements the Stitch `DESIGN.md` tokens: obsidian dark surfaces (`#050505`/`#0F0F0F`),
Safety Emerald primary (`#10B981`), Electric Cyan secondary, glassmorphic nav,
24px-radius cards with 1px `#262626` borders, shimmer accents, mono uppercase labels.
Respects `prefers-reduced-motion`.
