# Products Workspace

20 SaaS product folders, each built on the shared, locked **Universal SaaS Core** (`UNIVERSAL_CORE.json`, Loop 1: V1 Foundation, V2 Business Engine, V3 Technical Engine, V4 Production Engine).

## Convention

- The core lives in exactly one place: `products/UNIVERSAL_CORE.json`. It is never copied.
- Every `products/saas-NN/core.json` **references** the core by relative path (`../UNIVERSAL_CORE.json`) and pins the same four locked blueprint hashes — it holds no V1-V4 content of its own.
- No product folder contains domain-specific features, requirements, or research yet. This workspace is structure only; domain implementation is a separate, later step.

## Adding a product's domain work later

1. Assign the product a real name/domain (currently `null` in each `core.json`).
2. Run the Universal SaaS Pipeline (`saas-foundation-agent` → `saas-business-engine-agent` → `saas-technical-engine-agent` → `saas-production-engine-agent`) against that name, same as `docs/saas-pipeline-runs/` demonstrates.
3. Layer domain-specific features on top of the resulting blueprint inside that product's own folder — never inside `UNIVERSAL_CORE.json` or the `.claude/agents/saas-*-engine-agent.md` files themselves.

## Structure

```
products/
  UNIVERSAL_CORE.json   # the one and only copy of the locked core reference
  saas-01/ .. saas-20/
    core.json            # pointer to UNIVERSAL_CORE.json + pinned hashes, no content copy
    README.md             # scaffold-only status note
```
