/**
 * Table of contents sidebar for documentation pages.
 * Automatically extracts `<h2>` and `<h3>` headings from the rendered article,
 * displays numbered step indicators for top-level headings, and highlights
 * the currently visible section via scroll-position tracking.
 *
 * @module components/toc
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Represents a single heading extracted from the page content. */
interface TocItem {
  /** The heading's HTML `id` attribute, used for anchor links. */
  id: string;
  /** The visible heading text (stripped of trailing `#` anchors). */
  text: string;
  /** Heading depth (2 for `<h2>`, 3 for `<h3>`). */
  level: number;
}

/**
 * Sticky table of contents that lists page headings with scroll-spy highlighting.
 * Scans the nearest `<article>` element for `h2` and `h3` tags on each navigation.
 * Returns `null` when no headings are found.
 */
export function TableOfContents() {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const elements = article.querySelectorAll("h2, h3");
    const items: TocItem[] = Array.from(elements)
      .filter((el) => el.id)
      .map((el) => ({
        id: el.id,
        text: (el.textContent || "").replace(/\s*#\s*$/, ""),
        level: parseInt(el.tagName[1]),
      }));
    setHeadings(items);
    setActiveId("");
  }, [pathname]);

  useEffect(() => {
    if (headings.length === 0) return;

    const threshold = 120;

    function update() {
      // Find the last heading that has scrolled past the threshold
      let currentId = headings[0].id;
      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) {
          currentId = id;
        }
      }

      // Near bottom of page: headings that can't reach the threshold
      // should still highlight when they're visible in the viewport
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 100;
      if (atBottom) {
        for (let i = headings.length - 1; i >= 0; i--) {
          const el = document.getElementById(headings[i].id);
          if (el && el.getBoundingClientRect().top < window.innerHeight * 0.8) {
            currentId = headings[i].id;
            break;
          }
        }
      }

      setActiveId(currentId);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [headings]);

  if (headings.length === 0) return null;

  // Number only h2s (top-level items)
  let stepCounter = 0;

  return (
    <nav aria-label="Table of contents">
      <ul className="flex flex-col list-none p-0 m-0">
        {headings.map((h, i) => {
          const isActive = activeId === h.id;
          const isTopLevel = h.level === 2;
          if (isTopLevel) stepCounter++;
          const stepNumber = isTopLevel ? stepCounter : null;
          const isLast = i === headings.length - 1 ||
            (isTopLevel && headings.slice(i + 1).every((next) => next.level > 2 || headings.indexOf(next) === i));

          return (
            <li key={h.id} className="relative">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-[9px] top-[26px] bottom-0 w-px bg-border pointer-events-none" />
              )}
              <a
                href={`#${h.id}`}
                className={`group flex items-center gap-3 py-[7px] text-[13px] leading-snug transition-colors no-underline ${
                  h.level === 3 ? "pl-[26px]" : ""
                } ${
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {/* Step indicator */}
                {isTopLevel && (
                  <span
                    className={`relative z-10 flex items-center justify-center size-[20px] rounded-full text-[10px] font-semibold shrink-0 transition-colors ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-surface-elevated text-subtle border border-border"
                    }`}
                  >
                    {stepNumber}
                  </span>
                )}
                {/* Nested dot */}
                {!isTopLevel && (
                  <span
                    className={`relative z-10 size-[5px] rounded-full shrink-0 transition-colors ${
                      isActive ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
                <span className={isActive ? "font-medium" : ""}>
                  {h.text}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
