/**
 * "Edit this page on GitHub" link rendered at the bottom of each documentation page.
 * Derives the correct GitHub source file URL from the current pathname using
 * {@link getGitHubEditUrl} from `lib/navigation.ts`.
 *
 * @module components/edit-link
 */
"use client";

import { usePathname } from "next/navigation";
import { getGitHubEditUrl } from "@/lib/navigation";

/**
 * Renders an external link to edit the current page's MDX source on GitHub.
 * Opens in a new tab with `noopener noreferrer` for security.
 */
export function EditLink() {
  const pathname = usePathname();
  const url = getGitHubEditUrl(pathname);

  return (
    <div className="mt-12">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-primary transition-colors no-underline"
      >
        Edit this page on GitHub
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}
