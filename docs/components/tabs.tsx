"use client";

import { useState, useEffect, Children, isValidElement } from "react";
import { useSdkPreference } from "@/lib/sdk-preference";

const LABEL_TO_SDK: Record<string, string> = {
  python: "python",
  typescript: "typescript",
  curl: "curl",
  ts: "typescript",
  bash: "curl",
  shell: "curl",
};

function normalizeLabel(label: string): string | null {
  return LABEL_TO_SDK[label.toLowerCase()] ?? null;
}

export function Tabs({ children }: { children: React.ReactNode }) {
  const { sdk } = useSdkPreference();
  const [active, setActive] = useState(0);

  // Identify Tab children by their `label` prop rather than by reference identity,
  // because Turbopack can split modules across chunks causing child.type !== Tab.
  const tabs = Children.toArray(children).filter(
    (child): child is React.ReactElement<{ label: string; children: React.ReactNode }> =>
      isValidElement(child) &&
      typeof (child.props as Record<string, unknown>).label === "string"
  );

  // Sync active tab when SDK preference changes
  useEffect(() => {
    const idx = tabs.findIndex(
      (tab) => normalizeLabel(tab.props.label) === sdk
    );
    if (idx >= 0) setActive(idx);
  }, [sdk]); // eslint-disable-line react-hooks/exhaustive-deps

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

export function Tab({
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
