"use client";

import { useState } from "react";

interface PromptCardProps {
  title: string;
  prompt: string;
}

export function PromptCard({ title, prompt }: PromptCardProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    showFeedback("Copied!");
  }

  async function openInClaude() {
    await navigator.clipboard.writeText(prompt);
    window.open("https://claude.ai/new", "_blank");
    showFeedback("Copied — paste in Claude");
  }

  async function openInChatGPT() {
    await navigator.clipboard.writeText(prompt);
    window.open(
      `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
      "_blank",
    );
    showFeedback("Opened!");
  }

  return (
    <div className="my-6 border border-border rounded-xl bg-surface overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary shrink-0"
          >
            <path d="M12 20h9" />
            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z" />
          </svg>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="bg-surface-elevated rounded-lg px-4 py-3 font-mono text-xs text-muted leading-relaxed whitespace-pre-wrap border border-border">
          {prompt}
        </div>
      </div>
      <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
        <button
          onClick={copyPrompt}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {feedback || "Copy prompt"}
        </button>
        <button
          onClick={openInClaude}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer"
        >
          <ExternalIcon />
          Open in Claude
        </button>
        <button
          onClick={openInChatGPT}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer"
        >
          <ExternalIcon />
          Open in ChatGPT
        </button>
      </div>
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
