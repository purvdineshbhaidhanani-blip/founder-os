import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** What the user picked — "system" means "follow OS preference." */
  preference: ThemePreference;
  /** What's actually applied right now, after resolving "system." */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "theme";

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Theme is controlled by a single root attribute (`data-theme`) per
 * standards/design-system.md, driven by: user override (persisted) → OS
 * preference → light default. Pair with `NO_FLASH_THEME_SCRIPT` in the
 * document head so the attribute is already correct before this component
 * mounts — this provider keeps it in sync after that, it doesn't own the
 * very first paint.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    preference === "system" ? resolveSystemTheme() : preference,
  );

  useEffect(() => {
    const applied = preference === "system" ? resolveSystemTheme() : preference;
    setResolvedTheme(applied);
    document.documentElement.setAttribute("data-theme", applied);
  }, [preference]);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const applied = resolveSystemTheme();
      setResolvedTheme(applied);
      document.documentElement.setAttribute("data-theme", applied);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    if (next === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  return <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme() must be called within a <ThemeProvider>.");
  return context;
}
