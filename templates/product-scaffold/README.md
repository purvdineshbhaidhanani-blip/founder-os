# Product Scaffold

The starting directory tree for every new SaaS product in this portfolio.
It encodes [`/standards`](../../standards/README.md) as a folder structure
so a new product starts compliant by default instead of having to be
brought into compliance later.

## How to use this

```bash
cp -r templates/product-scaffold products/<name>
cd products/<name>
```

Then, in order:

1. Replace every `<Product Name>` / `<name>` placeholder in the copied
   docs with the real product identity (name, problem, target customer,
   features, pricing, brand — see `products/README.md` for the full list
   of what's product-specific).
2. Fill in `docs/README.md`, `docs/ARCHITECTURE.md` from
   `templates/README_TEMPLATE.md` and `templates/ARCHITECTURE_TEMPLATE.md`.
3. Initialize the real `package.json` (Next.js + TypeScript per
   `standards/engineering.md`), install dependencies, wire up the
   database per `standards/database.md`.
4. Build out `frontend/`, `backend/`, `database/`, `ai/` per their own
   `README.md` in each folder below.
5. Write tests as you go (`tests/`), not after — see `standards/testing.md`.
6. Wire `deployment/` and `monitoring/` even though nothing is live yet —
   Phase 1 builds the complete architecture; Phase 2 turns it on.

## What's in here

| Folder | Purpose | Standard |
|---|---|---|
| [`frontend/`](./frontend/README.md) | Next.js App Router UI | `standards/engineering.md`, `standards/design-system.md` |
| [`backend/`](./backend/README.md) | API routes, services, business logic | `standards/engineering.md`, `standards/api.md` |
| [`database/`](./database/README.md) | Schema, migrations | `standards/database.md` |
| [`ai/`](./ai/README.md) | Model provider abstraction, prompts | `standards/ai.md` |
| [`docs/`](./docs/README.md) | Product documentation | `standards/documentation.md` |
| [`tests/`](./tests/) | Unit, integration, E2E | `standards/testing.md` |
| [`deployment/`](./deployment/README.md) | Environments, CI/CD, infra-as-code | `standards/devops.md` |
| [`monitoring/`](./monitoring/README.md) | Logging, error tracking, dashboards | `standards/devops.md` |

Files not yet present here (`package.json`, `.env.example`,
`tsconfig.json`, etc.) are created when a product is actually
instantiated from this scaffold, since they depend on that product's real
name, dependencies, and environment variables — this scaffold defines
structure and rules, not a specific product's code.
