import type { Skill } from "./types.js";

export interface SkillValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface SkillValidationReport {
  valid: boolean;
  issues: SkillValidationIssue[];
}

/** Validates a Skill record's shape before it can be promoted to "validated". */
export class SkillValidator {
  validate(skill: Skill): SkillValidationReport {
    const issues: SkillValidationIssue[] = [];
    if (!skill.name || skill.name.length < 2) {
      issues.push({ code: "INVALID_NAME", severity: "error", message: "name must be at least 2 chars" });
    }
    if (!/^\d+\.\d+\.\d+/.test(skill.version)) {
      issues.push({ code: "INVALID_VERSION", severity: "error", message: "version must be semver" });
    }
    if (skill.capabilities.length === 0) {
      issues.push({ code: "NO_CAPABILITIES", severity: "warning", message: "skill declares no capabilities" });
    }
    if (!skill.description || skill.description.length < 8) {
      issues.push({ code: "MISSING_DESCRIPTION", severity: "warning", message: "skill needs a meaningful description" });
    }
    return { valid: !issues.some((issue) => issue.severity === "error"), issues };
  }
}
