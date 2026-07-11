import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PORT = Number(process.env.LAUNCHER_PORT ?? 3000);

/** Permanent port assignments — see infrastructure/launcher/README.md. */
export const PRODUCTS = [
  { id: "spendgov", name: "SpendGov", port: 3001, description: "AI-powered SaaS + AI spend intelligence — subscription visibility, renewal optimization, and overpayment recovery." },
  { id: "seccorrelate", name: "SecCorrelate", port: 3002, description: "Unified security log correlation that detects threats in real time across firewalls, endpoints, identity, and apps." },
  { id: "codeaudit", name: "CodeAudit", port: 3003, description: "Code quality and security review for pull requests — vulnerabilities, technical debt, and confident deployments." },
  { id: "crmcapture", name: "CRMCapture", port: 3004, description: "Intelligent lead capture and CRM sync — extracts, enriches, and pushes contact data automatically." },
  { id: "incidenttriage", name: "IncidentTriage", port: 3005, description: "AI incident intelligence for DevOps/SRE — explains what broke, why, and how to fix it in under a minute." },
  { id: "authstartup", name: "AuthStartup", port: 3006, description: "Startup-friendly authentication — social login, magic links, MFA, RBAC, orgs, and an AI Security Advisor." },
  { id: "erpaudit", name: "ERPAudit", port: 3007, description: "AI-powered ERP configuration, compliance, and process audit — always-on compliance intelligence." },
  { id: "contactverify", name: "ContactVerify", port: 3008, description: "AI contact verification and data quality — a complete health profile for every contact, not just valid/invalid." },
  { id: "characterconsistency", name: "CharacterConsistency", port: 3009, description: "Locks a character's identity into a reusable prompt spec and checks every new generation for drift." },
  { id: "payrollaudit", name: "PayrollAudit", port: 3010, description: "Pre-disbursement payroll validation — salary, tax, and attendance errors caught before employees are paid." },
  { id: "transcriptionqa", name: "TranscriptionQA", port: 3011, description: "AI transcript accuracy and QA — domain terminology and speaker-attribution errors caught before publishing." },
  { id: "schemalint", name: "SchemaLint", port: 3012, description: "AI database schema intelligence — missing indexes, missing keys, and naming drift, with specific fixes." },
];

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Reads the product's most recent commit — purely local `git log`, no network call. */
function getGitHealth(productId) {
  const productDir = path.join(REPO_ROOT, "products", productId);
  try {
    const format = execFileSync("git", ["log", "-1", "--format=%h%x1f%s%x1f%cr", "--", "."], { cwd: productDir, encoding: "utf8" }).trim();
    if (!format) return null;
    const [hash, message, when] = format.split("\x1f");
    return { hash, message, when };
  } catch {
    return null;
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 900 }, (res) => {
      resolve(res.statusCode !== undefined && res.statusCode < 500);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function handleStatus(res) {
  const results = await Promise.all(
    PRODUCTS.map(async (p) => ({
      id: p.id,
      name: p.name,
      port: p.port,
      online: await checkPort(p.port),
      git: getGitHealth(p.id),
    })),
  );
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(results));
}

function handleDocs(res, id) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Unknown product.");
    return;
  }
  const docPath = path.join(REPO_ROOT, "products", id, "docs", "PRODUCT_IDENTITY.md");
  if (!existsSync(docPath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`No PRODUCT_IDENTITY.md found for ${product.name}.`);
    return;
  }
  const content = readFileSync(docPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(product.name)} — Product Identity</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 860px; margin: 2.5rem auto; padding: 0 1.5rem 4rem; line-height: 1.65; color: #1a1a1a; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 0.95rem; }
  a.back { display: inline-block; margin-bottom: 1.5rem; color: #0ea5e9; text-decoration: none; }
  a.back:hover { text-decoration: underline; }
  @media (prefers-color-scheme: dark) { body { background: #0b0f14; color: #e6edf3; } a.back { color: #7dd3fc; } }
</style>
</head>
<body>
<a class="back" href="/">&larr; Back to portfolio</a>
<pre>${escapeHtml(content)}</pre>
</body>
</html>`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (url.pathname === "/api/products") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(PRODUCTS));
    return;
  }

  if (url.pathname === "/api/status") {
    await handleStatus(res);
    return;
  }

  if (url.pathname.startsWith("/docs/")) {
    handleDocs(res, url.pathname.slice("/docs/".length));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found.");
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Founder OS portfolio launcher running at http://localhost:${PORT}`);
});
