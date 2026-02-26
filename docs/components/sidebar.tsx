/**
 * Desktop sidebar navigation for the documentation site.
 * Renders the full navigation tree defined in `lib/navigation.ts` with
 * collapsible groups, active-page highlighting, and scroll-into-view behavior.
 * Visible only on large (lg+) screens; mobile uses {@link MobileSidebarToggle}.
 *
 * @module components/sidebar
 */
"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  navigation,
  isGroup,
  flattenNavItems,
  type NavGroup,
} from "@/lib/navigation";

/**
 * Checks whether any leaf page inside a navigation group matches the given pathname.
 *
 * @param group - The navigation group to search.
 * @param pathname - The current URL pathname.
 * @returns `true` if the group contains the active page.
 */
function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return flattenNavItems(group.items).some((item) => item.href === pathname);
}

/**
 * Primary desktop sidebar that renders the documentation navigation tree.
 * Automatically scrolls the active link into view on route changes.
 */
export function Sidebar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Scroll active item into view on page load/navigation
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector("[data-active='true']");
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [pathname]);

  return (
    <nav ref={navRef} aria-label="Sidebar" className="flex flex-col text-sm">
      {navigation.map((entry) =>
        isGroup(entry) ? (
          <SidebarGroup key={entry.label} group={entry} pathname={pathname} />
        ) : (
          <SidebarLink
            key={entry.href}
            href={entry.href}
            label={entry.label}
            active={pathname === entry.href}
          />
        )
      )}
    </nav>
  );
}

/**
 * Collapsible group section within the sidebar.
 * Auto-expands when the group contains the current page or when `defaultOpen` is set.
 *
 * @param props.group - Navigation group definition with label and child items.
 * @param props.pathname - Current URL pathname for active-state detection.
 */
function SidebarGroup({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const hasActivePage = groupContainsPath(group, pathname);
  const [open, setOpen] = useState(hasActivePage || group.defaultOpen !== false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center justify-between w-full pl-2 pr-2 py-[7px] text-sm transition-colors cursor-pointer rounded-md ${
          hasActivePage
            ? "font-medium text-foreground bg-surface-elevated"
            : "text-muted hover:text-foreground"
        }`}
      >
        {group.label}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-4 shrink-0 transition-transform duration-200 text-subtle ${
            open ? "" : "-rotate-90"
          }`}
        >
          <path d="M4.75 6.75L8 10.25L11.25 6.75" />
        </svg>
      </button>
      {open && (
        <div className="relative">
          {/* Vertical connector bar */}
          <div className="absolute left-[10px] top-[7px] bottom-[7px] w-px bg-border pointer-events-none" />
          {group.items.map((item) =>
            isGroup(item) ? (
              <SidebarGroup
                key={item.label}
                group={item}
                pathname={pathname}
              />
            ) : (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname === item.href}
                nested
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual navigation link within the sidebar.
 * Highlights when active and shows a vertical indicator bar for nested items.
 *
 * @param props.href - Destination URL.
 * @param props.label - Display text for the link.
 * @param props.active - Whether this link matches the current page.
 * @param props.nested - Whether the link is inside a group (adds left indentation).
 */
function SidebarLink({
  href,
  label,
  active,
  nested = false,
}: {
  href: string;
  label: string;
  active: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      data-active={active || undefined}
      className={`relative block py-[7px] pr-2 rounded-md transition-colors no-underline text-sm ${
        nested ? "pl-7" : "pl-2"
      } ${
        active
          ? "font-medium text-foreground bg-surface-elevated"
          : "text-muted hover:text-foreground hover:bg-sidebar-hover"
      }`}
    >
      {/* Active indicator bar — overlays the connector bar */}
      {active && nested && (
        <span className="absolute left-[10px] top-px bottom-px w-px bg-foreground z-10" />
      )}
      {label}
    </Link>
  );
}
