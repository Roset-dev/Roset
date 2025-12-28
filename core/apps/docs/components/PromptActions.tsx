import { useState } from "react";
import {
  antigravityTaskPrompt,
  cursorPromptDeeplink,
  cursorPromptWebLink,
} from "../utils/promptLinks";
import { Button } from "./ui";

async function copy(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export function PromptActions({ prompt = "" }: { prompt?: string }) {
  const [copied, setCopied] = useState<null | string>(null);

  const doCopy = async (label: string, text: string) => {
    await copy(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="flex items-center gap-2 text-sm my-4 p-2 bg-muted/30 rounded-lg border border-border">
      <Button variant="outline" size="sm" onClick={() => doCopy("Copied", prompt)}>
        Copy
      </Button>

      <Button
        variant="outline"
        size="sm"
        asChild
        onClick={() => {/* optional analytics */}}
      >
        <a href={cursorPromptDeeplink(prompt)}>
            Open in Cursor
        </a>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-muted-foreground"
      >
         <a
            href={cursorPromptWebLink(prompt)}
            target="_blank"
            rel="noreferrer"
        >
            (web)
        </a>
      </Button>


      <Button
        variant="outline"
        size="sm"
        onClick={() => doCopy("Copied (AG)", antigravityTaskPrompt(prompt))}
      >
        Copy for Antigravity
      </Button>

      {copied && <span className="text-muted-foreground text-xs animate-in fade-in zoom-in">{copied}</span>}
    </div>
  );
}
