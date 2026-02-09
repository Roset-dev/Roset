/**
 * Styled navigation link card for documentation pages.
 * Renders as a bordered row with title, optional description, and a right-arrow indicator.
 * Used in MDX to highlight important cross-references (e.g., "Next: Read the API Reference").
 *
 * @module components/link-card
 */
import Link from "next/link";

/** Props for the {@link LinkCard} component. */
interface LinkCardProps {
  /** Destination URL (internal or external). */
  href: string;
  /** Primary link text displayed in bold. */
  title: string;
  /** Optional secondary text shown below the title. */
  description?: string;
}

/**
 * A full-width card-style link with hover effects and a chevron indicator.
 * Wraps a Next.js `Link` for client-side navigation.
 */
export function LinkCard({ href, title, description }: LinkCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-border p-4 my-4 no-underline transition-all hover:border-primary/30 hover:bg-surface"
    >
      <div className="min-w-0">
        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </span>
        {description && (
          <p className="text-sm text-muted mt-1 mb-0 leading-relaxed">{description}</p>
        )}
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
