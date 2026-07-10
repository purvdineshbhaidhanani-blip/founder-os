"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn.js";

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface GlobalSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: GlobalSearchResult[];
  isLoading?: boolean;
  placeholder?: string;
  /** Keyboard shortcut key that opens the palette (with Cmd/Ctrl), per frameworks/06-dashboard-framework.md. Defaults to "k". */
  shortcutKey?: string;
}

/**
 * Global, keyboard-accessible (Cmd/Ctrl+K) command palette scoped to the
 * user's permitted data, per frameworks/06-dashboard-framework.md item 6.
 */
export function GlobalSearch({ query, onQueryChange, results, isLoading = false, placeholder = "Search everything…", shortcutKey = "k" }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === shortcutKey) {
        event.preventDefault();
        setIsOpen(true);
      } else if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [isOpen, shortcutKey]);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      inputRef.current?.focus();
      setActiveIndex(0);
    } else {
      previouslyFocused.current?.focus();
    }
  }, [isOpen]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      const selected = results[activeIndex];
      if (selected) {
        selected.onSelect();
        setIsOpen(false);
      }
    }
  }

  return (
    <>
      <button type="button" className="fos-global-search-trigger" onClick={() => setIsOpen(true)}>
        <span className="fos-global-search-trigger-label">{placeholder}</span>
        <kbd className="fos-global-search-kbd">⌘{shortcutKey.toUpperCase()}</kbd>
      </button>

      {isOpen &&
        createPortal(
          <div className="fos-global-search-overlay" onClick={() => setIsOpen(false)}>
            <div
              className="fos-global-search-panel"
              role="combobox"
              aria-expanded="true"
              aria-owns="fos-global-search-listbox"
              aria-haspopup="listbox"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                ref={inputRef}
                type="text"
                role="searchbox"
                aria-label="Search"
                aria-controls="fos-global-search-listbox"
                aria-activedescendant={results[activeIndex] ? `fos-global-search-option-${results[activeIndex].id}` : undefined}
                className="fos-global-search-input"
                placeholder={placeholder}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              <ul id="fos-global-search-listbox" role="listbox" className="fos-global-search-results">
                {isLoading && <li className="fos-global-search-status">Searching…</li>}
                {!isLoading && results.length === 0 && query.length > 0 && (
                  <li className="fos-global-search-status">No results for &ldquo;{query}&rdquo;</li>
                )}
                {!isLoading &&
                  results.map((result, index) => (
                    <li
                      key={result.id}
                      id={`fos-global-search-option-${result.id}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={cn("fos-global-search-result", index === activeIndex && "fos-global-search-result-active")}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        result.onSelect();
                        setIsOpen(false);
                      }}
                    >
                      {result.icon && (
                        <span className="fos-global-search-result-icon" aria-hidden="true">
                          {result.icon}
                        </span>
                      )}
                      <span className="fos-global-search-result-text">
                        <span className="fos-global-search-result-title">{result.title}</span>
                        {result.subtitle && <span className="fos-global-search-result-subtitle">{result.subtitle}</span>}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
