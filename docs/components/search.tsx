/**
 * Full-text search components for the documentation site.
 * Includes a trigger button (visible in the header) and a modal dialog with
 * keyboard navigation, lazy-loaded search index, and highlighted results.
 *
 * The search index is a static JSON file (`/search-index.json`) generated at build time.
 *
 * @module components/search
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/** A heading-delimited section within a documentation page. */
interface SearchSection {
  /** Section heading text, or `null` for the preamble before the first heading. */
  heading: string | null;
  /** Anchor ID for deep-linking, or `null` if no heading. */
  id: string | null;
  /** Plain-text body content of the section (used for substring matching). */
  content: string;
}

/** A single documentation page in the search index. */
interface SearchPage {
  /** URL path of the page (e.g., `/docs/start/quickstart`). */
  href: string;
  /** Page title extracted from frontmatter or the first `<h1>`. */
  title: string;
  /** Content sections split by headings for granular search results. */
  sections: SearchSection[];
}

/** A ranked search result returned to the UI. */
interface SearchResult {
  /** URL to navigate to, optionally including a `#fragment`. */
  href: string;
  /** Page title for display in the result list. */
  title: string;
  /** Matched section heading, if the match was within a section. */
  section?: string;
  /** Anchor ID of the matched section. */
  sectionId?: string;
  /** Relevance score (3 = title match, 2 = heading match, 1 = content match). */
  score: number;
  /** Text excerpt surrounding the match for preview display. */
  matchContext: string;
}

/**
 * Compact search button rendered in the site header.
 * Dispatches a custom `"open-search"` event to open the {@link SearchDialog}.
 */
export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("open-search"))}
      className="hidden sm:flex items-center gap-2 w-72 px-3 py-1.5 text-sm text-subtle border border-border rounded-lg hover:border-primary/30 hover:text-foreground transition-colors cursor-pointer bg-transparent"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span>Search...</span>
      <kbd className="ml-auto text-[0.6875rem] text-subtle border border-border rounded px-1.5 py-0.5 font-mono">
        ⌘K
      </kbd>
    </button>
  );
}

/**
 * Modal search dialog opened by `Cmd+K` or the {@link SearchTrigger} button.
 * Lazily loads the search index on first open, performs client-side substring matching,
 * and supports keyboard navigation (arrow keys, Enter, Escape).
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [index, setIndex] = useState<SearchPage[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load index lazily on first open
  const loadIndex = useCallback(async () => {
    if (index) return;
    try {
      const res = await fetch("/search-index.json");
      const data = await res.json();
      setIndex(data);
    } catch {
      setIndex([]);
    }
  }, [index]);

  // Open/close handlers
  const openDialog = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    loadIndex();
  }, [loadIndex]);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Listen for custom event and keyboard shortcut
  useEffect(() => {
    const handleOpen = () => openDialog();
    window.addEventListener("open-search", handleOpen);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          closeDialog();
        } else {
          openDialog();
        }
      }
      if (e.key === "Escape" && open) {
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-search", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, openDialog, closeDialog]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Search
  useEffect(() => {
    if (!index || !query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const q = query.toLowerCase().trim();
    const matched: SearchResult[] = [];

    for (const page of index) {
      // Title match
      if (page.title.toLowerCase().includes(q)) {
        matched.push({
          href: page.href,
          title: page.title,
          score: 3,
          matchContext: page.title,
        });
        continue;
      }

      // Section matches
      let pageAdded = false;
      for (const section of page.sections) {
        if (!pageAdded && section.heading?.toLowerCase().includes(q)) {
          matched.push({
            href: page.href + (section.id ? `#${section.id}` : ""),
            title: page.title,
            section: section.heading,
            sectionId: section.id ?? undefined,
            score: 2,
            matchContext: section.heading,
          });
          pageAdded = true;
        } else if (!pageAdded && section.content.toLowerCase().includes(q)) {
          // Extract context around match
          const idx = section.content.toLowerCase().indexOf(q);
          const start = Math.max(0, idx - 40);
          const end = Math.min(section.content.length, idx + q.length + 40);
          const context = (start > 0 ? "..." : "") + section.content.slice(start, end) + (end < section.content.length ? "..." : "");
          matched.push({
            href: page.href + (section.id ? `#${section.id}` : ""),
            title: page.title,
            section: section.heading ?? undefined,
            sectionId: section.id ?? undefined,
            score: 1,
            matchContext: context,
          });
          pageAdded = true;
        }
      }
    }

    matched.sort((a, b) => b.score - a.score);
    setResults(matched.slice(0, 10));
    setSelectedIndex(0);
  }, [query, index]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigateTo(results[selectedIndex].href);
    }
  };

  const navigateTo = (href: string) => {
    closeDialog();
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDialog} />

      {/* Dialog */}
      <div role="dialog" aria-modal="true" aria-label="Search documentation" className="relative w-full max-w-lg mx-4 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-subtle shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documentation..."
            className="flex-1 py-3.5 bg-transparent text-foreground text-sm outline-none focus-visible:outline-none placeholder:text-subtle"
          />
          <kbd className="text-[0.625rem] text-subtle border border-border rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-subtle">
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              results.map((result, i) => (
                <button
                  key={result.href + i}
                  onClick={() => navigateTo(result.href)}
                  className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 cursor-pointer transition-colors ${
                    i === selectedIndex
                      ? "bg-[rgba(77,163,255,0.1)]"
                      : "hover:bg-surface-elevated"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">
                    {result.title}
                    {result.section && (
                      <span className="text-subtle font-normal"> &rsaquo; {result.section}</span>
                    )}
                  </span>
                  <span className="text-xs text-muted line-clamp-1">
                    <HighlightMatch text={result.matchContext} query={query} />
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-[0.6875rem] text-subtle">
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1 py-0.5 font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1 py-0.5 font-mono">↵</kbd> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1 py-0.5 font-mono">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline text highlighter that wraps the first occurrence of `query` in a `<mark>` tag.
 * Used within search results to visually indicate the matching substring.
 *
 * @param props.text - The full text string to render.
 * @param props.query - The search query to highlight within `text`.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[rgba(77,163,255,0.2)] text-primary rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
