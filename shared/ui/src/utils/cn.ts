import clsx, { type ClassValue } from "clsx";

/** Every component composes class names through this — never string concatenation, which silently drops conditional classes and duplicate-space bugs. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
