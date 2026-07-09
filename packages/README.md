# Packages

Reserved for publishable or internally-versioned packages, if the
portfolio grows large enough that `shared/` code needs independent
versioning, changelogs, or publication (e.g. an npm-published design
system, or a package consumed by an external client SDK).

## When to use this instead of `shared/`

- `shared/` — internal code, imported directly by workspace path, versioned
  together with the products that use it. Default choice.
- `packages/` — code that needs its own version number, changelog, and
  release process independent of any single product (a public SDK, a
  component library published to npm). Promote from `shared/` to
  `packages/` only when that independent lifecycle is actually needed.

Currently empty — no product or shared module has reached that threshold
yet.
