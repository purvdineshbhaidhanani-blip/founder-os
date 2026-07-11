// Single source of truth for the portfolio: every product, its port, and the
// launcher. Used by bootstrap.mjs, start-portfolio.mjs, stop-portfolio.mjs and
// the OS wrapper scripts. Ports are permanent (also hard-coded in each
// product's package.json dev/start scripts) so URLs never change.

export const LAUNCHER_PORT = 3000;

export const PRODUCTS = [
  { id: "spendgov", name: "SpendGov", port: 3001 },
  { id: "seccorrelate", name: "SecCorrelate", port: 3002 },
  { id: "codeaudit", name: "CodeAudit", port: 3003 },
  { id: "crmcapture", name: "CRMCapture", port: 3004 },
  { id: "incidenttriage", name: "IncidentTriage", port: 3005 },
  { id: "authstartup", name: "AuthStartup", port: 3006 },
  { id: "erpaudit", name: "ERPAudit", port: 3007 },
  { id: "contactverify", name: "ContactVerify", port: 3008 },
  { id: "characterconsistency", name: "CharacterConsistency", port: 3009 },
  { id: "payrollaudit", name: "PayrollAudit", port: 3010 },
  { id: "transcriptionqa", name: "TranscriptionQA", port: 3011 },
  { id: "schemalint", name: "SchemaLint", port: 3012 },
];

// All ports that must answer HTTP 200 for the portfolio to be "up".
export const ALL_PORTS = [LAUNCHER_PORT, ...PRODUCTS.map((p) => p.port)];

// Postgres connection settings, overridable via the standard PG* env vars so
// the same scripts work against local installs, Docker, or managed Postgres.
export function pgEnv() {
  return {
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT || "5432",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
  };
}

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
