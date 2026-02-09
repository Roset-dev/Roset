/**
 * Previous / Next page navigation rendered at the bottom of each documentation page.
 * Derives adjacent pages from the flat navigation list in `lib/navigation.ts`.
 *
 * @module components/pagination
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPageNavigation } from "@/lib/navigation";

/**
 * Renders "Previous" and "Next" links based on the current page's position
 * in the navigation order. Returns `null` when there are no adjacent pages.
 */
export function Pagination() {
  const pathname = usePathname();
  const { prev, next } = getPageNavigation(pathname);

  if (!prev && !next) return null;

  return (
    <nav aria-label="Page navigation" className="flex items-center justify-between border-t border-border pt-6 mt-12">
      {prev ? (
        <Link href={prev.href} className="group flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors no-underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{prev.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="group flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors no-underline ml-auto">
          <span>{next.label}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
