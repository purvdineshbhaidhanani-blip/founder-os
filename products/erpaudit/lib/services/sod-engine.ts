export interface RoleAssignmentCandidate {
  userIdentifier: string;
  permission: string;
}

export interface SodConflictPair {
  id: string;
  permissionA: string;
  permissionB: string;
  title: string;
  description: string;
  severity: "high" | "critical";
}

/**
 * Built-in library of common segregation-of-duties conflict pairs per
 * products/erpaudit/docs/PRODUCT_IDENTITY.md §2's example ("a user who
 * can both create a vendor and approve its payment") and §7 "Compliance
 * checker: ... common SoD conflicts." Each pair represents two
 * permissions that must never be held by the same person.
 */
export const SOD_CONFLICT_PAIRS: SodConflictPair[] = [
  {
    id: "vendor_create_approve_payment",
    permissionA: "create_vendor",
    permissionB: "approve_payment",
    title: "Vendor creation and payment approval held by the same user",
    description: "A user who can both create a vendor record and approve payments to vendors can create a fake vendor and pay it — the classic SoD violation regulators and auditors flag first.",
    severity: "critical",
  },
  {
    id: "po_create_approve",
    permissionA: "create_purchase_order",
    permissionB: "approve_purchase_order",
    title: "Purchase order creation and approval held by the same user",
    description: "A user who can both raise and approve their own purchase orders bypasses the spending control the approval step exists to enforce.",
    severity: "high",
  },
  {
    id: "employee_create_payroll_approve",
    permissionA: "create_employee",
    permissionB: "approve_payroll",
    title: "Employee record creation and payroll approval held by the same user",
    description: "A user who can both add employee records and approve payroll runs can create a ghost employee and approve their own pay.",
    severity: "critical",
  },
  {
    id: "gl_modify_post_journal",
    permissionA: "modify_gl_account",
    permissionB: "post_journal_entry",
    title: "General ledger configuration and journal posting held by the same user",
    description: "A user who can both modify GL account configuration and post journal entries can redirect postings to accounts they control undetected.",
    severity: "high",
  },
];

export interface SodViolation {
  ruleId: string;
  userIdentifier: string;
  title: string;
  description: string;
  severity: "high" | "critical";
}

/**
 * Detects segregation-of-duties violations per
 * products/erpaudit/docs/PRODUCT_IDENTITY.md §7 "Compliance checker" —
 * flags every user holding both permissions of any conflict pair.
 */
export function detectSodViolations(assignments: RoleAssignmentCandidate[]): SodViolation[] {
  const permissionsByUser = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const set = permissionsByUser.get(assignment.userIdentifier) ?? new Set<string>();
    set.add(assignment.permission);
    permissionsByUser.set(assignment.userIdentifier, set);
  }

  const violations: SodViolation[] = [];
  for (const [userIdentifier, permissions] of permissionsByUser) {
    for (const pair of SOD_CONFLICT_PAIRS) {
      if (permissions.has(pair.permissionA) && permissions.has(pair.permissionB)) {
        violations.push({
          ruleId: pair.id,
          userIdentifier,
          title: pair.title,
          description: `${pair.description} (user: ${userIdentifier})`,
          severity: pair.severity,
        });
      }
    }
  }

  return violations;
}
