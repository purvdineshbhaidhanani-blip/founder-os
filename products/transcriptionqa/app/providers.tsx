"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@founder-os/ui/theme";
import { ToastProvider } from "@founder-os/ui/primitives";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
