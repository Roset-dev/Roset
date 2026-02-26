/**
 * Numbered step-by-step instruction components for documentation guides.
 * Used in MDX to render sequential procedures with a vertical connector line
 * and numbered circles (CSS counter-driven).
 *
 * @module components/steps
 */

/** Props for the {@link Steps} container. */
interface StepsProps {
  /** One or more {@link Step} elements. */
  children: React.ReactNode;
}

/**
 * Container that wraps a sequence of {@link Step} components.
 * Provides the CSS counter context and vertical spacing.
 */
export function Steps({ children }: StepsProps) {
  return <div className="steps-container my-6 ml-1">{children}</div>;
}

/** Props for an individual {@link Step}. */
interface StepProps {
  /** Heading text for this step. */
  title: string;
  /** Instructional content displayed below the step heading. */
  children: React.ReactNode;
}

/**
 * A single numbered step with a title and body content.
 * Renders a numbered circle on the left connected by a vertical border to adjacent steps.
 */
export function Step({ title, children }: StepProps) {
  return (
    <div className="relative pl-9 pb-8 last:pb-0 border-l-2 border-border ml-3">
      <div className="absolute -left-[13px] top-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-[0.75rem] font-bold text-white step-number" />
      <h4 className="text-base font-semibold text-foreground m-0 -mt-0.5">{title}</h4>
      <div className="text-sm text-body mt-2">{children}</div>
    </div>
  );
}
