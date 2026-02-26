/**
 * Navigation breadcrumb trail for documentation pages.
 * Rendered at the top of each doc page to show the current location within
 * the navigation hierarchy (e.g., Docs > Getting Started > Quickstart).
 *
 * @module components/breadcrumbs
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBreadcrumbs } from "@/lib/navigation";

/**
 * Renders a horizontal breadcrumb trail based on the current pathname.
 * Automatically derives crumbs from the navigation structure defined in `lib/navigation.ts`.
 * Hidden when at the top-level `/docs` route (single crumb).
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  // Hide when at top level (/docs)
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-subtle mb-6">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-border">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            {isLast || !crumb.href ? (
              <span className={isLast ? "text-foreground font-medium" : ""}>{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground transition-colors no-underline text-subtle">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
