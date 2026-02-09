#!/usr/bin/env node

/**
 * Build-time search index generator.
 * Walks app/docs/** /page.mdx files, extracts title + sections, outputs public/search-index.json.
 */

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const DOCS_DIR = join(import.meta.dirname, "..", "app", "docs");
const OUTPUT = join(import.meta.dirname, "..", "public", "search-index.json");

async function findMdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMdxFiles(full)));
    } else if (entry.name === "page.mdx") {
      files.push(full);
    }
  }
  return files;
}

function filePathToHref(filePath) {
  // e.g. app/docs/start/quickstart/page.mdx -> /docs/start/quickstart
  const rel = relative(join(import.meta.dirname, "..", "app"), filePath);
  const dir = rel.replace(/\/page\.mdx$/, "");
  return "/" + dir;
}

function extractTitle(content) {
  // Try to get title from metadata export
  const metaMatch = content.match(/title:\s*["']([^"']+)["']/);
  if (metaMatch) return metaMatch[1];
  // Fallback: first # heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];
  return "Untitled";
}

function stripMdx(content) {
  return content
    // Remove import statements
    .replace(/^import\s+.+$/gm, "")
    // Remove export statements (metadata, etc.)
    .replace(/^export\s+(?:const|let|var|function|default)\s+[\s\S]*?(?=\n(?:##?\s|$))/gm, "")
    // Remove JSX tags
    .replace(/<[^>]+>/g, "")
    // Remove markdown link syntax but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSections(content) {
  const sections = [];
  const stripped = stripMdx(content);
  const parts = stripped.split(/^##\s+/m);

  // First part is content before any ## heading (intro)
  if (parts[0]?.trim()) {
    sections.push({
      heading: null,
      id: null,
      content: parts[0].trim().slice(0, 500),
    });
  }

  for (let i = 1; i < parts.length; i++) {
    const lines = parts[i].split("\n");
    const heading = lines[0].trim();
    const id = heading
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    const body = lines.slice(1).join("\n").trim().slice(0, 500);
    sections.push({ heading, id, content: body });
  }

  return sections;
}

async function main() {
  const files = await findMdxFiles(DOCS_DIR);
  const index = [];

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const href = filePathToHref(file);
    const title = extractTitle(content);
    const sections = splitSections(content);

    index.push({ href, title, sections });
  }

  // Sort by href for consistency
  index.sort((a, b) => a.href.localeCompare(b.href));

  await mkdir(join(import.meta.dirname, "..", "public"), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(index, null, 2));
  console.log(`Search index built: ${index.length} pages, written to public/search-index.json`);
}

main().catch((err) => {
  console.error("Failed to build search index:", err);
  process.exit(1);
});
