export function cursorPromptDeeplink(text: string) {
  // Deeplink format referenced in Cursor deeplink tooling examples
  return `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(text)}`;
}

export function cursorPromptWebLink(text: string) {
  // Web fallback format (works in places that block custom URI schemes)
  return `https://cursor.com/link/prompt?text=${encodeURIComponent(text)}`;
}

export function cursorMcpInstallDeeplink(name: string, config: unknown) {
  // MCP install deeplink pattern
  const json = JSON.stringify(config);
  const b64 = Buffer.from(json, "utf8").toString("base64");
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${encodeURIComponent(b64)}`;
}

export function generateContextPrompt(code: string, language: string) {
  return [
    "I am working with the Roset Documentation (https://docs.roset.dev).",
    `Language: ${language}`,
    "Snippet:",
    "```" + language,
    code.trim(),
    "```",
    "",
    "Goal: Help me implement, run, or understand this part of the Roset filesystem control plane."
  ].join("\n");
}

export function antigravityTaskPrompt(raw: string) {
  // Antigravity is agent-first; avoid “run commands” in the prompt by default.
  return [
    "You are working inside Roset.",
    "Goal:",
    raw.trim(),
    "",
    "Constraints:",
    "- Don’t run destructive terminal commands.",
    "- If you need terminal commands, ask for confirmation first.",
  ].join("\n");
}
