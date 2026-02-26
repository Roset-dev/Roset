/**
 * Collapsible content section for documentation pages.
 * Used in MDX content to hide supplementary details behind a toggle.
 *
 * @module components/accordion
 */
"use client";

import { useState } from "react";

/** Props for the {@link Accordion} component. */
interface AccordionProps {
  /** Visible heading text displayed on the toggle button. */
  title: string;
  /** Whether the accordion is expanded on initial render. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Content revealed when the accordion is open. */
  children: React.ReactNode;
}

/**
 * A toggleable disclosure widget that shows or hides its children.
 * Renders a clickable header with a chevron indicator and animated expand/collapse.
 *
 * @example
 * ```mdx
 * <Accordion title="Advanced options">
 *   Additional configuration details here.
 * </Accordion>
 * ```
 */
export function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="my-4 rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-semibold text-foreground bg-surface hover:bg-surface-elevated transition-colors cursor-pointer"
      >
        {title}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-body border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}
