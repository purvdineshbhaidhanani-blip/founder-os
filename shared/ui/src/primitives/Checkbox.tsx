"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn.js";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, className, ...props }, ref) => {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className="fos-checkbox-field">
      <input ref={ref} type="checkbox" id={checkboxId} className={cn("fos-checkbox", className)} {...props} />
      <label htmlFor={checkboxId} className="fos-checkbox-label">
        {label}
      </label>
    </div>
  );
});
Checkbox.displayName = "Checkbox";
