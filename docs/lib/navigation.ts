/**
 * Navigation structure and helper utilities for the documentation site.
 * Defines the sidebar tree, and provides functions for breadcrumb generation,
 * page-level prev/next navigation, flat list extraction, and GitHub edit URLs.
 *
 * This module is imported by the sidebar, breadcrumbs, pagination, and edit-link components.
 *
 * @module lib/navigation
 */

/** A leaf navigation item that links to a single documentation page. */
export interface NavItem {
  /** Display text shown in the sidebar and breadcrumbs. */
  label: string;
  /** URL path for the page (e.g., `/docs/start/quickstart`). */
  href: string;
}

/** A collapsible group of navigation entries (may contain nested groups or items). */
export interface NavGroup {
  /** Group heading displayed as a toggle button in the sidebar. */
  label: string;
  /** Whether the group starts expanded. Defaults to `true` when omitted. */
  defaultOpen?: boolean;
  /** Child entries (leaf items or nested groups). */
  items: NavEntry[];
}

/** A navigation entry is either a leaf {@link NavItem} or a collapsible {@link NavGroup}. */
export type NavEntry = NavGroup | NavItem;

/**
 * The complete navigation tree for the documentation site.
 * Drives the sidebar, breadcrumbs, pagination, and search index generation.
 */
export const navigation: NavEntry[] = [
  {
    label: "Getting Started",
    defaultOpen: true,
    items: [
      { label: "Quickstart", href: "/docs/start/quickstart" },
      { label: "Installation", href: "/docs/start/installation" },
      { label: "Authentication", href: "/docs/start/authentication" },
    ],
  },
  {
    label: "Guides",
    defaultOpen: true,
    items: [
      { label: "Storage Connections", href: "/docs/guides/connections" },
      { label: "Webhooks", href: "/docs/guides/webhooks" },
      { label: "Search", href: "/docs/guides/search" },
      { label: "Q&A", href: "/docs/guides/qa" },
    ],
  },
  {
    label: "SDKs",
    defaultOpen: true,
    items: [
      { label: "TypeScript", href: "/docs/sdks/typescript" },
    ],
  },
  {
    label: "Reference",
    defaultOpen: true,
    items: [
      { label: "REST API", href: "/docs/reference/api" },
    ],
  },
  { label: "Changelog", href: "/docs/changelog" },
];

/**
 * Type guard that narrows a {@link NavEntry} to a {@link NavGroup}.
 *
 * @param entry - The navigation entry to check.
 * @returns `true` if the entry is a group (has an `items` array).
 */
export function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

/**
 * Recursively flattens a navigation tree into a linear list of leaf items.
 * Used by pagination and sidebar active-page detection.
 *
 * @param entries - Array of navigation entries (groups and/or items).
 * @returns Flat array of {@link NavItem} leaves in document order.
 */
export function flattenNavItems(entries: NavEntry[]): NavItem[] {
  const result: NavItem[] = [];
  for (const entry of entries) {
    if (isGroup(entry)) {
      result.push(...flattenNavItems(entry.items));
    } else {
      result.push(entry);
    }
  }
  return result;
}

/**
 * Returns the current, previous, and next pages relative to the given pathname.
 * Powers the {@link Pagination} component at the bottom of each doc page.
 *
 * @param pathname - The current URL pathname.
 * @returns An object with `current`, `prev`, and `next` (each `NavItem | null`).
 */
export function getPageNavigation(pathname: string): {
  current: NavItem | null;
  prev: NavItem | null;
  next: NavItem | null;
} {
  const flat = flattenNavItems(navigation);
  const index = flat.findIndex((item) => item.href === pathname);
  if (index === -1) return { current: null, prev: null, next: null };
  return {
    current: flat[index],
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}

/**
 * Builds an ordered breadcrumb trail from the docs root to the current page.
 * Walks the navigation tree to find the matching leaf and collects group labels along the way.
 *
 * @param pathname - The current URL pathname.
 * @returns Array of {@link NavItem} from `Docs` (root) down to the current page.
 */
export function getBreadcrumbs(pathname: string): NavItem[] {
  const crumbs: NavItem[] = [{ label: "Docs", href: "/docs" }];

  function search(entries: NavEntry[], trail: NavItem[]): boolean {
    for (const entry of entries) {
      if (isGroup(entry)) {
        if (search(entry.items, [...trail, { label: entry.label, href: "" }])) {
          return true;
        }
      } else if (entry.href === pathname) {
        // Add group labels from the trail (skip empty hrefs that are just group headers)
        crumbs.push(...trail.filter((t) => t.label));
        crumbs.push(entry);
        return true;
      }
    }
    return false;
  }

  search(navigation, []);
  return crumbs;
}

/** Base URL for the documentation source files on GitHub. */
const GITHUB_REPO = "https://github.com/rosetdata/roset/tree/main/docs";

/**
 * Converts a documentation pathname to its corresponding GitHub source file URL.
 * Used by the {@link EditLink} component to generate "Edit this page" links.
 *
 * @param pathname - The current URL pathname (e.g., `/docs/start/quickstart`).
 * @returns Full GitHub URL pointing to the page's `.mdx` source file.
 */
export function getGitHubEditUrl(pathname: string): string {
  // /docs -> app/docs/page.mdx
  // /docs/start -> app/docs/start/page.mdx
  const path = pathname === "/docs" ? "/docs" : pathname;
  return `${GITHUB_REPO}/app${path}/page.mdx`;
}
