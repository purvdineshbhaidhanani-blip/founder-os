import { describe, expect, it } from "vitest";
import { computeHealthScore, scanFile, scanFiles } from "../../lib/services/scanner.js";

describe("scanFile", () => {
  it("detects SQL injection via string concatenation", () => {
    const findings = scanFile({ path: "db.js", content: 'db.query("SELECT * FROM users WHERE id = " + userId);' });
    expect(findings.some((f) => f.ruleId === "sql-injection-concat")).toBe(true);
  });

  it("does not flag a parameterized query", () => {
    const findings = scanFile({ path: "db.js", content: 'db.query("SELECT * FROM users WHERE id = ?", [userId]);' });
    expect(findings.some((f) => f.ruleId === "sql-injection-concat")).toBe(false);
  });

  it("detects a hardcoded AWS access key", () => {
    const findings = scanFile({ path: "config.js", content: 'const key = "AKIAIOSFODNN7EXAMPLE";' });
    expect(findings.some((f) => f.ruleId === "hardcoded-aws-key")).toBe(true);
    expect(findings[0]?.severity).toBe("critical");
  });

  it("detects a hardcoded secret assignment", () => {
    const findings = scanFile({ path: "config.py", content: 'api_key = "sk_live_abc123def456"' });
    expect(findings.some((f) => f.ruleId === "hardcoded-secret-assignment")).toBe(true);
  });

  it("does not flag an empty or env-sourced secret assignment", () => {
    const findings = scanFile({ path: "config.py", content: "api_key = os.environ['API_KEY']" });
    expect(findings.some((f) => f.ruleId === "hardcoded-secret-assignment")).toBe(false);
  });

  it("detects eval usage", () => {
    const findings = scanFile({ path: "app.js", content: "const result = eval(userInput);" });
    expect(findings.some((f) => f.ruleId === "eval-usage")).toBe(true);
  });

  it("detects weak crypto hashing", () => {
    const findings = scanFile({ path: "auth.py", content: "password_hash = md5(password).hexdigest()" });
    expect(findings.some((f) => f.ruleId === "weak-crypto-hash")).toBe(true);
  });

  it("detects insecure deserialization", () => {
    const findings = scanFile({ path: "app.py", content: "obj = pickle.loads(request.data)" });
    expect(findings.some((f) => f.ruleId === "insecure-deserialization")).toBe(true);
  });

  it("detects DOM XSS via innerHTML", () => {
    const findings = scanFile({ path: "app.js", content: "el.innerHTML = userComment;" });
    expect(findings.some((f) => f.ruleId === "xss-inner-html")).toBe(true);
  });

  it("detects leftover debug statements and TODO comments as quality findings", () => {
    const findings = scanFile({ path: "app.js", content: "console.log(user);\n// TODO: remove this before ship" });
    expect(findings.some((f) => f.ruleId === "console-debug-statement")).toBe(true);
    expect(findings.some((f) => f.ruleId === "todo-comment")).toBe(true);
    expect(findings.every((f) => f.category === "quality")).toBe(true);
  });

  it("reports correct 1-indexed line numbers", () => {
    const findings = scanFile({ path: "app.js", content: "const a = 1;\nconst b = 2;\neval(b);" });
    const finding = findings.find((f) => f.ruleId === "eval-usage");
    expect(finding?.line).toBe(3);
  });

  it("returns no findings for clean code", () => {
    const findings = scanFile({ path: "clean.js", content: "export function add(a, b) {\n  return a + b;\n}" });
    expect(findings).toHaveLength(0);
  });
});

describe("scanFiles", () => {
  it("aggregates findings across multiple files", () => {
    const findings = scanFiles([
      { path: "a.js", content: "eval(x);" },
      { path: "b.js", content: 'const key = "AKIAIOSFODNN7EXAMPLE";' },
    ]);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.filePath).sort()).toEqual(["a.js", "b.js"]);
  });
});

describe("computeHealthScore", () => {
  it("returns 100 for no findings", () => {
    expect(computeHealthScore([])).toBe(100);
  });

  it("deducts severity-weighted penalties", () => {
    expect(computeHealthScore([{ severity: "critical" }, { severity: "low" }])).toBe(100 - 25 - 1);
  });

  it("floors at 0 for many severe findings", () => {
    const findings = Array.from({ length: 10 }, () => ({ severity: "critical" as const }));
    expect(computeHealthScore(findings)).toBe(0);
  });
});
