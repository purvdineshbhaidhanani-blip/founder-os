import { Select, type SelectOption } from "../primitives/Select.js";
import { Button } from "../primitives/Button.js";
import { cn } from "../utils/cn.js";

export interface DateRangeValue {
  from: string;
  to: string;
}

export interface FilterBarSelectDefinition {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  dateRange?: DateRangeValue;
  onDateRangeChange?: (value: DateRangeValue) => void;
  selects?: FilterBarSelectDefinition[];
  onClear?: () => void;
  className?: string;
}

/**
 * Scope controls that apply consistently across KPIs, charts, and the
 * activity feed, per frameworks/06-dashboard-framework.md. Kept to native
 * inputs (date, select) so it composes with any product's own filter set
 * without a bespoke date-picker dependency.
 */
export function FilterBar({ dateRange, onDateRangeChange, selects = [], onClear, className }: FilterBarProps) {
  return (
    <div className={cn("fos-filter-bar", className)} role="group" aria-label="Filters">
      {dateRange && onDateRangeChange && (
        <div className="fos-filter-bar-date-range">
          <label className="fos-filter-bar-date-label">
            <span className="fos-sr-only">From date</span>
            <input
              type="date"
              className="fos-input fos-filter-bar-date-input"
              value={dateRange.from}
              onChange={(event) => onDateRangeChange({ ...dateRange, from: event.target.value })}
            />
          </label>
          <span className="fos-filter-bar-date-separator" aria-hidden="true">
            &ndash;
          </span>
          <label className="fos-filter-bar-date-label">
            <span className="fos-sr-only">To date</span>
            <input
              type="date"
              className="fos-input fos-filter-bar-date-input"
              value={dateRange.to}
              onChange={(event) => onDateRangeChange({ ...dateRange, to: event.target.value })}
            />
          </label>
        </div>
      )}

      {selects.map((select) => (
        <div key={select.key} className="fos-filter-bar-select">
          <Select
            label={select.label}
            hideLabel
            value={select.value}
            options={select.options}
            onChange={(event) => select.onChange(event.target.value)}
          />
        </div>
      ))}

      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
