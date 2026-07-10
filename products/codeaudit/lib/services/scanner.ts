export interface ScanFile {
  path: string;
  content: string;
}

export interface FindingCandidate {
  filePath: string;
  line: number;
  ruleId: string;
  category: "vulnerability" | "secret" | "quality" | "dependency";
  severity: "low" | "medium" | "high" | "critical";
  cwe?: string;
  title: string;
  description: string;
  snippet: string;
  effortMinutes: number;
}

interface Rule {
  id: string;
  category: FindingCandidate["category"];
  severity: FindingCandidate["severity"];
  cwe?: string;
  title: string;
  description: string;
  effortMinutes: number;
  pattern: RegExp;
}

/**
 * Regex-based static-analysis rule set per
 * products/codeaudit/docs/PRODUCT_IDENTITY.md §7 "Vulnerability
 * detection: OWASP Top 10 + CWE coverage" and "Code quality checks."
 * Deliberately pattern-based (not a full language parser/AST) — this is
 * the same class of technique real SAST linters use for their fast,
 * high-confidence rule tier, and it is genuinely testable and correct
 * for the patterns it targets, unlike a mocked/fake detector.
 */
const RULES: Rule[] = [
  {
    id: "sql-injection-concat",
    category: "vulnerability",
    severity: "critical",
    cwe: "CWE-89",
    title: "Potential SQL injection via string concatenation",
    description: "A SQL-like query is built by concatenating a variable directly into the query string instead of using parameterized queries.",
    effortMinutes: 30,
    pattern: /\b(query|execute)\s*\(\s*["'`][^"'`]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^"'`]*["'`]\s*\+/i,
  },
  {
    id: "hardcoded-aws-key",
    category: "secret",
    severity: "critical",
    cwe: "CWE-798",
    title: "Hardcoded AWS access key",
    description: "An AWS access key ID literal was found in source code. Secrets committed to source control are exposed to anyone with repository access and to the full git history forever.",
    effortMinutes: 15,
    pattern: /AKIA[0-9A-Z]{16}/,
  },
  {
    id: "hardcoded-secret-assignment",
    category: "secret",
    severity: "high",
    cwe: "CWE-798",
    title: "Hardcoded credential or API key",
    description: "A variable named like a secret (password, api_key, token, secret) is assigned a non-empty string literal directly in source code.",
    effortMinutes: 15,
    pattern: /\b(password|api_key|apikey|secret|token)\s*[:=]\s*["'][^"'\s]{6,}["']/i,
  },
  {
    id: "eval-usage",
    category: "vulnerability",
    severity: "high",
    cwe: "CWE-95",
    title: "Use of eval() / dynamic code execution",
    description: "eval() (or an equivalent dynamic code execution call) allows arbitrary code execution if any part of its input is influenced by untrusted data.",
    effortMinutes: 20,
    pattern: /\beval\s*\(/,
  },
  {
    id: "weak-crypto-hash",
    category: "vulnerability",
    severity: "medium",
    cwe: "CWE-327",
    title: "Use of a weak hashing algorithm",
    description: "MD5 and SHA1 are cryptographically broken for security-sensitive use (password hashing, signatures). Use a modern KDF (argon2, bcrypt, scrypt) or SHA-256+ as appropriate.",
    effortMinutes: 20,
    pattern: /\b(md5|sha1)\s*\(/i,
  },
  {
    id: "insecure-deserialization",
    category: "vulnerability",
    severity: "high",
    cwe: "CWE-502",
    title: "Insecure deserialization",
    description: "Deserializing untrusted data with pickle.loads or yaml.load (without SafeLoader) can lead to arbitrary code execution.",
    effortMinutes: 25,
    pattern: /\b(pickle\.loads|yaml\.load)\s*\(/,
  },
  {
    id: "xss-inner-html",
    category: "vulnerability",
    severity: "high",
    cwe: "CWE-79",
    title: "Potential DOM XSS via innerHTML assignment",
    description: "Assigning a non-literal value to innerHTML can execute attacker-controlled markup/script if the value is not sanitized.",
    effortMinutes: 20,
    pattern: /\.innerHTML\s*=\s*[a-zA-Z_$][\w$.]*/,
  },
  {
    id: "console-debug-statement",
    category: "quality",
    severity: "low",
    title: "Leftover debug statement",
    description: "A console.log / print debug statement was left in the code. These add noise, may leak sensitive runtime values, and should be removed before merge.",
    effortMinutes: 2,
    pattern: /\b(console\.log|print)\s*\(/,
  },
  {
    id: "todo-comment",
    category: "quality",
    severity: "low",
    title: "Unresolved TODO/FIXME comment",
    description: "An unresolved TODO or FIXME comment indicates known incomplete work or technical debt.",
    effortMinutes: 5,
    pattern: /\/\/\s*(TODO|FIXME)\b/,
  },
];

/** Scans a single file's content against every rule, line by line, returning one finding candidate per matching line per rule. */
export function scanFile(file: ScanFile): FindingCandidate[] {
  const findings: FindingCandidate[] = [];
  const lines = file.content.split("\n");

  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (rule.pattern.test(line)) {
        findings.push({
          filePath: file.path,
          line: i + 1,
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          cwe: rule.cwe,
          title: rule.title,
          description: rule.description,
          snippet: line.trim().slice(0, 300),
          effortMinutes: rule.effortMinutes,
        });
      }
    }
  }

  return findings;
}

/** Scans every file in a submitted batch. */
export function scanFiles(files: ScanFile[]): FindingCandidate[] {
  return files.flatMap((file) => scanFile(file));
}

const SEVERITY_WEIGHT: Record<FindingCandidate["severity"], number> = {
  critical: 25,
  high: 12,
  medium: 5,
  low: 1,
};

/**
 * Health score per products/codeaudit/docs/PRODUCT_IDENTITY.md §7
 * "Unified dashboard: Code health score per repo" — starts at 100,
 * deducts a severity-weighted penalty per open finding, floors at 0.
 */
export function computeHealthScore(findings: { severity: FindingCandidate["severity"] }[]): number {
  const penalty = findings.reduce((total, finding) => total + SEVERITY_WEIGHT[finding.severity], 0);
  return Math.max(0, 100 - penalty);
}
