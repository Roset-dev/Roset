/**
 * Tabbed content switcher for documentation pages.
 * Commonly used to present language-specific code examples (TypeScript / Python / cURL)
 * or alternative configuration approaches side by side.
 *
 * @module components/tabs
 */
"use client";

import { useState, Children, isValidElement } from "react";

/**
 * Container that renders a row of tab buttons and displays one {@link Tab} panel at a time.
 * Automatically discovers child `<Tab>` elements and uses their `label` prop as button text.
 *
 * @param props.children - One or more `<Tab label="...">` elements.
 *
 * @example
 * ```mdx
 * <Tabs>
 *   <Tab label="TypeScript">```ts ... ```</Tab>
 *   <Tab label="Python">```python ... ```</Tab>
 * </Tabs>
 * ```
 */
export function Tabs({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(0);

  const tabs = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === Tab
  ) as React.ReactElement<{ label: string; children: React.ReactNode }>[];

  return (
    <div className="my-6 bg-surface-elevated border border-code-border rounded-xl overflow-hidden">
      <div className="flex border-b border-code-border px-1">
        {tabs.map((tab, i) => (
          <button
            key={tab.props.label}
            onClick={() => setActive(i)}
            className={`px-4 py-2.5 text-[13px] font-mono -mb-px border-b-2 transition-colors cursor-pointer ${
              i === active
                ? "text-primary border-b-primary"
                : "text-subtle border-b-transparent hover:text-muted"
            }`}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className="p-0">{tabs[active]}</div>
    </div>
  );
}

/**
 * Individual tab panel within a {@link Tabs} container.
 * The `label` prop is read by the parent `Tabs` to render the tab button; this component
 * itself simply renders its children as a fragment.
 *
 * @param props.label - Text displayed on the tab button (consumed by parent `Tabs`).
 * @param props.children - Content shown when this tab is active.
 */
export function Tab({
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
