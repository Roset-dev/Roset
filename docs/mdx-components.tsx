/**
 * Global MDX component mappings for the documentation site.
 * Overrides default HTML elements rendered by MDX with custom-styled React components
 * that match the Roset docs design system (typography, code blocks, tables, etc.).
 *
 * Next.js automatically loads this file to apply component overrides to all MDX pages.
 * See: https://nextjs.org/docs/app/building-your-application/configuring/mdx
 *
 * @module mdx-components
 */
import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Children, isValidElement } from "react";
import { CopyButton } from "@/components/code-block";

/**
 * Inline anchor icon appended to headings (h2, h3, h4).
 * Appears on hover to allow users to copy a direct link to a section.
 *
 * @param props.id - The heading's HTML `id` attribute used to build the `#anchor` link.
 */
function HeadingAnchor({ id }: { id?: string }) {
  if (!id) return null;
  return (
    <a
      href={`#${id}`}
      aria-hidden="true"
      tabIndex={-1}
      className="ml-2 text-subtle opacity-0 group-hover:opacity-100 transition-opacity no-underline hover:text-primary select-none"
    >
      #
    </a>
  );
}

/**
 * Wrapper for fenced code blocks that adds a language label header and a copy button.
 * Used by the `pre` override to wrap Shiki/rehype-pretty-code output.
 *
 * @param props.lang - Programming language identifier (e.g., `"ts"`, `"bash"`), or `null`.
 * @param props.text - Raw code text passed to the {@link CopyButton}.
 * @param props.children - The syntax-highlighted `<pre>` element from the MDX pipeline.
 */
function CodeBlockWrapper({
  lang,
  text,
  children,
}: {
  lang: string | null;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-6 bg-[#1E2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        {lang ? (
          <span className="text-sm font-semibold text-[#C8CED8] font-mono select-none">
            {lang}
          </span>
        ) : (
          <span />
        )}
        <CopyButton text={text} />
      </div>
      <div className="bg-[#171927] rounded-lg m-2 p-4 overflow-x-auto border border-td-border">
        {children}
      </div>
    </div>
  );
}

/**
 * Returns the full set of MDX component overrides for the documentation site.
 * Merges custom-styled heading, paragraph, link, list, code, table, and blockquote
 * components with any caller-provided overrides.
 *
 * @param components - Additional or overriding component mappings passed by Next.js.
 * @returns Merged {@link MDXComponents} object used to render all MDX content.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children, id }) => (
      <h1
        id={id}
        className="text-[2rem] font-bold tracking-tight leading-snug text-heading-1 mb-6 mt-0"
      >
        {children}
      </h1>
    ),
    h2: ({ children, id }) => (
      <h2
        id={id}
        className="group text-2xl font-semibold tracking-tight text-heading-2 mt-12 mb-4 pb-3 border-b border-border scroll-mt-20"
      >
        {children}
        <HeadingAnchor id={id} />
      </h2>
    ),
    h3: ({ children, id }) => (
      <h3
        id={id}
        className="group text-xl font-semibold text-heading-3 mt-8 mb-3 scroll-mt-20"
      >
        {children}
        <HeadingAnchor id={id} />
      </h3>
    ),
    h4: ({ children, id }) => (
      <h4
        id={id}
        className="group text-lg font-semibold text-heading-4 mt-6 mb-2 scroll-mt-20"
      >
        {children}
        <HeadingAnchor id={id} />
      </h4>
    ),
    p: ({ children }) => (
      <p className="text-base text-body leading-7 my-4">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="text-strong font-semibold">{children}</strong>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith("/") || href?.startsWith("#")) {
        return (
          <Link
            href={href}
            className="text-primary no-underline hover:text-primary-hover transition-colors"
          >
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary no-underline hover:text-primary-hover transition-colors"
        >
          {children}
        </a>
      );
    },
    ul: ({ children }) => (
      <ul className="text-base text-body pl-6 my-4 list-disc marker:text-primary">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="text-base text-body pl-6 my-4 list-decimal marker:text-primary">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="my-2 text-base leading-7">{children}</li>,
    code: ({ children, className, ...props }) => {
      const dataProps = props as Record<string, unknown>;
      const isCodeBlock =
        className || dataProps["data-language"] !== undefined || dataProps["data-theme"] !== undefined;
      // Inline code (not inside a pre/code block)
      if (!isCodeBlock) {
        return (
          <code className="bg-inline-code-bg text-inline-code-text px-1.5 py-0.5 rounded-[5px] text-[0.875em] border border-[rgba(77,163,255,0.15)]">
            {children}
          </code>
        );
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => {
      const text = extractText(children);
      const lang = extractLanguage(children);
      return (
        <CodeBlockWrapper lang={lang} text={text}>
          <pre
            className="text-[14px] leading-6 font-mono bg-transparent! border-0! p-0! m-0! rounded-none!"
            {...props}
          >
            {children}
          </pre>
        </CodeBlockWrapper>
      );
    },
    figure: ({ children, ...props }) => {
      // rehype-pretty-code wraps code blocks in figure elements
      const dataProps = props as Record<string, unknown>;
      if (dataProps["data-rehype-pretty-code-figure"] !== undefined) {
        // Extract figcaption title if present
        let title: string | null = null;
        const otherChildren: React.ReactNode[] = [];
        Children.forEach(children, (child) => {
          if (
            isValidElement(child) &&
            (child.props as Record<string, unknown>)["data-rehype-pretty-code-title"] !== undefined
          ) {
            title = extractText(child);
          } else {
            otherChildren.push(child);
          }
        });

        return (
          <figure className="my-6 [&>div]:my-0" data-code-title={title || undefined} {...props}>
            {otherChildren}
          </figure>
        );
      }
      return <figure {...props}>{children}</figure>;
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-border">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-thead-bg">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="text-foreground font-semibold text-sm text-left px-4 py-3 border-b border-border">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 border-b border-td-border text-body text-[15px]">
        {children}
      </td>
    ),
    tr: ({ children }) => (
      <tr className="transition-colors hover:bg-tr-hover">{children}</tr>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-[3px] border-l-primary px-5 py-4 my-6 text-body italic bg-[rgba(77,163,255,0.04)] rounded-r-lg">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-t border-border my-10" />,
    ...components,
  };
}

/**
 * Recursively extracts all plain text from a React node tree.
 * Used to derive the copyable code string from `<pre>` children.
 *
 * @param node - A React node (string, element, array, or nested children).
 * @returns Concatenated plain text content.
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    const props = node.props as Record<string, unknown>;
    return extractText(props.children as React.ReactNode);
  }
  return "";
}

/**
 * Extracts the `data-language` attribute from a code block's React node tree.
 * Traverses children recursively until a `data-language` prop is found.
 *
 * @param node - The `<pre>` element's children (typically a `<code>` element).
 * @returns The language string (e.g., `"ts"`) or `null` if not found.
 */
function extractLanguage(node: React.ReactNode): string | null {
  if (!node || typeof node !== "object" || !("props" in node)) return null;
  const props = node.props as Record<string, unknown>;
  if (typeof props["data-language"] === "string") return props["data-language"];
  // Check children recursively
  if (props.children) return extractLanguage(props.children as React.ReactNode);
  return null;
}
