/**
 * Mobile-responsive sidebar drawer for documentation navigation.
 * Renders a hamburger/close toggle button (visible below `lg` breakpoint) and
 * a slide-in drawer containing the site title and full {@link Sidebar} navigation.
 * Locks body scroll while the drawer is open.
 *
 * @module components/mobile-sidebar
 */
"use client";

import { useState, useEffect } from "react";
import { SiteTitle } from "./site-title";
import { Sidebar } from "./sidebar";

/**
 * Hamburger toggle button and slide-in sidebar drawer for mobile viewports.
 * Hidden on desktop (lg+). Includes a backdrop overlay and body scroll lock.
 */
export function MobileSidebarToggle() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
        aria-expanded={open}
        className="lg:hidden p-2 rounded-md text-subtle hover:text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 lg:hidden transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-[280px] bg-surface border-r border-border z-[60] lg:hidden flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
          <SiteTitle />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-8">
          <Sidebar />
        </div>
      </div>
    </>
  );
}
