/**
 * Copy-to-clipboard button for code blocks.
 * Rendered inside the code block header alongside the language label.
 * Provides visual feedback (checkmark) after a successful copy.
 *
 * @module components/code-block
 */
"use client";

import { useState } from "react";

/**
 * Button that copies the provided text to the clipboard.
 * Shows a checkmark icon for 2 seconds after copying, then reverts to the copy icon.
 *
 * @param props.text - The raw code string to copy to the clipboard.
 */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      aria-label="Copy code"
      className="p-1.5 rounded-md text-[#6B7280] hover:text-[#D1D5DB] transition-colors cursor-pointer"
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
