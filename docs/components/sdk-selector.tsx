"use client";

import { useSdkPreference, type SdkPreference } from "@/lib/sdk-preference";

const options: { value: SdkPreference; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
  { value: "curl", label: "cURL" },
];

export function SdkSelector() {
  const { sdk, setSdk } = useSdkPreference();

  return (
    <div className="mb-4 px-2">
      <div className="text-[11px] font-medium text-subtle uppercase tracking-wider mb-2">
        SDK
      </div>
      <div className="flex rounded-lg bg-surface-elevated border border-border p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSdk(opt.value)}
            className={`flex-1 text-[11px] font-medium py-1.5 px-1 rounded-md transition-all cursor-pointer ${
              sdk === opt.value
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
