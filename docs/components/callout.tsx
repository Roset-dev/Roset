/**
 * Styled callout boxes for notes, tips, cautions, and danger warnings.
 * Used in MDX content to draw attention to important information.
 *
 * @module components/callout
 */

/** Visual style configuration for each callout variant. */
const styles = {
  note: {
    icon: "text-primary",
    label: "Note",
  },
  tip: {
    icon: "text-success",
    label: "Tip",
  },
  caution: {
    icon: "text-warning",
    label: "Caution",
  },
  danger: {
    icon: "text-error",
    label: "Danger",
  },
} as const;

/** SVG icon map for each callout variant (note, tip, caution, danger). */
const icons: Record<string, React.ReactNode> = {
  note: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 4a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5Zm.75 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  ),
  tip: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5a4.5 4.5 0 0 0-1.667 8.685V11.5a1 1 0 0 0 1 1h1.334a1 1 0 0 0 1-1v-1.315A4.502 4.502 0 0 0 8 1.5ZM6.5 13.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3Z" />
    </svg>
  ),
  caution: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.134 1.503a1 1 0 0 1 1.732 0l6 10.392A1 1 0 0 1 14 13.5H2a1 1 0 0 1-.866-1.605l6-10.392ZM7.25 6a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0V6Zm.75 5.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  ),
  danger: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm2.03 8.47a.75.75 0 1 1-1.06 1.06L8 9.56l-.97.97a.75.75 0 0 1-1.06-1.06L6.94 8.5l-.97-.97a.75.75 0 0 1 1.06-1.06l.97.97.97-.97a.75.75 0 1 1 1.06 1.06l-.97.97.97.97Z" />
    </svg>
  ),
};

/**
 * Renders a styled callout box with an icon, label, and body content.
 * Supports four severity levels: note, tip, caution, and danger.
 *
 * @param props.type - Callout variant controlling the icon and color. Defaults to `"note"`.
 * @param props.title - Optional custom heading; falls back to the variant label (e.g., "Note").
 * @param props.children - Body content displayed below the heading.
 *
 * @example
 * ```mdx
 * <Callout type="tip" title="Pro tip">
 *   Use `roset.upload()` for the fastest integration.
 * </Callout>
 * ```
 */
export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: keyof typeof styles;
  title?: string;
  children: React.ReactNode;
}) {
  const s = styles[type];
  return (
    <div className="my-6 bg-surface-elevated rounded-lg px-4 py-3.5">
      <div className={`flex items-center gap-2 text-[13px] font-medium ${s.icon} mb-1.5`}>
        {icons[type]}
        <span>{title || s.label}</span>
      </div>
      <div className="text-muted text-[14px] leading-relaxed [&>p]:m-0">
        {children}
      </div>
    </div>
  );
}
