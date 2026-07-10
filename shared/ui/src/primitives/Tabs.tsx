"use client";

import { createContext, useContext, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../utils/cn.js";

interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/** Controlled tabs — the consuming product owns `value` state, matching every other controlled-input pattern in this library rather than mixing controlled/uncontrolled modes. */
export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ activeValue: value, setActiveValue: onValueChange, baseId }}>
      <div className={cn("fos-tabs", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

function useTabsContext(componentName: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`<${componentName}> must be used within <Tabs>.`);
  return context;
}

export interface TabListProps {
  children: ReactNode;
  "aria-label": string;
}

/** Roving tabindex + arrow-key navigation per the WAI-ARIA Tabs pattern — only the active tab is in the natural Tab order. */
export function TabList({ children, "aria-label": ariaLabel }: TabListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      tabs[nextIndex]?.focus();
    }
  }

  return (
    <div ref={listRef} role="tablist" aria-label={ariaLabel} className="fos-tab-list" onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
}

export function Tab({ value, children }: TabProps) {
  const { activeValue, setActiveValue, baseId } = useTabsContext("Tab");
  const isActive = value === activeValue;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      className={cn("fos-tab", isActive && "fos-tab-active")}
      onClick={() => setActiveValue(value)}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
}

export function TabPanel({ value, children }: TabPanelProps) {
  const { activeValue, baseId } = useTabsContext("TabPanel");
  if (value !== activeValue) return null;

  return (
    <div role="tabpanel" id={`${baseId}-panel-${value}`} aria-labelledby={`${baseId}-tab-${value}`} tabIndex={0} className="fos-tab-panel">
      {children}
    </div>
  );
}
