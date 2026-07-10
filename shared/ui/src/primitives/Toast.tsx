"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn.js";

export type ToastVariant = "default" | "success" | "warning" | "destructive";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 5000;

/**
 * `aria-live="polite"` per standards/design-system.md's "live regions for
 * async status changes" rule — screen readers announce new toasts without
 * interrupting whatever the user was doing, and destructive/error toasts
 * escalate to `assertive` since those need immediate attention.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="fos-toast-region">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="status"
                aria-live={toast.variant === "destructive" ? "assertive" : "polite"}
                className={cn("fos-toast", `fos-toast-${toast.variant}`)}
              >
                <p className="fos-toast-title">{toast.title}</p>
                {toast.description && <p className="fos-toast-description">{toast.description}</p>}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast() must be called within a <ToastProvider>.");
  return context;
}
