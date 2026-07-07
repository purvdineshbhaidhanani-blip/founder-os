import type { ValidationIssue, ValidationResult } from "@platform/shared";

export interface EnvVarSpec {
  key: string;
  required?: boolean;
  default?: string;
  description?: string;
  /** Marks the value as sensitive — never included when rendering example output values. */
  secret?: boolean;
}

export interface EnvironmentConfigOptions {
  vars: EnvVarSpec[];
  /** Defaults to `process.env`. Injectable for tests and non-Node runtimes. */
  source?: Record<string, string | undefined>;
}

/**
 * Schema-driven environment configuration: declare what variables a product
 * needs, then validate the actual environment against that declaration and
 * generate a matching `.env.example`. No product ever reads `process.env`
 * ad hoc — it goes through a declared, validated spec.
 */
export class EnvironmentConfig {
  private readonly vars: EnvVarSpec[];
  private readonly source: Record<string, string | undefined>;

  constructor(options: EnvironmentConfigOptions) {
    this.vars = options.vars;
    this.source = options.source ?? process.env;
  }

  get(key: string): string | undefined {
    const spec = this.vars.find((v) => v.key === key);
    return this.source[key] ?? spec?.default;
  }

  validate(): ValidationResult<Record<string, string>> {
    const issues: ValidationIssue[] = [];
    const resolved: Record<string, string> = {};

    for (const spec of this.vars) {
      const value = this.source[spec.key] ?? spec.default;
      if (value === undefined) {
        if (spec.required) {
          issues.push({ path: spec.key, message: `Required environment variable "${spec.key}" is not set.` });
        }
        continue;
      }
      resolved[spec.key] = value;
    }

    if (issues.length > 0) return { valid: false, issues };
    return { valid: true, value: resolved };
  }

  /** Renders a `.env.example` file: every declared var, defaults shown, secrets left blank. */
  toEnvExample(): string {
    return this.vars
      .map((spec) => {
        const comment = spec.description ? `# ${spec.description}\n` : "";
        const requiredNote = spec.required ? " (required)" : "";
        const value = spec.secret ? "" : (spec.default ?? "");
        return `${comment}# ${spec.key}${requiredNote}\n${spec.key}=${value}`;
      })
      .join("\n\n");
  }
}
