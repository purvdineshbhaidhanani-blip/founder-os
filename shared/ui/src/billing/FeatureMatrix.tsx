import { cn } from "../utils/cn.js";
import type { PlanCode } from "./PlanBadge.js";

export interface FeatureMatrixRow {
  /** Human-readable feature name, e.g. "AI CFO Copilot" — not the internal entitlement key. */
  label: string;
  /** Value shown per plan column — true/false render as a check/dash, a string renders verbatim (e.g. "10 credits/mo"). */
  values: Partial<Record<PlanCode, boolean | string>>;
}

export interface FeatureMatrixProps {
  plans: { code: PlanCode; name: string }[];
  rows: FeatureMatrixRow[];
  className?: string;
}

function Cell({ value }: { value: boolean | string | undefined }) {
  if (value === undefined || value === false) {
    return (
      <span className="fos-feature-matrix-dash" aria-label="Not included">
        —
      </span>
    );
  }
  if (value === true) {
    return (
      <span className="fos-feature-matrix-check" aria-label="Included">
        ✓
      </span>
    );
  }
  return <span className="fos-feature-matrix-value">{value}</span>;
}

/**
 * Full feature-by-plan comparison table for the pricing page, built as a
 * plain semantic `<table>` rather than reusing `DataTable` — a comparison
 * grid's shape (feature rows × fixed plan columns, no sorting/pagination/
 * row-click) doesn't fit `DataTable`'s row-oriented, paginated data-grid
 * contract, so a dedicated lightweight table avoids forcing a mismatched
 * abstraction. Still shares the same design tokens/CSS conventions as
 * `DataTable` (`fos-data-table` base classes) so it doesn't look bespoke.
 */
export function FeatureMatrix({ plans, rows, className }: FeatureMatrixProps) {
  return (
    <div className={cn("fos-data-table-wrapper", className)}>
      <table className="fos-data-table fos-feature-matrix">
        <thead>
          <tr>
            <th className="fos-data-table-th fos-feature-matrix-label-col">Feature</th>
            {plans.map((plan) => (
              <th key={plan.code} className="fos-data-table-th fos-feature-matrix-plan-col">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="fos-data-table-td fos-feature-matrix-label-col">{row.label}</td>
              {plans.map((plan) => (
                <td key={plan.code} className="fos-data-table-td fos-feature-matrix-plan-col">
                  <Cell value={row.values[plan.code]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
