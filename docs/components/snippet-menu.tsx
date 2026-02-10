"use client";

import { useState, useRef, useEffect } from "react";

interface SnippetMenuProps {
  code: string;
  lang: string | null;
}

function buildPrompt(code: string, lang: string | null): string {
  const langLabel =
    lang === "python"
      ? "Python"
      : lang === "typescript" || lang === "ts"
        ? "TypeScript"
        : lang === "bash"
          ? "bash/cURL"
          : lang || "code";
  return `I'm using the Roset ${langLabel} SDK. Here's a code snippet:\n\n\`\`\`${lang || ""}\n${code}\n\`\`\`\n\nHelp me understand and adapt this for my use case.`;
}

export function SnippetMenu({ code, lang }: SnippetMenuProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback(null);
      setOpen(false);
    }, 1200);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    showFeedback("Copied!");
  }

  async function copyAsPrompt() {
    await navigator.clipboard.writeText(buildPrompt(code, lang));
    showFeedback("Prompt copied!");
  }

  async function openInClaude() {
    await navigator.clipboard.writeText(buildPrompt(code, lang));
    window.open("https://claude.ai/new", "_blank");
    setOpen(false);
  }

  async function openInChatGPT() {
    await navigator.clipboard.writeText(buildPrompt(code, lang));
    window.open("https://chatgpt.com", "_blank");
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <div className="flex items-center gap-0.5">
        {/* Primary copy button */}
        <button
          onClick={copyCode}
          aria-label="Copy code"
          className="p-1.5 rounded-md text-[#6B7280] hover:text-[#D1D5DB] transition-colors cursor-pointer"
        >
          {feedback === "Copied!" && !open ? <CheckIcon /> : <CopyIcon />}
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="More options"
          className="p-1 rounded-md text-[#6B7280] hover:text-[#D1D5DB] transition-colors cursor-pointer"
        >
          <ChevronIcon />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#1A1C2E] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-2xl z-50 py-1 text-[13px] animate-in fade-in slide-in-from-top-1 duration-150">
          {feedback ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-[#2BD576]">
              <CheckIcon />
              {feedback}
            </div>
          ) : (
            <>
              <MenuItem
                icon={<CopyIcon />}
                label="Copy code"
                onClick={copyCode}
              />
              <MenuItem
                icon={<TerminalIcon />}
                label="Copy as prompt"
                onClick={copyAsPrompt}
              />
              <div className="h-px bg-[rgba(255,255,255,0.06)] my-1" />
              <MenuItem
                icon={<ExternalIcon />}
                label="Open in Claude"
                sublabel="Copies prompt"
                onClick={openInClaude}
              />
              <MenuItem
                icon={<ExternalIcon />}
                label="Open in ChatGPT"
                sublabel="Copies prompt"
                onClick={openInChatGPT}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-[#C8CED8] hover:bg-[rgba(77,163,255,0.08)] transition-colors cursor-pointer text-left"
    >
      <span className="shrink-0 text-[#6B7280]">{icon}</span>
      <span className="flex-1">{label}</span>
      {sublabel && (
        <span className="text-[11px] text-[#6B7280]">{sublabel}</span>
      )}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
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
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="14"
      height="14"
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
