/**
 * Card and card grid components for documentation navigation.
 * Used in MDX to present groups of links (e.g., "Getting Started" sections)
 * as visually distinct, clickable tiles.
 *
 * @module components/cards
 */
import Link from "next/link";

/** Props for the {@link Card} component. */
interface CardProps {
  /** Card heading text. */
  title: string;
  /** Short description displayed below the title. */
  description?: string;
  /** Navigation URL; when provided, the entire card becomes a link. */
  href?: string;
  /** Optional icon rendered to the left of the title. */
  icon?: React.ReactNode;
  /** Additional body content rendered below the description. */
  children?: React.ReactNode;
}

/**
 * A bordered card with optional icon, description, and link behavior.
 * When `href` is provided the card wraps in a Next.js `Link`; otherwise it renders as a static `div`.
 */
export function Card({ title, description, href, icon, children }: CardProps) {
  const content = (
    <div className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/30 hover:shadow-[0_0_24px_rgba(77,163,255,0.06)]">
      <div className="flex items-start gap-3">
        {icon && <div className="text-primary mt-0.5 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground m-0 group-hover:text-primary transition-colors">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted mt-1.5 mb-0 leading-relaxed">{description}</p>
          )}
          {children && <div className="text-sm text-muted mt-2">{children}</div>}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="no-underline block">
        {content}
      </Link>
    );
  }

  return content;
}

/** Props for the {@link CardGrid} layout component. */
interface CardGridProps {
  /** Number of columns at the largest breakpoint. Defaults to `2`. */
  cols?: 2 | 3;
  /** Card elements to arrange in the grid. */
  children: React.ReactNode;
}

/**
 * Responsive grid layout for arranging {@link Card} components.
 * Renders 1 column on mobile, scaling to 2 or 3 columns on larger screens.
 */
export function CardGrid({ cols = 2, children }: CardGridProps) {
  return (
    <div
      className={`grid gap-4 my-6 ${
        cols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {children}
    </div>
  );
}
