# PayrollAudit

Pre-disbursement payroll validation for HR/payroll teams and payroll service providers — catches
salary, tax, attendance, and compliance issues before money moves, explained by an AI Payroll
Copilot.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the payrollaudit DB, .env, runs migrations, seeds plans
cd ../../products/payrollaudit
npm install
npm run dev               # http://localhost:3010
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Payroll Copilot** — plain-language summary, prioritized fixes, and risk level from findings
- **Payroll Validation Engine** — gross pay, tax withholding, net pay, attendance, overtime checks
- **Compliance Score** — severity-weighted 0–100 per payroll run
- **Payroll Run Import** — period + payslip line entry with full pay/tax/hours fields
- **Multi-Company Support** — multiple companies per organization

## Pricing

Free · Starter $39/mo · Pro $129/mo · Business $299/mo · Enterprise (custom). AI Payroll Copilot's
credit allotments are intentionally low (payroll runs are periodic, not high-frequency). Full
breakdown: [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#10-payrollaudit).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#10-payrollaudit) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#10-payrollaudit) — pricing, limits, AI credits
