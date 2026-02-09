/**
 * Site header branding component for the documentation site.
 * Renders the Roset logo (theme-aware), wordmark, and a "Docs" badge.
 * Links back to the docs root (`/docs`).
 *
 * @module components/site-title
 */
import Image from "next/image";
import Link from "next/link";

/**
 * Displays the Roset logo, site name, and a "Docs" label badge.
 * Uses separate logo images for dark and light themes, toggled via CSS classes.
 */
export function SiteTitle() {
  return (
    <Link href="/docs" className="flex items-center gap-3 no-underline group">
      <Image
        src="/logos/logo-white-no-bg.png"
        alt="Roset"
        width={30}
        height={30}
        className="logo-for-dark drop-shadow-[0_0_8px_rgba(77,163,255,0.4)] group-hover:scale-105 transition-transform"
      />
      <Image
        src="/logos/logo-black-no-bg.png"
        alt="Roset"
        width={30}
        height={30}
        className="logo-for-light hidden group-hover:scale-105 transition-transform"
      />
      <span className="text-foreground font-semibold text-lg tracking-tight">
        Roset
      </span>
      <span className="text-muted bg-surface-elevated text-xs font-medium px-2 py-0.5 rounded-md">
        Docs
      </span>
    </Link>
  );
}
