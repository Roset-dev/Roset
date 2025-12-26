// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/Callout.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var typeConfig = {
  note: {
    containerClass: "bg-info/10 border-info/30",
    iconClass: "text-info",
    icon: /* @__PURE__ */ jsx("svg", { className: "h-[18px] w-[18px]", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" }) })
  },
  info: {
    containerClass: "bg-info/10 border-info/30",
    iconClass: "text-info",
    icon: /* @__PURE__ */ jsx("svg", { className: "h-[18px] w-[18px]", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) })
  },
  warning: {
    containerClass: "bg-warning/10 border-warning/30",
    iconClass: "text-warning",
    icon: /* @__PURE__ */ jsx("svg", { className: "h-[18px] w-[18px]", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) })
  },
  danger: {
    containerClass: "bg-error/10 border-error/30",
    iconClass: "text-error",
    icon: /* @__PURE__ */ jsx("svg", { className: "h-[18px] w-[18px]", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) })
  },
  success: {
    containerClass: "bg-success/10 border-success/30",
    iconClass: "text-success",
    icon: /* @__PURE__ */ jsx("svg", { className: "h-[18px] w-[18px]", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) })
  }
};
function Callout({ type = "note", title, children }) {
  const config = typeConfig[type] || typeConfig.note;
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: cn(
        "my-4 rounded-xl border p-4",
        config.containerClass
      ),
      children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx("span", { className: cn("mt-0.5 flex-shrink-0", config.iconClass), children: config.icon }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          title && /* @__PURE__ */ jsx("p", { className: cn("mb-1 text-sm font-semibold", config.iconClass), children: title }),
          /* @__PURE__ */ jsx("div", { className: "text-sm leading-relaxed text-text-2", children })
        ] })
      ] })
    }
  );
}

// src/Steps.tsx
import React from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function Steps({ children }) {
  return /* @__PURE__ */ jsx2("div", { className: "steps-container my-6", children: /* @__PURE__ */ jsx2("ol", { className: "list-none pl-0 space-y-6 counter-reset-step", children: React.Children.map(children, (child, index) => /* @__PURE__ */ jsxs2("li", { className: "relative pl-10", children: [
    /* @__PURE__ */ jsx2("span", { className: "absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-sm font-semibold", children: index + 1 }),
    /* @__PURE__ */ jsx2("div", { children: child })
  ] }, index)) }) });
}
function Step({ title, children }) {
  return /* @__PURE__ */ jsxs2("div", { children: [
    /* @__PURE__ */ jsx2("h4", { className: "font-semibold text-lg mb-2 text-text", children: title }),
    /* @__PURE__ */ jsx2("div", { className: "text-text-2", children })
  ] });
}

// src/Tabs.tsx
import React2, { useState } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function Tabs({ items, children }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const childArray = React2.Children.toArray(children);
  return /* @__PURE__ */ jsxs3("div", { className: "my-4", children: [
    /* @__PURE__ */ jsx3("div", { className: "flex border-b border-border", children: items.map((item, index) => /* @__PURE__ */ jsx3(
      "button",
      {
        onClick: () => setActiveIndex(index),
        className: cn(
          "px-4 py-2 text-sm font-medium transition-colors",
          activeIndex === index ? "border-b-2 border-accent text-accent" : "text-text-3 hover:text-text-2"
        ),
        children: item
      },
      item
    )) }),
    /* @__PURE__ */ jsx3("div", { className: "pt-4", children: childArray[activeIndex] })
  ] });
}
function Tab({ children }) {
  return /* @__PURE__ */ jsx3("div", { children });
}

// src/CodeBlockCopy.tsx
import { useState as useState2 } from "react";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function CodeBlockCopy({ code, language = "bash" }) {
  const [copied, setCopied] = useState2(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  return /* @__PURE__ */ jsxs4("div", { className: "relative group", children: [
    /* @__PURE__ */ jsx4("pre", { className: `language-${language} rounded-lg overflow-x-auto`, children: /* @__PURE__ */ jsx4("code", { children: code }) }),
    /* @__PURE__ */ jsx4(
      "button",
      {
        onClick: handleCopy,
        className: "absolute top-2 right-2 px-2 py-1 text-xs bg-surface-3 hover:bg-surface-2 text-text rounded opacity-0 group-hover:opacity-100 transition-opacity",
        children: copied ? "\u2713 Copied" : "Copy"
      }
    )
  ] });
}

// src/Badge.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
function Badge({
  children,
  variant = "default",
  size = "sm",
  className
}) {
  const baseStyles = "inline-flex items-center font-medium rounded-full";
  const variants = {
    default: "bg-surface-3 text-text-2",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    error: "bg-error/15 text-error",
    info: "bg-info/15 text-info",
    outline: "border border-border text-text-2"
  };
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  };
  return /* @__PURE__ */ jsx5(
    "span",
    {
      className: cn(baseStyles, variants[variant], sizes[size], className),
      children
    }
  );
}

// src/Search.tsx
import { useEffect, useState as useState3, useCallback, useRef } from "react";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function SearchTrigger({ onClick, className }) {
  return /* @__PURE__ */ jsxs5(
    "button",
    {
      onClick,
      className: cn(
        "group flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-2.5 py-1.5 transition-all hover:border-accent/50 hover:bg-surface-2",
        className
      ),
      "aria-label": "Search documentation",
      children: [
        /* @__PURE__ */ jsx6(
          "svg",
          {
            className: "h-3.5 w-3.5 text-text-3 group-hover:text-text-2",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /* @__PURE__ */ jsx6("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" })
          }
        ),
        /* @__PURE__ */ jsx6("span", { className: "text-xs text-text-3 group-hover:text-text-2", children: "Search" }),
        /* @__PURE__ */ jsxs5("kbd", { className: "hidden items-center gap-0.5 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-3 sm:flex", children: [
          /* @__PURE__ */ jsx6("span", { children: "\u2318" }),
          /* @__PURE__ */ jsx6("span", { children: "K" })
        ] })
      ]
    }
  );
}
function Search() {
  const [isOpen, setIsOpen] = useState3(false);
  const [query, setQuery] = useState3("");
  const [results, setResults] = useState3([]);
  const [selectedIndex, setSelectedIndex] = useState3(0);
  const [pagefind, setPagefind] = useState3(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  useEffect(() => {
    async function loadPagefind() {
      try {
        const pf = await import(
          /* webpackIgnore: true */
          "/pagefind/pagefind.js"
        );
        await pf.init();
        setPagefind(pf);
      } catch (e) {
        console.warn("Pagefind not available (run build first)");
      }
    }
    loadPagefind();
  }, []);
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => prev < results.length - 1 ? prev + 1 : 0);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => prev > 0 ? prev - 1 : results.length - 1);
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        window.location.href = results[selectedIndex].url;
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        setSelectedIndex(0);
      });
    }
  }, [isOpen]);
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, results.length]);
  const search = useCallback(async (q) => {
    setSelectedIndex(0);
    if (!pagefind || !q) {
      setResults([]);
      return;
    }
    const searchResults = await pagefind.search(q);
    const data = await Promise.all(
      searchResults.results.slice(0, 8).map((r) => r.data())
    );
    setResults(data.map((d) => {
      let url = d.url;
      url = url.replace(/^\/server\/pages/, "");
      url = url.replace(/\.html$/, "");
      url = url.replace(/\/index$/, "/");
      if (!url.startsWith("/")) url = "/" + url;
      return {
        url,
        title: d.meta?.title || url,
        excerpt: d.excerpt
      };
    }));
  }, [pagefind]);
  useEffect(() => {
    const timeout = setTimeout(() => search(query), 200);
    return () => clearTimeout(timeout);
  }, [query, search]);
  if (!isOpen) {
    return /* @__PURE__ */ jsx6(SearchTrigger, { onClick: () => setIsOpen(true) });
  }
  return /* @__PURE__ */ jsxs5("div", { className: "fixed inset-0 z-50 flex items-start justify-center pt-[15vh]", children: [
    /* @__PURE__ */ jsx6(
      "div",
      {
        className: "absolute inset-0 bg-black/70 backdrop-blur-sm",
        onClick: () => {
          setIsOpen(false);
          setQuery("");
        }
      }
    ),
    /* @__PURE__ */ jsxs5("div", { className: "relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface-1 shadow-2xl shadow-black/50", children: [
      /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-3 border-b border-border px-4", children: [
        /* @__PURE__ */ jsx6("svg", { className: "w-5 h-5 flex-shrink-0 text-text-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx6("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }),
        /* @__PURE__ */ jsx6(
          "input",
          {
            ref: inputRef,
            type: "text",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "Search documentation...",
            className: "flex-1 border-none bg-transparent py-4 text-base text-text outline-none ring-0 placeholder:text-text-3",
            style: { boxShadow: "none" }
          }
        ),
        /* @__PURE__ */ jsx6("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[9px] text-text-3", children: "ESC" })
      ] }),
      results.length > 0 && /* @__PURE__ */ jsx6("ul", { ref: listRef, className: "max-h-[60vh] overflow-y-auto p-2", children: results.map((result, i) => {
        const path = result.url.split("/").filter((p) => p && !p.startsWith("#")).join(" / ") || "Home";
        return /* @__PURE__ */ jsx6("li", { children: /* @__PURE__ */ jsxs5(
          "a",
          {
            href: result.url,
            onClick: () => setIsOpen(false),
            onMouseEnter: () => setSelectedIndex(i),
            className: cn(
              "group flex items-start gap-3 rounded-lg px-3 py-3 transition-all",
              i === selectedIndex ? "bg-accent text-white" : "text-text hover:bg-surface-2"
            ),
            children: [
              /* @__PURE__ */ jsx6("span", { className: cn(
                "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded",
                i === selectedIndex ? "text-white/80" : "text-text-3"
              ), children: /* @__PURE__ */ jsx6("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx6("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }) }),
              /* @__PURE__ */ jsxs5("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx6("div", { className: cn(
                  "mb-0.5 text-[10px] font-medium uppercase tracking-wider",
                  i === selectedIndex ? "text-white/70" : "text-text-3"
                ), children: path }),
                /* @__PURE__ */ jsx6("div", { className: "font-medium text-sm truncate", children: result.title }),
                /* @__PURE__ */ jsx6(
                  "div",
                  {
                    className: cn(
                      "mt-1 text-xs line-clamp-1",
                      i === selectedIndex ? "text-white/70" : "text-text-3"
                    ),
                    dangerouslySetInnerHTML: { __html: result.excerpt }
                  }
                )
              ] }),
              i === selectedIndex && /* @__PURE__ */ jsx6("svg", { className: "h-4 w-4 text-white/70 flex-shrink-0 mt-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx6("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })
            ]
          }
        ) }, i);
      }) }),
      query && results.length === 0 && /* @__PURE__ */ jsxs5("div", { className: "flex flex-col items-center justify-center py-12 text-center", children: [
        /* @__PURE__ */ jsx6("svg", { className: "mb-3 h-10 w-10 text-text-3/50", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx6("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
        /* @__PURE__ */ jsxs5("p", { className: "text-sm text-text-3", children: [
          'No results for "',
          query,
          '"'
        ] }),
        /* @__PURE__ */ jsx6("p", { className: "mt-1 text-xs text-text-3/70", children: "Try searching for something else" })
      ] }),
      /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between border-t border-border bg-surface-2/50 px-4 py-2 text-xs text-text-3", children: [
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs5("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx6("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px]", children: "\u2191" }),
            /* @__PURE__ */ jsx6("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px]", children: "\u2193" }),
            /* @__PURE__ */ jsx6("span", { className: "ml-1", children: "to navigate" })
          ] }),
          /* @__PURE__ */ jsxs5("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx6("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px]", children: "\u21B5" }),
            /* @__PURE__ */ jsx6("span", { className: "ml-1", children: "to select" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs5("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsx6("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px]", children: "\u2318K" }),
          /* @__PURE__ */ jsx6("span", { className: "ml-1", children: "to toggle" })
        ] })
      ] })
    ] })
  ] });
}

// src/Button.tsx
import { forwardRef } from "react";
import { jsx as jsx7 } from "react/jsx-runtime";
var Button = forwardRef(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles = "relative inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
    const variants = {
      primary: `
        bg-accent
        text-white
        shadow-sm
        hover:bg-accent-hover
        active:bg-accent-pressed active:shadow-inner
      `,
      secondary: `
        bg-surface-2
        text-text
        border border-border
        shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]
        hover:bg-surface-3 hover:border-text-3/30
        active:bg-surface-1
      `,
      ghost: `
        text-text-2
        hover:text-text hover:bg-surface-2
        active:bg-surface-3
      `
    };
    const sizes = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm rounded-lg gap-2",
      lg: "h-12 px-6 text-base rounded-xl gap-2"
    };
    return /* @__PURE__ */ jsx7(
      "button",
      {
        ref,
        className: cn(baseStyles, variants[variant], sizes[size], className),
        ...props,
        children
      }
    );
  }
);
Button.displayName = "Button";

// src/Card.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
function Card({ children, className }) {
  return /* @__PURE__ */ jsx8(
    "div",
    {
      className: cn(
        "rounded-2xl border border-border bg-surface-2 p-6",
        className
      ),
      children
    }
  );
}
function CardHeader({ children, className }) {
  return /* @__PURE__ */ jsx8("div", { className: cn("mb-4", className), children });
}
function CardTitle({ children, className }) {
  return /* @__PURE__ */ jsx8("h3", { className: cn("text-lg font-semibold text-text", className), children });
}
function CardDescription({
  children,
  className
}) {
  return /* @__PURE__ */ jsx8("p", { className: cn("mt-1 text-sm text-text-2", className), children });
}
function CardContent({ children, className }) {
  return /* @__PURE__ */ jsx8("div", { className, children });
}

// src/Input.tsx
import { forwardRef as forwardRef2 } from "react";
import { jsx as jsx9, jsxs as jsxs6 } from "react/jsx-runtime";
var Input = forwardRef2(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return /* @__PURE__ */ jsxs6("div", { className: "flex flex-col gap-1.5", children: [
      label && /* @__PURE__ */ jsx9(
        "label",
        {
          htmlFor: inputId,
          className: "text-sm font-medium text-text",
          children: label
        }
      ),
      /* @__PURE__ */ jsx9(
        "input",
        {
          ref,
          id: inputId,
          className: cn(
            "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-text placeholder:text-text-3 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-error focus:border-error focus:ring-error/20" : "",
            className
          ),
          ...props
        }
      ),
      hint && !error && /* @__PURE__ */ jsx9("span", { className: "text-xs text-text-3", children: hint }),
      error && /* @__PURE__ */ jsx9("span", { className: "text-xs text-error", children: error })
    ] });
  }
);
Input.displayName = "Input";

// src/Alert.tsx
import { jsx as jsx10, jsxs as jsxs7 } from "react/jsx-runtime";
var icons = {
  info: /* @__PURE__ */ jsx10("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx10("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
  success: /* @__PURE__ */ jsx10("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx10("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
  warning: /* @__PURE__ */ jsx10("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx10("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }),
  error: /* @__PURE__ */ jsx10("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx10("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" }) })
};
function Alert({
  children,
  variant = "info",
  title,
  className
}) {
  const variants = {
    info: "border-info/30 bg-info/10 text-info",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    error: "border-error/30 bg-error/10 text-error"
  };
  return /* @__PURE__ */ jsxs7(
    "div",
    {
      className: cn(
        "flex gap-3 rounded-lg border p-4",
        variants[variant],
        className
      ),
      role: "alert",
      children: [
        /* @__PURE__ */ jsx10("div", { className: "flex-shrink-0", children: icons[variant] }),
        /* @__PURE__ */ jsxs7("div", { className: "flex-1", children: [
          title && /* @__PURE__ */ jsx10("p", { className: "font-medium", children: title }),
          /* @__PURE__ */ jsx10("div", { className: cn("text-sm", title ? "mt-1 opacity-90" : ""), children })
        ] })
      ]
    }
  );
}

// src/Divider.tsx
import { jsx as jsx11, jsxs as jsxs8 } from "react/jsx-runtime";
function Divider({ label, className }) {
  if (label) {
    return /* @__PURE__ */ jsxs8("div", { className: cn("flex items-center gap-4", className), children: [
      /* @__PURE__ */ jsx11("div", { className: "h-px flex-1 bg-border" }),
      /* @__PURE__ */ jsx11("span", { className: "text-xs font-medium text-text-3", children: label }),
      /* @__PURE__ */ jsx11("div", { className: "h-px flex-1 bg-border" })
    ] });
  }
  return /* @__PURE__ */ jsx11("div", { className: cn("h-px w-full bg-border", className) });
}

// src/Textarea.tsx
import { forwardRef as forwardRef3 } from "react";
import { jsx as jsx12, jsxs as jsxs9 } from "react/jsx-runtime";
var Textarea = forwardRef3(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return /* @__PURE__ */ jsxs9("div", { className: "flex flex-col gap-1.5", children: [
      label && /* @__PURE__ */ jsx12(
        "label",
        {
          htmlFor: inputId,
          className: "text-sm font-medium text-text",
          children: label
        }
      ),
      /* @__PURE__ */ jsx12(
        "textarea",
        {
          ref,
          id: inputId,
          className: cn(
            "min-h-[100px] w-full resize-y rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-text placeholder:text-text-3 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-error focus:border-error focus:ring-error/20" : "",
            className
          ),
          ...props
        }
      ),
      hint && !error && /* @__PURE__ */ jsx12("span", { className: "text-xs text-text-3", children: hint }),
      error && /* @__PURE__ */ jsx12("span", { className: "text-xs text-error", children: error })
    ] });
  }
);
Textarea.displayName = "Textarea";

// src/Select.tsx
import { forwardRef as forwardRef4 } from "react";
import { jsx as jsx13, jsxs as jsxs10 } from "react/jsx-runtime";
var Select = forwardRef4(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return /* @__PURE__ */ jsxs10("div", { className: "flex flex-col gap-1.5", children: [
      label && /* @__PURE__ */ jsx13(
        "label",
        {
          htmlFor: inputId,
          className: "text-sm font-medium text-text",
          children: label
        }
      ),
      /* @__PURE__ */ jsxs10("div", { className: "relative", children: [
        /* @__PURE__ */ jsxs10(
          "select",
          {
            ref,
            id: inputId,
            className: cn(
              "h-10 w-full appearance-none rounded-lg border border-border bg-surface-1 px-3 pr-10 text-sm text-text transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
              error ? "border-error focus:border-error focus:ring-error/20" : "",
              className
            ),
            ...props,
            children: [
              placeholder && /* @__PURE__ */ jsx13("option", { value: "", disabled: true, children: placeholder }),
              options.map((option) => /* @__PURE__ */ jsx13(
                "option",
                {
                  value: option.value,
                  disabled: option.disabled,
                  children: option.label
                },
                option.value
              ))
            ]
          }
        ),
        /* @__PURE__ */ jsx13("div", { className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-3", children: /* @__PURE__ */ jsx13("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx13("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) }) })
      ] }),
      hint && !error && /* @__PURE__ */ jsx13("span", { className: "text-xs text-text-3", children: hint }),
      error && /* @__PURE__ */ jsx13("span", { className: "text-xs text-error", children: error })
    ] });
  }
);
Select.displayName = "Select";

// src/Switch.tsx
import { forwardRef as forwardRef5 } from "react";
import { Fragment, jsx as jsx14, jsxs as jsxs11 } from "react/jsx-runtime";
var Switch = forwardRef5(
  ({ className, label, description, size = "md", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return /* @__PURE__ */ jsxs11(
      "label",
      {
        htmlFor: inputId,
        className: cn("flex cursor-pointer items-start gap-3", className),
        children: [
          /* @__PURE__ */ jsxs11("div", { className: "relative flex-shrink-0", children: [
            /* @__PURE__ */ jsx14(
              "input",
              {
                ref,
                type: "checkbox",
                id: inputId,
                className: "peer sr-only",
                ...props
              }
            ),
            size === "sm" ? /* @__PURE__ */ jsxs11(Fragment, { children: [
              /* @__PURE__ */ jsx14("div", { className: "h-5 w-9 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50" }),
              /* @__PURE__ */ jsx14("div", { className: "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" })
            ] }) : /* @__PURE__ */ jsxs11(Fragment, { children: [
              /* @__PURE__ */ jsx14("div", { className: "h-6 w-11 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50" }),
              /* @__PURE__ */ jsx14("div", { className: "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" })
            ] })
          ] }),
          (label || description) && /* @__PURE__ */ jsxs11("div", { className: "flex flex-col", children: [
            label && /* @__PURE__ */ jsx14("span", { className: "text-sm font-medium text-text", children: label }),
            description && /* @__PURE__ */ jsx14("span", { className: "text-xs text-text-3", children: description })
          ] })
        ]
      }
    );
  }
);
Switch.displayName = "Switch";

// src/Avatar.tsx
import { jsx as jsx15, jsxs as jsxs12 } from "react/jsx-runtime";
function Avatar({
  src,
  alt = "Avatar",
  fallback,
  size = "md",
  status,
  className
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };
  const statusColors = {
    online: "bg-success",
    away: "bg-warning",
    busy: "bg-error",
    offline: "bg-text-3"
  };
  const statusSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3"
  };
  const initials = fallback ? fallback.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
  return /* @__PURE__ */ jsxs12("div", { className: cn("relative inline-flex", className), children: [
    src ? /* @__PURE__ */ jsx15(
      "img",
      {
        src,
        alt,
        className: cn(sizes[size], "rounded-full object-cover ring-2 ring-border")
      }
    ) : /* @__PURE__ */ jsx15(
      "div",
      {
        className: cn(
          sizes[size],
          "flex items-center justify-center rounded-full bg-surface-3 font-medium text-text ring-2 ring-border"
        ),
        children: initials
      }
    ),
    status && /* @__PURE__ */ jsx15(
      "span",
      {
        className: cn(
          "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
          statusSizes[size],
          statusColors[status]
        )
      }
    )
  ] });
}

// src/IconButton.tsx
import { forwardRef as forwardRef6 } from "react";
import { jsx as jsx16 } from "react/jsx-runtime";
var IconButton = forwardRef6(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-50";
    const variants = {
      default: "bg-surface-2 text-text-2 border border-border hover:bg-surface-3 hover:text-text",
      ghost: "text-text-3 hover:text-text hover:bg-surface-2",
      danger: "text-text-3 hover:text-error hover:bg-error/10"
    };
    const sizes = {
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12"
    };
    const iconSizes = {
      sm: "[&>svg]:h-4 [&>svg]:w-4",
      md: "[&>svg]:h-5 [&>svg]:w-5",
      lg: "[&>svg]:h-6 [&>svg]:w-6"
    };
    return /* @__PURE__ */ jsx16(
      "button",
      {
        ref,
        className: cn(baseStyles, variants[variant], sizes[size], iconSizes[size], className),
        ...props,
        children
      }
    );
  }
);
IconButton.displayName = "IconButton";

// src/Skeleton.tsx
import { jsx as jsx17, jsxs as jsxs13 } from "react/jsx-runtime";
function Skeleton({
  className,
  variant = "text",
  width,
  height
}) {
  const baseStyles = "animate-pulse bg-surface-3";
  const variants = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg"
  };
  const style = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;
  return /* @__PURE__ */ jsx17(
    "div",
    {
      className: cn(baseStyles, variants[variant], className),
      style
    }
  );
}
function SkeletonCard() {
  return /* @__PURE__ */ jsxs13("div", { className: "rounded-2xl border border-border bg-surface-2 p-6 space-y-4", children: [
    /* @__PURE__ */ jsx17(Skeleton, { variant: "rectangular", height: 20, width: "60%" }),
    /* @__PURE__ */ jsx17(Skeleton, { variant: "text" }),
    /* @__PURE__ */ jsx17(Skeleton, { variant: "text", width: "80%" })
  ] });
}
function SkeletonAvatar({ size = "md" }) {
  const sizes = { sm: 32, md: 40, lg: 48 };
  return /* @__PURE__ */ jsx17(Skeleton, { variant: "circular", width: sizes[size], height: sizes[size] });
}
function SkeletonButton() {
  return /* @__PURE__ */ jsx17(Skeleton, { variant: "rectangular", height: 40, width: 100 });
}

// src/CodeBlock.tsx
import { useState as useState4, useRef as useRef2 } from "react";
import { Fragment as Fragment2, jsx as jsx18, jsxs as jsxs14 } from "react/jsx-runtime";
function CodeBlock({
  code,
  children,
  language = "text",
  filename
}) {
  const contentRef = useRef2(null);
  const [copied, setCopied] = useState4(false);
  const displayLanguage = language && language !== "text" ? language : null;
  const copyToClipboard = async () => {
    const textToCopy = code || contentRef.current?.textContent || "";
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    }
  };
  return /* @__PURE__ */ jsxs14("div", { className: "overflow-hidden rounded-xl border border-border shadow-sm my-4", children: [
    /* @__PURE__ */ jsxs14("div", { className: "flex items-center justify-between bg-surface-3 px-4 py-2.5", children: [
      /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxs14("div", { className: "flex gap-1.5", children: [
          /* @__PURE__ */ jsx18("div", { className: "h-3 w-3 rounded-full bg-[#ff5f57]" }),
          /* @__PURE__ */ jsx18("div", { className: "h-3 w-3 rounded-full bg-[#febc2e]" }),
          /* @__PURE__ */ jsx18("div", { className: "h-3 w-3 rounded-full bg-[#28c840]" })
        ] }),
        filename && /* @__PURE__ */ jsx18("span", { className: "font-mono text-xs text-text-2", children: filename }),
        !filename && displayLanguage && /* @__PURE__ */ jsx18("span", { className: "font-mono text-xs text-text-2", children: displayLanguage })
      ] }),
      /* @__PURE__ */ jsx18(
        "button",
        {
          onClick: copyToClipboard,
          className: "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text",
          "aria-label": "Copy code",
          children: copied ? /* @__PURE__ */ jsxs14(Fragment2, { children: [
            /* @__PURE__ */ jsx18(
              "svg",
              {
                className: "h-4 w-4 text-success",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /* @__PURE__ */ jsx18(
                  "path",
                  {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M5 13l4 4L19 7"
                  }
                )
              }
            ),
            "Copied!"
          ] }) : /* @__PURE__ */ jsxs14(Fragment2, { children: [
            /* @__PURE__ */ jsx18(
              "svg",
              {
                className: "h-4 w-4",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /* @__PURE__ */ jsx18(
                  "path",
                  {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  }
                )
              }
            ),
            "Copy"
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsx18("pre", { className: "overflow-x-auto p-4 bg-surface-1", children: /* @__PURE__ */ jsx18(
      "div",
      {
        ref: contentRef,
        className: "font-mono text-sm leading-relaxed text-text",
        children: children || code
      }
    ) })
  ] });
}

// src/Table.tsx
import { jsx as jsx19 } from "react/jsx-runtime";
function Table({ children, className }) {
  return /* @__PURE__ */ jsx19("div", { className: cn("overflow-x-auto rounded-xl border border-border", className), children: /* @__PURE__ */ jsx19("table", { className: "w-full text-sm", children }) });
}
function TableHeader({ children }) {
  return /* @__PURE__ */ jsx19("thead", { className: "border-b border-border bg-surface-1", children });
}
function TableBody({ children }) {
  return /* @__PURE__ */ jsx19("tbody", { className: "divide-y divide-border", children });
}
function TableRow({
  children,
  className
}) {
  return /* @__PURE__ */ jsx19("tr", { className: cn("transition-colors hover:bg-surface-1", className), children });
}
function TableHead({
  children,
  className
}) {
  return /* @__PURE__ */ jsx19(
    "th",
    {
      className: cn("px-4 py-3 text-left font-medium text-text-2", className),
      children
    }
  );
}
function TableCell({
  children,
  className
}) {
  return /* @__PURE__ */ jsx19("td", { className: cn("px-4 py-3 text-text", className), children });
}

// src/StatCard.tsx
import { jsx as jsx20, jsxs as jsxs15 } from "react/jsx-runtime";
function StatCard({
  label,
  value,
  change,
  icon,
  className
}) {
  const changeColors = {
    increase: "text-success",
    decrease: "text-error",
    neutral: "text-text-3"
  };
  const changeIcons = {
    increase: /* @__PURE__ */ jsx20("svg", { className: "h-3 w-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx20("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 10l7-7m0 0l7 7m-7-7v18" }) }),
    decrease: /* @__PURE__ */ jsx20("svg", { className: "h-3 w-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx20("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 14l-7 7m0 0l-7-7m7 7V3" }) }),
    neutral: null
  };
  return /* @__PURE__ */ jsx20(
    "div",
    {
      className: cn("rounded-2xl border border-border bg-surface-2 p-6", className),
      children: /* @__PURE__ */ jsxs15("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsxs15("div", { children: [
          /* @__PURE__ */ jsx20("p", { className: "text-sm text-text-3", children: label }),
          /* @__PURE__ */ jsx20("p", { className: "mt-2 text-3xl font-bold text-text", children: value }),
          change && /* @__PURE__ */ jsxs15(
            "div",
            {
              className: cn(
                "mt-2 flex items-center gap-1 text-xs font-medium",
                changeColors[change.type]
              ),
              children: [
                changeIcons[change.type],
                /* @__PURE__ */ jsx20("span", { children: change.value })
              ]
            }
          )
        ] }),
        icon && /* @__PURE__ */ jsx20("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3 text-text-2", children: icon })
      ] })
    }
  );
}

// src/Modal.tsx
import { useEffect as useEffect2, useRef as useRef3 } from "react";
import { jsx as jsx21, jsxs as jsxs16 } from "react/jsx-runtime";
function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = "md"
}) {
  const overlayRef = useRef3(null);
  useEffect2(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg"
  };
  return /* @__PURE__ */ jsxs16(
    "div",
    {
      ref: overlayRef,
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      onClick: (e) => {
        if (e.target === overlayRef.current) onClose();
      },
      children: [
        /* @__PURE__ */ jsx21("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm" }),
        /* @__PURE__ */ jsxs16(
          "div",
          {
            className: cn(
              "relative w-full rounded-2xl border border-border bg-surface-2 p-6 shadow-xl",
              sizes[size]
            ),
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": title ? "modal-title" : void 0,
            children: [
              /* @__PURE__ */ jsx21(
                "button",
                {
                  onClick: onClose,
                  className: "absolute right-4 top-4 rounded-lg p-1 text-text-3 transition-colors hover:bg-surface-3 hover:text-text",
                  "aria-label": "Close",
                  children: /* @__PURE__ */ jsx21("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx21("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
                }
              ),
              (title || description) && /* @__PURE__ */ jsxs16("div", { className: "mb-6", children: [
                title && /* @__PURE__ */ jsx21("h2", { id: "modal-title", className: "text-lg font-semibold text-text", children: title }),
                description && /* @__PURE__ */ jsx21("p", { className: "mt-1 text-sm text-text-2", children: description })
              ] }),
              children
            ]
          }
        )
      ]
    }
  );
}
function ModalFooter({ children, className }) {
  return /* @__PURE__ */ jsx21("div", { className: cn("mt-6 flex justify-end gap-3", className), children });
}

// src/Tooltip.tsx
import { useState as useState5, useRef as useRef4, useEffect as useEffect3 } from "react";
import { jsx as jsx22, jsxs as jsxs17 } from "react/jsx-runtime";
function Tooltip({
  children,
  content,
  side = "top",
  delay = 200
}) {
  const [isVisible, setIsVisible] = useState5(false);
  const timeoutRef = useRef4(null);
  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };
  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };
  useEffect3(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };
  return /* @__PURE__ */ jsxs17(
    "div",
    {
      className: "relative inline-flex",
      onMouseEnter: showTooltip,
      onMouseLeave: hideTooltip,
      onFocus: showTooltip,
      onBlur: hideTooltip,
      children: [
        children,
        isVisible && /* @__PURE__ */ jsx22(
          "div",
          {
            className: cn(
              "absolute z-50 whitespace-nowrap rounded-lg bg-surface-3 px-3 py-1.5 text-xs font-medium text-text shadow-md",
              positions[side]
            ),
            role: "tooltip",
            children: content
          }
        )
      ]
    }
  );
}

// src/Checkbox.tsx
import { forwardRef as forwardRef7 } from "react";
import { jsx as jsx23, jsxs as jsxs18 } from "react/jsx-runtime";
var Checkbox = forwardRef7(
  ({ className, label, description, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return /* @__PURE__ */ jsxs18("div", { className: cn("flex items-start gap-3", className), children: [
      /* @__PURE__ */ jsxs18("div", { className: "relative flex h-5 items-center", children: [
        /* @__PURE__ */ jsx23(
          "input",
          {
            ref,
            type: "checkbox",
            id: inputId,
            className: "peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-border bg-surface-1 transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
            ...props
          }
        ),
        /* @__PURE__ */ jsx23(
          "svg",
          {
            className: "pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 3,
            viewBox: "0 0 24 24",
            children: /* @__PURE__ */ jsx23("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" })
          }
        )
      ] }),
      (label || description) && /* @__PURE__ */ jsxs18("label", { htmlFor: inputId, className: "cursor-pointer select-none", children: [
        label && /* @__PURE__ */ jsx23("span", { className: cn("text-sm font-medium", error ? "text-error" : "text-text"), children: label }),
        description && /* @__PURE__ */ jsx23("span", { className: "block text-xs text-text-3", children: description })
      ] })
    ] });
  }
);
Checkbox.displayName = "Checkbox";

// src/Radio.tsx
import { createContext, useContext, forwardRef as forwardRef8 } from "react";
import { jsx as jsx24, jsxs as jsxs19 } from "react/jsx-runtime";
var RadioGroupContext = createContext(null);
function RadioGroup({
  children,
  name,
  value,
  onChange,
  label,
  error,
  className,
  orientation = "vertical"
}) {
  const orientationClass = orientation === "horizontal" ? "flex-row gap-6" : "flex-col gap-3";
  return /* @__PURE__ */ jsx24(RadioGroupContext.Provider, { value: { name, value, onChange }, children: /* @__PURE__ */ jsxs19("fieldset", { className, children: [
    label && /* @__PURE__ */ jsx24("legend", { className: cn("mb-3 text-sm font-medium", error ? "text-error" : "text-text"), children: label }),
    /* @__PURE__ */ jsx24("div", { className: cn("flex", orientationClass), children }),
    error && /* @__PURE__ */ jsx24("p", { className: "mt-2 text-xs text-error", children: error })
  ] }) });
}
var Radio = forwardRef8(
  ({ className, label, description, value, id, ...props }, ref) => {
    const context = useContext(RadioGroupContext);
    const inputId = id || `${context?.name}-${value}`;
    const isChecked = context?.value === value;
    const handleChange = () => {
      context?.onChange?.(value);
    };
    return /* @__PURE__ */ jsxs19("div", { className: cn("flex items-start gap-3", className), children: [
      /* @__PURE__ */ jsxs19("div", { className: "relative flex h-5 items-center", children: [
        /* @__PURE__ */ jsx24(
          "input",
          {
            ref,
            type: "radio",
            id: inputId,
            name: context?.name,
            value,
            checked: isChecked,
            onChange: handleChange,
            className: "peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-border bg-surface-1 transition-colors checked:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
            ...props
          }
        ),
        /* @__PURE__ */ jsx24("div", { className: "pointer-events-none absolute left-1 top-1 h-3 w-3 scale-0 rounded-full bg-accent transition-transform peer-checked:scale-100" })
      ] }),
      (label || description) && /* @__PURE__ */ jsxs19("label", { htmlFor: inputId, className: "cursor-pointer select-none", children: [
        label && /* @__PURE__ */ jsx24("span", { className: "text-sm font-medium text-text", children: label }),
        description && /* @__PURE__ */ jsx24("span", { className: "block text-xs text-text-3", children: description })
      ] })
    ] });
  }
);
Radio.displayName = "Radio";

// src/Spinner.tsx
import { jsx as jsx25 } from "react/jsx-runtime";
function Spinner({ size = "md", className }) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3"
  };
  return /* @__PURE__ */ jsx25(
    "div",
    {
      className: cn(
        sizes[size],
        "animate-spin rounded-full border-accent border-t-transparent",
        className
      ),
      role: "status",
      "aria-label": "Loading"
    }
  );
}

// src/Progress.tsx
import { jsx as jsx26, jsxs as jsxs20 } from "react/jsx-runtime";
function Progress({
  value,
  max = 100,
  variant = "default",
  showLabel = false,
  size = "md",
  className
}) {
  const percentage = Math.min(Math.max(value / max * 100, 0), 100);
  const variants = {
    default: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error"
  };
  const sizes = {
    sm: "h-1.5",
    md: "h-2.5"
  };
  return /* @__PURE__ */ jsxs20("div", { className: cn("w-full", className), children: [
    /* @__PURE__ */ jsx26(
      "div",
      {
        className: cn(
          "w-full overflow-hidden rounded-full bg-surface-3",
          sizes[size]
        ),
        role: "progressbar",
        "aria-valuenow": value,
        "aria-valuemin": 0,
        "aria-valuemax": max,
        children: /* @__PURE__ */ jsx26(
          "div",
          {
            className: cn(
              "rounded-full transition-all duration-300",
              sizes[size],
              variants[variant]
            ),
            style: { width: `${percentage}%` }
          }
        )
      }
    ),
    showLabel && /* @__PURE__ */ jsxs20("span", { className: "mt-1 block text-xs text-text-3", children: [
      Math.round(percentage),
      "%"
    ] })
  ] });
}

// src/Accordion.tsx
import { useState as useState6 } from "react";
import { jsx as jsx27, jsxs as jsxs21 } from "react/jsx-runtime";
function AccordionItem({
  title,
  children,
  defaultOpen = false
}) {
  const [isOpen, setIsOpen] = useState6(defaultOpen);
  return /* @__PURE__ */ jsxs21("div", { className: "border-b border-border", children: [
    /* @__PURE__ */ jsxs21(
      "button",
      {
        onClick: () => setIsOpen(!isOpen),
        className: "flex w-full items-center justify-between py-4 text-left transition-colors hover:text-accent",
        "aria-expanded": isOpen,
        children: [
          /* @__PURE__ */ jsx27("span", { className: "text-sm font-medium text-text", children: title }),
          /* @__PURE__ */ jsx27(
            "svg",
            {
              className: cn(
                "h-5 w-5 text-text-3 transition-transform duration-200",
                isOpen ? "rotate-180" : ""
              ),
              fill: "none",
              stroke: "currentColor",
              viewBox: "0 0 24 24",
              children: /* @__PURE__ */ jsx27(
                "path",
                {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: 2,
                  d: "M19 9l-7 7-7-7"
                }
              )
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx27(
      "div",
      {
        className: cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-96 pb-4" : "max-h-0"
        ),
        children: /* @__PURE__ */ jsx27("div", { className: "text-sm text-text-2", children })
      }
    )
  ] });
}
function Accordion({ children, className }) {
  return /* @__PURE__ */ jsx27("div", { className: cn("divide-y divide-border", className), children });
}

// src/DropdownMenu.tsx
import { useState as useState7, useRef as useRef5, useEffect as useEffect4 } from "react";
import { jsx as jsx28, jsxs as jsxs22 } from "react/jsx-runtime";
function DropdownMenu({
  trigger,
  items,
  align = "end"
}) {
  const [isOpen, setIsOpen] = useState7(false);
  const menuRef = useRef5(null);
  useEffect4(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  const alignClass = align === "start" ? "left-0" : "right-0";
  return /* @__PURE__ */ jsxs22("div", { className: "relative inline-block", ref: menuRef, children: [
    /* @__PURE__ */ jsx28("div", { onClick: () => setIsOpen(!isOpen), children: trigger }),
    isOpen && /* @__PURE__ */ jsx28(
      "div",
      {
        className: cn(
          "absolute z-50 mt-2 min-w-[180px] overflow-hidden rounded-lg border border-border bg-surface-2 py-1 shadow-lg",
          alignClass
        ),
        children: items.map(
          (item, index) => item === "separator" ? /* @__PURE__ */ jsx28("div", { className: "my-1 h-px bg-border" }, index) : /* @__PURE__ */ jsxs22(
            "button",
            {
              onClick: () => {
                item.onClick?.();
                setIsOpen(false);
              },
              disabled: item.disabled,
              className: cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50",
                item.danger ? "text-error hover:bg-error/10" : "text-text hover:bg-surface-3"
              ),
              children: [
                item.icon && /* @__PURE__ */ jsx28("span", { className: "h-4 w-4 text-text-3", children: item.icon }),
                item.label
              ]
            },
            index
          )
        )
      }
    )
  ] });
}

// src/Popover.tsx
import { useState as useState8, useRef as useRef6, useEffect as useEffect5 } from "react";
import { jsx as jsx29, jsxs as jsxs23 } from "react/jsx-runtime";
function Popover({
  trigger,
  children,
  side = "bottom",
  align = "center"
}) {
  const [isOpen, setIsOpen] = useState8(false);
  const popoverRef = useRef6(null);
  useEffect5(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  const positions = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2"
  };
  const alignments = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0"
  };
  return /* @__PURE__ */ jsxs23("div", { className: "relative inline-block", ref: popoverRef, children: [
    /* @__PURE__ */ jsx29("div", { onClick: () => setIsOpen(!isOpen), children: trigger }),
    isOpen && /* @__PURE__ */ jsx29(
      "div",
      {
        className: cn(
          "absolute z-50 min-w-[200px] rounded-lg border border-border bg-surface-2 p-4 shadow-lg",
          positions[side],
          alignments[align]
        ),
        children
      }
    )
  ] });
}

// src/Breadcrumb.tsx
import Link from "next/link";
import { Fragment as Fragment3 } from "react";
import { jsx as jsx30, jsxs as jsxs24 } from "react/jsx-runtime";
function Breadcrumb({ items, className }) {
  return /* @__PURE__ */ jsx30("nav", { "aria-label": "Breadcrumb", className, children: /* @__PURE__ */ jsx30("ol", { className: "flex items-center gap-2 text-sm", children: items.map((item, index) => /* @__PURE__ */ jsxs24(Fragment3, { children: [
    index > 0 && /* @__PURE__ */ jsx30("li", { className: "text-text-3", "aria-hidden": "true", children: /* @__PURE__ */ jsx30("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx30("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) }) }),
    /* @__PURE__ */ jsx30("li", { children: item.href && index < items.length - 1 ? /* @__PURE__ */ jsx30(
      Link,
      {
        href: item.href,
        className: "text-text-3 transition-colors hover:text-text",
        children: item.label
      }
    ) : /* @__PURE__ */ jsx30("span", { className: "font-medium text-text", children: item.label }) })
  ] }, index)) }) });
}

// src/Pagination.tsx
import { jsx as jsx31, jsxs as jsxs25 } from "react/jsx-runtime";
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className
}) {
  const pages = generatePageNumbers(currentPage, totalPages);
  return /* @__PURE__ */ jsxs25("nav", { "aria-label": "Pagination", className: cn("flex items-center gap-1", className), children: [
    /* @__PURE__ */ jsx31(
      "button",
      {
        onClick: () => onPageChange(currentPage - 1),
        disabled: currentPage === 1,
        className: "flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-3 transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50 disabled:hover:bg-transparent",
        "aria-label": "Previous page",
        children: /* @__PURE__ */ jsx31("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx31("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) })
      }
    ),
    pages.map(
      (page, index) => page === "..." ? /* @__PURE__ */ jsx31("span", { className: "px-2 text-text-3", children: "..." }, `ellipsis-${index}`) : /* @__PURE__ */ jsx31(
        "button",
        {
          onClick: () => onPageChange(page),
          className: cn(
            "flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
            currentPage === page ? "bg-accent text-white" : "border border-border text-text-2 hover:bg-surface-2 hover:text-text"
          ),
          "aria-current": currentPage === page ? "page" : void 0,
          children: page
        },
        page
      )
    ),
    /* @__PURE__ */ jsx31(
      "button",
      {
        onClick: () => onPageChange(currentPage + 1),
        disabled: currentPage === totalPages,
        className: "flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-3 transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50 disabled:hover:bg-transparent",
        "aria-label": "Next page",
        children: /* @__PURE__ */ jsx31("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx31("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })
      }
    )
  ] });
}
function generatePageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

// src/Toast.tsx
import { createContext as createContext2, useContext as useContext2, useState as useState9, useCallback as useCallback2, useEffect as useEffect6 } from "react";
import { jsx as jsx32, jsxs as jsxs26 } from "react/jsx-runtime";
var ToastContext = createContext2(null);
function useToast() {
  const context = useContext2(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState9([]);
  const addToast = useCallback2(
    (props) => {
      const id = Math.random().toString(36).slice(2);
      const { title, variant = "info", description, action } = props;
      setToasts((prev) => [...prev, { id, title, description, variant, action }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4e3);
    },
    []
  );
  const removeToast = useCallback2((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return /* @__PURE__ */ jsxs26(ToastContext.Provider, { value: { toasts, addToast, removeToast }, children: [
    children,
    /* @__PURE__ */ jsx32(ToastContainer, { toasts, removeToast })
  ] });
}
function ToastContainer({
  toasts,
  removeToast
}) {
  return /* @__PURE__ */ jsx32("div", { className: "fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none", children: toasts.map((toast) => /* @__PURE__ */ jsx32(ToastItem, { toast, onClose: () => removeToast(toast.id) }, toast.id)) });
}
var variantConfig = {
  success: {
    borderColor: "border-success/30",
    bgColor: "bg-success/5",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    accentBar: "bg-success"
  },
  error: {
    borderColor: "border-error/30",
    bgColor: "bg-error/5",
    iconBg: "bg-error/10",
    iconColor: "text-error",
    accentBar: "bg-error"
  },
  warning: {
    borderColor: "border-warning/30",
    bgColor: "bg-warning/5",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    accentBar: "bg-warning"
  },
  info: {
    borderColor: "border-info/30",
    bgColor: "bg-info/5",
    iconBg: "bg-info/10",
    iconColor: "text-info",
    accentBar: "bg-info"
  }
};
var icons2 = {
  success: /* @__PURE__ */ jsx32("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2.5, children: /* @__PURE__ */ jsx32("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) }),
  error: /* @__PURE__ */ jsx32("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2.5, children: /* @__PURE__ */ jsx32("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }),
  warning: /* @__PURE__ */ jsx32("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2.5, children: /* @__PURE__ */ jsx32("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v2m0 4h.01" }) }),
  info: /* @__PURE__ */ jsx32("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2.5, children: /* @__PURE__ */ jsx32("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 16h-1v-4h-1m1-4h.01" }) })
};
function ToastItem({ toast, onClose }) {
  const [isVisible, setIsVisible] = useState9(false);
  const [progress, setProgress] = useState9(100);
  const config = variantConfig[toast.variant];
  useEffect6(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    const startTime = Date.now();
    const duration = 4e3;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - elapsed / duration * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(progressInterval);
    }, 50);
    return () => {
      clearTimeout(showTimer);
      clearInterval(progressInterval);
    };
  }, []);
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 180);
  };
  return /* @__PURE__ */ jsxs26(
    "div",
    {
      className: cn(
        "pointer-events-auto relative overflow-hidden flex items-start gap-3 min-w-[320px] max-w-[400px] rounded-lg border bg-surface-1 backdrop-blur-sm p-3 pr-10 shadow-sm transition-all duration-[180ms] ease-out",
        config.borderColor,
        config.bgColor,
        isVisible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
      ),
      role: "alert",
      children: [
        /* @__PURE__ */ jsx32("div", { className: cn("absolute left-0 top-0 bottom-0 w-0.5", config.accentBar) }),
        /* @__PURE__ */ jsx32("div", { className: cn("flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-md", config.iconBg, config.iconColor), children: icons2[toast.variant] }),
        /* @__PURE__ */ jsxs26("div", { className: "flex-1 min-w-0 pt-0.5", children: [
          /* @__PURE__ */ jsx32("p", { className: "text-sm font-medium text-text leading-tight", children: toast.title }),
          toast.description && /* @__PURE__ */ jsx32("p", { className: "mt-0.5 text-xs text-text-3 leading-relaxed", children: toast.description }),
          toast.action && /* @__PURE__ */ jsx32(
            "button",
            {
              onClick: () => {
                toast.action?.onClick();
                handleClose();
              },
              className: "mt-2 text-xs font-medium text-accent hover:text-accent-hover transition-colors",
              children: toast.action.label
            }
          )
        ] }),
        /* @__PURE__ */ jsx32(
          "button",
          {
            onClick: handleClose,
            className: "absolute top-2 right-2 rounded-md p-1.5 text-text-3 hover:text-text hover:bg-surface-3 transition-colors",
            "aria-label": "Dismiss",
            children: /* @__PURE__ */ jsx32("svg", { className: "h-3.5 w-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx32("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
          }
        ),
        /* @__PURE__ */ jsx32("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-border/30", children: /* @__PURE__ */ jsx32(
          "div",
          {
            className: cn("h-full transition-all duration-75 ease-linear", config.accentBar),
            style: { width: `${progress}%` }
          }
        ) })
      ]
    }
  );
}

// src/CommandPalette.tsx
import { useState as useState10, useEffect as useEffect7, useRef as useRef7, useCallback as useCallback3, useMemo } from "react";
import { jsx as jsx33, jsxs as jsxs27 } from "react/jsx-runtime";
function CommandPalette({
  commands,
  placeholder = "Type a command or search..."
}) {
  const [isOpen, setIsOpen] = useState10(false);
  const [query, setQuery] = useState10("");
  const [selectedIndex, setSelectedIndex] = useState10(0);
  const inputRef = useRef7(null);
  const listRef = useRef7(null);
  const filteredCommands = useMemo(() => {
    const searchText = query.toLowerCase();
    return commands.filter(
      (cmd) => cmd.label.toLowerCase().includes(searchText) || cmd.description?.toLowerCase().includes(searchText) || cmd.keywords?.some((k) => k.toLowerCase().includes(searchText))
    );
  }, [commands, query]);
  const handleQueryChange = useCallback3((newQuery) => {
    setQuery(newQuery);
    setSelectedIndex(0);
  }, []);
  const executeCommand = useCallback3((cmd) => {
    cmd.action();
    setIsOpen(false);
    setQuery("");
  }, []);
  const handleKeyDown = useCallback3(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (!isOpen) return;
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      }
      if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    },
    [isOpen, filteredCommands, selectedIndex, executeCommand]
  );
  useEffect7(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
  useEffect7(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        setSelectedIndex(0);
      });
    }
  }, [isOpen]);
  useEffect7(() => {
    if (listRef.current && filteredCommands.length > 0) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filteredCommands.length]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxs27("div", { className: "fixed inset-0 z-50 flex items-start justify-center pt-[15vh]", children: [
    /* @__PURE__ */ jsx33(
      "div",
      {
        className: "absolute inset-0 bg-black/70 backdrop-blur-sm",
        onClick: () => {
          setIsOpen(false);
          setQuery("");
        }
      }
    ),
    /* @__PURE__ */ jsxs27("div", { className: "relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface-1 shadow-2xl shadow-black/50", children: [
      /* @__PURE__ */ jsxs27("div", { className: "flex items-center gap-3 border-b border-border px-4", children: [
        /* @__PURE__ */ jsx33(
          "svg",
          {
            className: "h-5 w-5 flex-shrink-0 text-text-3",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /* @__PURE__ */ jsx33(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              }
            )
          }
        ),
        /* @__PURE__ */ jsx33(
          "input",
          {
            ref: inputRef,
            type: "text",
            value: query,
            onChange: (e) => handleQueryChange(e.target.value),
            placeholder,
            className: "flex-1 border-none bg-transparent py-4 text-base text-text outline-none ring-0 placeholder:text-text-3 focus:border-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:ring-0 focus-visible:shadow-none",
            style: { boxShadow: "none", outline: "none" }
          }
        ),
        /* @__PURE__ */ jsx33("div", { className: "flex items-center gap-1.5", children: /* @__PURE__ */ jsx33("kbd", { className: "rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-3", children: "ESC" }) })
      ] }),
      /* @__PURE__ */ jsx33("div", { ref: listRef, className: "max-h-80 overflow-y-auto p-2", children: filteredCommands.length === 0 ? /* @__PURE__ */ jsxs27("div", { className: "flex flex-col items-center justify-center py-12 text-center", children: [
        /* @__PURE__ */ jsx33(
          "svg",
          {
            className: "mb-3 h-10 w-10 text-text-3/50",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /* @__PURE__ */ jsx33(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 1.5,
                d: "M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              }
            )
          }
        ),
        /* @__PURE__ */ jsx33("p", { className: "text-sm text-text-3", children: "No results found" }),
        /* @__PURE__ */ jsx33("p", { className: "mt-1 text-xs text-text-3/70", children: "Try searching for something else" })
      ] }) : filteredCommands.map((cmd, index) => /* @__PURE__ */ jsxs27(
        "button",
        {
          onClick: () => executeCommand(cmd),
          onMouseEnter: () => setSelectedIndex(index),
          className: cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
            index === selectedIndex ? "bg-accent text-white" : "text-text hover:bg-surface-2"
          ),
          children: [
            cmd.icon ? /* @__PURE__ */ jsx33(
              "span",
              {
                className: cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                  index === selectedIndex ? "bg-white/20 text-white" : "bg-surface-2 text-text-2"
                ),
                children: cmd.icon
              }
            ) : /* @__PURE__ */ jsx33(
              "span",
              {
                className: cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                  index === selectedIndex ? "bg-white/20 text-white" : "bg-surface-2 text-text-3"
                ),
                children: /* @__PURE__ */ jsx33("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx33("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })
              }
            ),
            /* @__PURE__ */ jsxs27("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx33("p", { className: "truncate text-sm font-medium", children: cmd.label }),
              cmd.description && /* @__PURE__ */ jsx33(
                "p",
                {
                  className: cn(
                    "truncate text-xs",
                    index === selectedIndex ? "text-white/70" : "text-text-3"
                  ),
                  children: cmd.description
                }
              )
            ] }),
            cmd.shortcut && /* @__PURE__ */ jsx33(
              "kbd",
              {
                className: cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[10px]",
                  index === selectedIndex ? "border-white/30 text-white/70" : "border-border text-text-3"
                ),
                children: cmd.shortcut
              }
            )
          ]
        },
        cmd.id
      )) }),
      /* @__PURE__ */ jsxs27("div", { className: "flex items-center justify-between border-t border-border bg-surface-2/50 px-4 py-2 text-xs text-text-3", children: [
        /* @__PURE__ */ jsxs27("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs27("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx33("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px]", children: "\u2191" }),
            /* @__PURE__ */ jsx33("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px]", children: "\u2193" }),
            /* @__PURE__ */ jsx33("span", { className: "ml-1", children: "to navigate" })
          ] }),
          /* @__PURE__ */ jsxs27("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx33("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px]", children: "\u21B5" }),
            /* @__PURE__ */ jsx33("span", { className: "ml-1", children: "to select" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs27("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsx33("kbd", { className: "rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[10px]", children: "\u2318K" }),
          /* @__PURE__ */ jsx33("span", { className: "ml-1", children: "to toggle" })
        ] })
      ] })
    ] })
  ] });
}
function useCommandPalette() {
  const open = useCallback3(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true })
    );
  }, []);
  return { open };
}

// src/FileTree.tsx
import { useState as useState11, useRef as useRef8 } from "react";
import { Fragment as Fragment4, jsx as jsx34, jsxs as jsxs28 } from "react/jsx-runtime";
var permissionConfig = {
  owner: { label: "Owner", variant: "success" },
  editor: { label: "Editor", variant: "info" },
  viewer: { label: "Viewer", variant: "default" },
  inherited: { label: "Inherited", variant: "warning" }
};
var storageProviderConfig = {
  s3: { label: "S3", color: "text-orange-400" },
  r2: { label: "R2", color: "text-amber-400" },
  minio: { label: "MinIO", color: "text-pink-400" },
  local: { label: "Local", color: "text-text-3" }
};
var getFileIcon = (name) => {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" }) });
    case "pdf":
      return /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" }) });
    case "md":
    case "mdx":
    case "txt":
      return /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) });
    case "json":
    case "yaml":
    case "yml":
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" }) });
    case "zip":
    case "tar":
    case "gz":
      return /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" }) });
    default:
      return /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) });
  }
};
function FileTree({
  initialData,
  className,
  showMetadata = true,
  showActions = true,
  onNodeSelect,
  onNodeMove
}) {
  const [data, setData] = useState11(initialData);
  const [selectedId, setSelectedId] = useState11(null);
  const [dragOverId, setDragOverId] = useState11(null);
  const [renamingId, setRenamingId] = useState11(null);
  const [renameValue, setRenameValue] = useState11("");
  const [searchQuery, setSearchQuery] = useState11("");
  const [isSearching, setIsSearching] = useState11(false);
  const { addToast } = useToast();
  const inputRef = useRef8(null);
  const searchInputRef = useRef8(null);
  function searchNodes(nodes, query, currentPath = "") {
    const results = [];
    const lowerQuery = query.toLowerCase();
    for (const node of nodes) {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
      const lowerName = node.name.toLowerCase();
      if (lowerName.includes(lowerQuery)) {
        results.push({ node, path: nodePath, matchType: "name" });
      } else if (node.type === "file" && node.name.includes(".")) {
        const ext = node.name.split(".").pop()?.toLowerCase() || "";
        if (ext.includes(lowerQuery)) {
          results.push({ node, path: nodePath, matchType: "extension" });
        }
      }
      if (node.children) {
        results.push(...searchNodes(node.children, query, nodePath));
      }
    }
    return results;
  }
  const searchResults = searchQuery.length >= 2 ? searchNodes(data, searchQuery) : [];
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  };
  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    searchInputRef.current?.focus();
  };
  const selectSearchResult = (result) => {
    const pathParts = result.path.split("/");
    let currentPath = "";
    setData((prev) => {
      let newData = [...prev];
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
        const folderName = pathParts[i];
        newData = expandFolderByName(newData, folderName);
      }
      return newData;
    });
    setSelectedId(result.node.id);
    setIsSearching(false);
    setSearchQuery("");
    addToast({
      title: `Found in ${result.node.storageProvider?.toUpperCase() || "storage"}`,
      description: `/${result.path}`,
      variant: "info"
    });
  };
  function expandFolderByName(nodes, folderName) {
    return nodes.map((node) => {
      if (node.name === folderName && node.type === "folder") {
        return { ...node, expanded: true };
      }
      if (node.children) {
        return { ...node, children: expandFolderByName(node.children, folderName) };
      }
      return node;
    });
  }
  function highlightMatch(text, query) {
    if (!query || query.length < 2) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return text;
    return /* @__PURE__ */ jsxs28(Fragment4, { children: [
      text.slice(0, index),
      /* @__PURE__ */ jsx34("span", { className: "bg-accent/30 text-accent font-semibold", children: text.slice(index, index + query.length) }),
      text.slice(index + query.length)
    ] });
  }
  function updateNode(nodes, id, updater) {
    return nodes.map((node) => {
      if (node.id === id) {
        return updater(node);
      }
      if (node.children) {
        return { ...node, children: updateNode(node.children, id, updater) };
      }
      return node;
    });
  }
  function findNode(nodes, id) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }
  function removeNode(nodes, id) {
    return nodes.filter((node) => node.id !== id).map((node) => {
      if (node.children) {
        return { ...node, children: removeNode(node.children, id) };
      }
      return node;
    });
  }
  const handleToggle = (id) => {
    setData((prev) => updateNode(prev, id, (node) => ({ ...node, expanded: !node.expanded })));
  };
  const handleSelect = (node) => {
    setSelectedId(node.id);
    onNodeSelect?.(node);
  };
  const startRename = (node) => {
    setRenamingId(node.id);
    setRenameValue(node.name);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const completeRename = (id) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    setData(
      (prev) => updateNode(prev, id, (node) => ({
        ...node,
        name: renameValue,
        lastOperation: { type: "rename", timestamp: "just now" }
      }))
    );
    addToast({
      title: "Renamed instantly",
      description: "Metadata transaction committed in 12ms",
      variant: "success"
    });
    setRenamingId(null);
  };
  const handleDragStart = (e, node) => {
    e.dataTransfer.setData("nodeId", node.id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, node) => {
    e.preventDefault();
    if (node.type === "folder") {
      setDragOverId(node.id);
    }
  };
  const handleDragLeave = () => {
    setDragOverId(null);
  };
  const handleDrop = (e, targetNode) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = e.dataTransfer.getData("nodeId");
    if (!sourceId || sourceId === targetNode.id || targetNode.type !== "folder") return;
    const sourceNode = findNode(data, sourceId);
    if (!sourceNode) return;
    let newData = removeNode(data, sourceId);
    newData = updateNode(newData, targetNode.id, (node) => ({
      ...node,
      expanded: true,
      children: [...node.children || [], {
        ...sourceNode,
        lastOperation: { type: "move", timestamp: "just now" }
      }]
    }));
    setData(newData);
    onNodeMove?.(sourceId, targetNode.id);
    addToast({
      title: "Moved instantly",
      description: "No copy/delete \u2014 pure metadata transaction (8ms)",
      variant: "success"
    });
  };
  const handleShare = (node) => {
    setData(
      (prev) => updateNode(prev, node.id, (n) => ({
        ...n,
        isPublicLink: true,
        lastOperation: { type: "share", timestamp: "just now" }
      }))
    );
    addToast({
      title: "Share link created",
      description: `Signed URL generated \u2022 Expires in 1 hour`,
      variant: "success"
    });
  };
  const handleDelete = (node) => {
    setData((prev) => removeNode(prev, node.id));
    addToast({
      title: "Moved to trash",
      description: "Soft delete \u2014 can be restored for 30 days",
      variant: "info"
    });
  };
  const handleUndo = (node) => {
    addToast({
      title: "Operation undone",
      description: `Restored "${node.name}" from audit log`,
      variant: "success"
    });
  };
  const getContextMenuItems = (node) => [
    { label: "Rename", onClick: () => startRename(node) },
    { label: "Share", onClick: () => handleShare(node) },
    "separator",
    { label: "Move to...", onClick: () => addToast({ title: "Move dialog", variant: "info" }) },
    { label: "Copy path", onClick: () => {
      navigator.clipboard.writeText(`/${node.name}`);
      addToast({ title: "Path copied", variant: "info" });
    } },
    "separator",
    ...node.lastOperation ? [{ label: "Undo " + node.lastOperation.type, onClick: () => handleUndo(node) }] : [],
    { label: "Delete", danger: true, onClick: () => handleDelete(node) }
  ];
  const renderTree = (nodes, depth = 0) => {
    return nodes.map((node) => {
      const isSelected = selectedId === node.id;
      const isDragOver = dragOverId === node.id;
      const isRenaming = renamingId === node.id;
      const hasPermission = node.permission && node.permission !== "inherited";
      const hasSharing = node.sharedWith?.length || node.isPublicLink;
      const hasVersions = node.versions && node.versions > 1;
      return /* @__PURE__ */ jsxs28("div", { children: [
        /* @__PURE__ */ jsxs28(
          "div",
          {
            className: cn(
              "group flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md transition-all text-sm",
              isSelected ? "bg-accent/10 text-accent" : isDragOver ? "bg-accent/20 border-accent border-dashed border" : "text-text-2 hover:bg-surface-2 hover:text-text"
            ),
            style: { paddingLeft: `${depth * 1.25 + 0.5}rem` },
            onClick: () => {
              if (!isRenaming) {
                if (node.type === "folder") handleToggle(node.id);
                handleSelect(node);
              }
            },
            draggable: !isRenaming,
            onDragStart: (e) => handleDragStart(e, node),
            onDragOver: (e) => handleDragOver(e, node),
            onDragLeave: handleDragLeave,
            onDrop: (e) => handleDrop(e, node),
            children: [
              node.type === "folder" ? /* @__PURE__ */ jsx34("span", { className: cn("flex-shrink-0 transition-transform", node.expanded ? "rotate-90" : ""), children: /* @__PURE__ */ jsx34("svg", { className: "h-3 w-3 text-text-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) }) }) : /* @__PURE__ */ jsx34("span", { className: "w-3" }),
              /* @__PURE__ */ jsx34("span", { className: cn("flex-shrink-0", isSelected ? "text-accent" : "text-text-3"), children: node.type === "folder" ? /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { d: "M19.5 21a1.5 1.5 0 001.5-1.5v-11a1.5 1.5 0 00-1.5-1.5H13l-2-3H4a1.5 1.5 0 00-1.5 1.5v14A1.5 1.5 0 003.5 21h16z" }) }) : getFileIcon(node.name) }),
              isRenaming ? /* @__PURE__ */ jsx34(
                "input",
                {
                  ref: inputRef,
                  type: "text",
                  value: renameValue,
                  onChange: (e) => setRenameValue(e.target.value),
                  onBlur: () => completeRename(node.id),
                  onKeyDown: (e) => {
                    if (e.key === "Enter") completeRename(node.id);
                    if (e.key === "Escape") setRenamingId(null);
                  },
                  className: "flex-1 bg-surface-3 px-1 py-0.5 rounded text-xs font-mono text-text focus:outline-none focus:ring-1 focus:ring-accent",
                  onClick: (e) => e.stopPropagation()
                }
              ) : /* @__PURE__ */ jsx34("span", { className: "flex-1 truncate font-mono text-xs", children: node.name }),
              showMetadata && !isRenaming && /* @__PURE__ */ jsxs28("div", { className: "flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity", children: [
                hasPermission && /* @__PURE__ */ jsx34(Badge, { variant: permissionConfig[node.permission].variant, size: "sm", children: permissionConfig[node.permission].label }),
                hasSharing && /* @__PURE__ */ jsx34("span", { className: "text-accent", title: node.isPublicLink ? "Public link" : `Shared with ${node.sharedWith?.length}`, children: /* @__PURE__ */ jsx34("svg", { className: "h-3.5 w-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.001l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" }) }) }),
                hasVersions && /* @__PURE__ */ jsxs28("span", { className: "text-xs text-text-3 font-mono", title: `${node.versions} versions`, children: [
                  "v",
                  node.versions
                ] })
              ] }),
              node.size && /* @__PURE__ */ jsx34("span", { className: "text-[10px] text-text-3 opacity-60 font-mono group-hover:opacity-100 transition-opacity", children: node.size }),
              showMetadata && node.storageProvider && /* @__PURE__ */ jsx34(
                "span",
                {
                  className: cn(
                    "text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity",
                    storageProviderConfig[node.storageProvider].color
                  ),
                  title: `Stored in ${storageProviderConfig[node.storageProvider].label}`,
                  children: storageProviderConfig[node.storageProvider].label
                }
              ),
              node.lastOperation && /* @__PURE__ */ jsx34("span", { className: "text-[10px] text-accent opacity-60", title: `Last: ${node.lastOperation.type}`, children: "\u2022" }),
              showActions && /* @__PURE__ */ jsx34("div", { className: "opacity-0 group-hover:opacity-100 transition-opacity", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsx34(
                DropdownMenu,
                {
                  trigger: /* @__PURE__ */ jsx34(IconButton, { variant: "ghost", size: "sm", "aria-label": "Actions", children: /* @__PURE__ */ jsx34("svg", { className: "h-3.5 w-3.5", fill: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { d: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" }) }) }),
                  items: getContextMenuItems(node)
                }
              ) })
            ]
          }
        ),
        node.type === "folder" && node.expanded && node.children && /* @__PURE__ */ jsx34("div", { className: "border-l border-border/40 ml-[calc(0.5rem+11px)]", children: renderTree(node.children, depth + 1) })
      ] }, node.id);
    });
  };
  const totalFiles = countNodes(data, "file");
  const totalFolders = countNodes(data, "folder");
  return /* @__PURE__ */ jsxs28("div", { className: cn("rounded-xl border border-border bg-surface-1 overflow-hidden", className), children: [
    /* @__PURE__ */ jsxs28("div", { className: "flex items-center justify-between border-b border-border px-3 py-2 bg-surface-2/50", children: [
      /* @__PURE__ */ jsxs28("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx34("span", { className: "text-xs font-semibold uppercase tracking-wider text-text-3", children: "Filesystem" }),
        /* @__PURE__ */ jsxs28(Badge, { variant: "outline", size: "sm", children: [
          totalFolders,
          " folders"
        ] }),
        /* @__PURE__ */ jsxs28(Badge, { variant: "outline", size: "sm", children: [
          totalFiles,
          " files"
        ] })
      ] }),
      /* @__PURE__ */ jsx34("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxs28("div", { className: "flex gap-1", children: [
        /* @__PURE__ */ jsx34("div", { className: "h-2 w-2 rounded-full bg-error/40" }),
        /* @__PURE__ */ jsx34("div", { className: "h-2 w-2 rounded-full bg-warning/40" }),
        /* @__PURE__ */ jsx34("div", { className: "h-2 w-2 rounded-full bg-success/40" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs28("div", { className: "border-b border-border bg-surface-2/30 px-3 py-2", children: [
      /* @__PURE__ */ jsxs28("div", { className: "relative", children: [
        /* @__PURE__ */ jsx34("div", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3", children: /* @__PURE__ */ jsx34("svg", { className: "h-3.5 w-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }) }),
        /* @__PURE__ */ jsx34(
          "input",
          {
            ref: searchInputRef,
            type: "text",
            value: searchQuery,
            onChange: (e) => handleSearch(e.target.value),
            placeholder: "Search across all buckets... (S3, R2, MinIO)",
            className: "w-full h-8 pl-8 pr-8 rounded-md border border-border bg-surface-1 text-xs text-text placeholder:text-text-3/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
          }
        ),
        searchQuery && /* @__PURE__ */ jsx34(
          "button",
          {
            onClick: clearSearch,
            className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text transition-colors",
            children: /* @__PURE__ */ jsx34("svg", { className: "h-3.5 w-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
          }
        )
      ] }),
      isSearching && searchResults.length > 0 && /* @__PURE__ */ jsxs28("div", { className: "mt-2 rounded-md border border-border bg-surface-1 shadow-lg max-h-[200px] overflow-y-auto", children: [
        /* @__PURE__ */ jsx34("div", { className: "px-2 py-1.5 border-b border-border bg-surface-2/50", children: /* @__PURE__ */ jsxs28("span", { className: "text-[10px] font-medium text-text-3 uppercase tracking-wider", children: [
          searchResults.length,
          " result",
          searchResults.length !== 1 ? "s" : "",
          " across all buckets"
        ] }) }),
        searchResults.map((result) => /* @__PURE__ */ jsxs28(
          "button",
          {
            onClick: () => selectSearchResult(result),
            className: "w-full flex items-center gap-2 px-2 py-2 hover:bg-surface-2 transition-colors text-left border-b border-border/50 last:border-b-0",
            children: [
              /* @__PURE__ */ jsx34("span", { className: "text-text-3 flex-shrink-0", children: result.node.type === "folder" ? /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { d: "M19.5 21a1.5 1.5 0 001.5-1.5v-11a1.5 1.5 0 00-1.5-1.5H13l-2-3H4a1.5 1.5 0 00-1.5 1.5v14A1.5 1.5 0 003.5 21h16z" }) }) : /* @__PURE__ */ jsx34("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx34("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }) }),
              /* @__PURE__ */ jsxs28("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx34("div", { className: "text-xs font-medium text-text truncate", children: highlightMatch(result.node.name, searchQuery) }),
                /* @__PURE__ */ jsxs28("div", { className: "text-[10px] text-text-3 font-mono truncate", children: [
                  "/",
                  result.path
                ] })
              ] }),
              result.node.storageProvider && /* @__PURE__ */ jsx34("span", { className: cn(
                "text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-surface-3",
                result.node.storageProvider === "s3" ? "text-orange-400" : result.node.storageProvider === "r2" ? "text-amber-400" : result.node.storageProvider === "minio" ? "text-pink-400" : "text-text-3"
              ), children: result.node.storageProvider.toUpperCase() }),
              result.node.size && /* @__PURE__ */ jsx34("span", { className: "text-[10px] text-text-3 font-mono", children: result.node.size })
            ]
          },
          result.node.id
        ))
      ] }),
      isSearching && searchQuery.length >= 2 && searchResults.length === 0 && /* @__PURE__ */ jsx34("div", { className: "mt-2 rounded-md border border-border bg-surface-1 px-3 py-4 text-center", children: /* @__PURE__ */ jsxs28("span", { className: "text-xs text-text-3", children: [
        "No files found for \u201C",
        searchQuery,
        "\u201D"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs28("div", { className: "border-b border-border bg-surface-1/50 px-3 py-1.5 flex items-center gap-1 text-[11px] font-mono text-text-3", children: [
      /* @__PURE__ */ jsx34("span", { className: "text-accent", children: "/" }),
      /* @__PURE__ */ jsx34("span", { children: "root" }),
      selectedId && /* @__PURE__ */ jsxs28(Fragment4, { children: [
        /* @__PURE__ */ jsx34("span", { className: "text-text-3/40", children: "/" }),
        /* @__PURE__ */ jsx34("span", { className: "text-text-2", children: findNode(data, selectedId)?.name || "" })
      ] })
    ] }),
    /* @__PURE__ */ jsx34("div", { className: "max-h-[400px] overflow-y-auto p-2", children: renderTree(data) }),
    /* @__PURE__ */ jsxs28("div", { className: "border-t border-border bg-surface-2/30 px-3 py-1.5 flex items-center justify-between text-[10px] text-text-3", children: [
      /* @__PURE__ */ jsx34("span", { children: "Roset Control Plane \u2022 Recursive search across all storage backends" }),
      /* @__PURE__ */ jsxs28("span", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsx34("span", { className: "inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" }),
        "Connected"
      ] })
    ] })
  ] });
}
function countNodes(nodes, type) {
  let count = 0;
  for (const node of nodes) {
    if (node.type === type) count++;
    if (node.children) count += countNodes(node.children, type);
  }
  return count;
}

// src/ActivityLog.tsx
import { jsx as jsx35, jsxs as jsxs29 } from "react/jsx-runtime";
function ActivityLog({ activities, className }) {
  return /* @__PURE__ */ jsxs29("div", { className: cn("rounded-xl border border-border bg-surface-1 p-4", className), children: [
    /* @__PURE__ */ jsx35("h3", { className: "mb-4 text-xs font-semibold uppercase tracking-wider text-text-3", children: "Live Operation Log" }),
    /* @__PURE__ */ jsx35("div", { className: "space-y-4", children: activities.map((activity, index) => /* @__PURE__ */ jsxs29("div", { className: "relative flex gap-3", children: [
      index !== activities.length - 1 && /* @__PURE__ */ jsx35("div", { className: "absolute left-[11px] top-6 bottom-[-20px] w-px bg-border" }),
      /* @__PURE__ */ jsx35("div", { className: "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2", children: /* @__PURE__ */ jsx35("div", { className: cn("h-2 w-2 rounded-full", getActionColor(activity.action)) }) }),
      /* @__PURE__ */ jsxs29("div", { className: "flex-1 pt-0.5", children: [
        /* @__PURE__ */ jsxs29("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx35("span", { className: "text-sm font-medium text-text", children: activity.action === "authorize" ? "Authz Check" : capitalize(activity.action) }),
          /* @__PURE__ */ jsx35("span", { className: "font-mono text-xs text-text-3", children: activity.timestamp })
        ] }),
        /* @__PURE__ */ jsxs29("p", { className: "mt-0.5 text-xs text-text-3", children: [
          /* @__PURE__ */ jsx35("span", { className: "text-text-2", children: activity.actor }),
          " ",
          activity.action,
          "d",
          " ",
          /* @__PURE__ */ jsx35("span", { className: "font-mono text-accent", children: activity.target })
        ] })
      ] })
    ] }, activity.id)) })
  ] });
}
function getActionColor(action) {
  switch (action) {
    case "delete":
      return "bg-error";
    case "authorize":
      return "bg-warning";
    case "move":
    case "rename":
      return "bg-info";
    case "restore":
      return "bg-success";
    case "share":
      return "bg-accent";
    default:
      return "bg-accent";
  }
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// src/ShareDialog.tsx
import { useState as useState12 } from "react";
import { Fragment as Fragment5, jsx as jsx36, jsxs as jsxs30 } from "react/jsx-runtime";
function ShareDialog({
  fileName,
  filePath = "/assets",
  initialUsers = []
}) {
  const [users, setUsers] = useState12(initialUsers);
  const [emailStr, setEmailStr] = useState12("");
  const [selectedRole, setSelectedRole] = useState12("viewer");
  const [shareLink, setShareLink] = useState12({
    id: "link-1",
    type: "public",
    permission: "view",
    expiresIn: "1 hour",
    accessCount: 0
  });
  const [linkExpiry, setLinkExpiry] = useState12("1h");
  const { addToast } = useToast();
  const handleInvite = () => {
    if (!emailStr || !emailStr.includes("@")) {
      addToast({ title: "Invalid email", description: "Please enter a valid email address", variant: "error" });
      return;
    }
    if (users.some((u) => u.email === emailStr)) {
      addToast({ title: "Already invited", description: "This user already has access", variant: "warning" });
      return;
    }
    setUsers([
      ...users,
      {
        id: Math.random().toString(36).slice(2),
        name: emailStr.split("@")[0],
        email: emailStr,
        role: selectedRole,
        addedAt: "just now"
      }
    ]);
    setEmailStr("");
    addToast({
      title: "Invite sent",
      description: `${emailStr} can now ${selectedRole === "editor" ? "edit" : "view"} this file`,
      variant: "success"
    });
  };
  const removeUser = (user) => {
    setUsers(users.filter((u) => u.id !== user.id));
    addToast({
      title: "Access revoked instantly",
      description: `${user.name} can no longer access this file`,
      variant: "info"
    });
  };
  const copyLink = () => {
    const mockUrl = `https://cdn.roset.io/s/${Math.random().toString(36).slice(2, 10)}`;
    navigator.clipboard.writeText(mockUrl);
    addToast({
      title: "Signed URL copied",
      description: `Expires in ${shareLink?.expiresIn || "1 hour"}`,
      variant: "success"
    });
  };
  const revokeLink = () => {
    setShareLink(null);
    addToast({
      title: "Link revoked",
      description: "All existing links are now invalid",
      variant: "info"
    });
  };
  const createLink = () => {
    const expiryMap = { "1h": "1 hour", "24h": "24 hours", "7d": "7 days", "30d": "30 days" };
    setShareLink({
      id: Math.random().toString(36).slice(2),
      type: "public",
      permission: "view",
      expiresIn: expiryMap[linkExpiry],
      accessCount: 0
    });
    addToast({
      title: "Share link created",
      description: `Signed URL generated \u2022 Expires in ${expiryMap[linkExpiry]}`,
      variant: "success"
    });
  };
  const expiryOptions = [
    { label: "1 hour", value: "1h" },
    { label: "24 hours", value: "24h" },
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" }
  ];
  return /* @__PURE__ */ jsxs30("div", { className: "w-full max-w-md rounded-xl border border-border bg-surface-1 overflow-hidden", children: [
    /* @__PURE__ */ jsx36("div", { className: "border-b border-border bg-surface-2/50 px-4 py-3", children: /* @__PURE__ */ jsxs30("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx36("div", { className: "flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent", children: /* @__PURE__ */ jsx36("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx36("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.001l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" }) }) }),
      /* @__PURE__ */ jsxs30("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxs30("h3", { className: "text-sm font-semibold text-text truncate", children: [
          "Share ",
          fileName
        ] }),
        /* @__PURE__ */ jsxs30("p", { className: "text-[11px] text-text-3 font-mono truncate", children: [
          filePath,
          "/",
          fileName
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs30("div", { className: "p-4 border-b border-border", children: [
      /* @__PURE__ */ jsx36("label", { className: "block text-[11px] font-medium uppercase tracking-wider text-text-3 mb-2", children: "Invite people" }),
      /* @__PURE__ */ jsxs30("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx36("div", { className: "flex-1", children: /* @__PURE__ */ jsx36(
          Input,
          {
            placeholder: "colleague@company.com",
            value: emailStr,
            onChange: (e) => setEmailStr(e.target.value),
            onKeyDown: (e) => e.key === "Enter" && handleInvite(),
            className: "h-9 text-sm"
          }
        ) }),
        /* @__PURE__ */ jsx36("div", { className: "w-24", children: /* @__PURE__ */ jsx36(
          Select,
          {
            options: [
              { label: "Viewer", value: "viewer" },
              { label: "Editor", value: "editor" }
            ],
            value: selectedRole,
            onChange: (e) => setSelectedRole(e.target.value),
            className: "h-9 text-xs"
          }
        ) }),
        /* @__PURE__ */ jsx36(Button, { onClick: handleInvite, size: "sm", className: "h-9 px-4", children: "Invite" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs30("div", { className: "p-4 border-b border-border", children: [
      /* @__PURE__ */ jsxs30("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsx36("label", { className: "text-[11px] font-medium uppercase tracking-wider text-text-3", children: "People with access" }),
        /* @__PURE__ */ jsxs30(Badge, { variant: "outline", size: "sm", children: [
          users.length,
          " users"
        ] })
      ] }),
      /* @__PURE__ */ jsx36("div", { className: "space-y-1 max-h-[180px] overflow-y-auto", children: users.length === 0 ? /* @__PURE__ */ jsx36("div", { className: "text-center py-6 text-text-3 text-xs", children: "No users have access yet" }) : users.map((user) => /* @__PURE__ */ jsxs30(
        "div",
        {
          className: "group flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-surface-2 transition-colors",
          children: [
            /* @__PURE__ */ jsxs30("div", { className: "flex items-center gap-3 min-w-0", children: [
              /* @__PURE__ */ jsx36(
                Avatar,
                {
                  src: user.avatar,
                  fallback: user.name[0]?.toUpperCase(),
                  size: "sm"
                }
              ),
              /* @__PURE__ */ jsxs30("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxs30("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx36("span", { className: "text-sm font-medium text-text truncate", children: user.name }),
                  user.id === "me" && /* @__PURE__ */ jsx36(Badge, { variant: "default", size: "sm", children: "You" })
                ] }),
                /* @__PURE__ */ jsx36("div", { className: "text-[11px] text-text-3 truncate", children: user.email })
              ] })
            ] }),
            /* @__PURE__ */ jsx36("div", { className: "flex items-center gap-2", children: user.role === "owner" ? /* @__PURE__ */ jsx36(Badge, { variant: "success", size: "sm", children: "Owner" }) : /* @__PURE__ */ jsxs30(Fragment5, { children: [
              /* @__PURE__ */ jsx36("div", { className: "w-20", children: /* @__PURE__ */ jsx36(
                Select,
                {
                  options: [
                    { label: "Viewer", value: "viewer" },
                    { label: "Editor", value: "editor" }
                  ],
                  value: user.role,
                  onChange: (e) => {
                    const newRole = e.target.value;
                    setUsers(users.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
                    addToast({
                      title: "Permission updated",
                      description: `${user.name} is now ${newRole === "editor" ? "an editor" : "a viewer"}`,
                      variant: "info"
                    });
                  },
                  className: "h-7 text-[11px]"
                }
              ) }),
              /* @__PURE__ */ jsx36(
                IconButton,
                {
                  variant: "ghost",
                  size: "sm",
                  onClick: () => removeUser(user),
                  "aria-label": "Revoke access",
                  className: "opacity-0 group-hover:opacity-100 transition-opacity text-text-3 hover:text-error hover:bg-error/10",
                  children: /* @__PURE__ */ jsx36("svg", { className: "h-3.5 w-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx36("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
                }
              )
            ] }) })
          ]
        },
        user.id
      )) })
    ] }),
    /* @__PURE__ */ jsxs30("div", { className: "p-4 bg-surface-2/30", children: [
      /* @__PURE__ */ jsxs30("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsx36("label", { className: "text-[11px] font-medium uppercase tracking-wider text-text-3", children: "Share link" }),
        shareLink && /* @__PURE__ */ jsxs30("span", { className: "text-[10px] text-text-3 font-mono", children: [
          shareLink.accessCount || 0,
          " views"
        ] })
      ] }),
      shareLink ? /* @__PURE__ */ jsxs30("div", { className: "rounded-lg border border-border bg-surface-1 p-3", children: [
        /* @__PURE__ */ jsxs30("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx36("div", { className: "flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent flex-shrink-0", children: /* @__PURE__ */ jsx36("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx36("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" }) }) }),
          /* @__PURE__ */ jsxs30("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx36("div", { className: "text-sm font-medium text-text", children: "Anyone with the link" }),
            /* @__PURE__ */ jsxs30("div", { className: "flex items-center gap-2 mt-0.5", children: [
              /* @__PURE__ */ jsxs30(Badge, { variant: "default", size: "sm", children: [
                "Can ",
                shareLink.permission
              ] }),
              /* @__PURE__ */ jsx36("span", { className: "text-[10px] text-text-3", children: "\u2022" }),
              /* @__PURE__ */ jsxs30("span", { className: "text-[10px] text-warning font-medium", children: [
                "Expires in ",
                shareLink.expiresIn
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs30("div", { className: "flex items-center gap-2 mt-3 pt-3 border-t border-border", children: [
          /* @__PURE__ */ jsxs30(
            Button,
            {
              variant: "secondary",
              size: "sm",
              onClick: copyLink,
              className: "flex-1",
              children: [
                /* @__PURE__ */ jsx36("svg", { className: "h-3.5 w-3.5 mr-1.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx36("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" }) }),
                "Copy Link"
              ]
            }
          ),
          /* @__PURE__ */ jsx36(
            Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: revokeLink,
              className: "text-error hover:bg-error/10",
              children: "Revoke"
            }
          )
        ] })
      ] }) : (
        /* Create new link */
        /* @__PURE__ */ jsxs30("div", { className: "rounded-lg border border-dashed border-border bg-surface-1/50 p-4", children: [
          /* @__PURE__ */ jsxs30("div", { className: "flex items-center gap-3 mb-3", children: [
            /* @__PURE__ */ jsx36("div", { className: "flex h-8 w-8 items-center justify-center rounded-md bg-surface-3 text-text-3 flex-shrink-0", children: /* @__PURE__ */ jsx36("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx36("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" }) }) }),
            /* @__PURE__ */ jsxs30("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsx36("div", { className: "text-sm text-text-2", children: "Create a shareable link" }),
              /* @__PURE__ */ jsx36("div", { className: "text-[11px] text-text-3", children: "Generate a signed URL with expiration" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs30("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx36(
              Select,
              {
                options: expiryOptions,
                value: linkExpiry,
                onChange: (e) => setLinkExpiry(e.target.value),
                className: "flex-1 h-8 text-xs"
              }
            ),
            /* @__PURE__ */ jsx36(Button, { onClick: createLink, size: "sm", className: "h-8", children: "Create Link" })
          ] })
        ] })
      )
    ] }),
    /* @__PURE__ */ jsx36("div", { className: "border-t border-border bg-surface-2/50 px-4 py-2", children: /* @__PURE__ */ jsx36("p", { className: "text-[10px] text-text-3 text-center", children: "All access changes are logged in the audit trail" }) })
  ] });
}

// src/ApiKeyManager.tsx
import { useState as useState13 } from "react";
import { jsx as jsx37, jsxs as jsxs31 } from "react/jsx-runtime";
function ApiKeyManager() {
  const [keys, setKeys] = useState13([
    { id: "1", name: "Production Server", prefix: "roset_live_8x...", created: "Oct 24", lastUsed: "Just now", scopes: ["read", "write"] },
    { id: "2", name: "Dev Laptop", prefix: "roset_test_9a...", created: "Nov 12", lastUsed: "2d ago", scopes: ["read"] }
  ]);
  const { addToast } = useToast();
  const handleRevoke = (id) => {
    setKeys(keys.filter((k) => k.id !== id));
    addToast({ title: "Key revoked", variant: "error" });
  };
  const handleCreate = () => {
    const newKey = {
      id: Math.random().toString(),
      name: "New Integration",
      prefix: "roset_live_nw...",
      created: "Just now",
      lastUsed: "Never",
      scopes: ["read"]
    };
    setKeys([newKey, ...keys]);
    addToast({ title: "API Key Created", description: "Make sure to copy it now.", variant: "success" });
  };
  return /* @__PURE__ */ jsxs31("div", { className: "w-full rounded-xl border border-border bg-surface-1", children: [
    /* @__PURE__ */ jsxs31("div", { className: "flex items-center justify-between border-b border-border p-4", children: [
      /* @__PURE__ */ jsxs31("div", { children: [
        /* @__PURE__ */ jsx37("h3", { className: "text-sm font-semibold text-text", children: "API Keys" }),
        /* @__PURE__ */ jsx37("p", { className: "text-xs text-text-3", children: "Manage access tokens for your project." })
      ] }),
      /* @__PURE__ */ jsx37(Button, { size: "sm", onClick: handleCreate, children: "+ Create New Key" })
    ] }),
    /* @__PURE__ */ jsx37("div", { className: "divide-y divide-border", children: keys.map((key) => /* @__PURE__ */ jsxs31("div", { className: "flex items-center justify-between p-4", children: [
      /* @__PURE__ */ jsxs31("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxs31("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx37("span", { className: "font-medium text-text text-sm", children: key.name }),
          key.scopes.map((scope) => /* @__PURE__ */ jsx37(Badge, { variant: scope === "write" ? "warning" : "default", size: "sm", children: scope }, scope))
        ] }),
        /* @__PURE__ */ jsxs31("div", { className: "flex items-center gap-3 text-xs text-text-3 font-mono", children: [
          /* @__PURE__ */ jsx37("span", { children: key.prefix }),
          /* @__PURE__ */ jsx37("span", { className: "text-text-3/50", children: "\u2022" }),
          /* @__PURE__ */ jsxs31("span", { children: [
            "Last used ",
            key.lastUsed
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs31("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx37(Button, { variant: "ghost", size: "sm", onClick: () => addToast({ title: "Copied to clipboard", variant: "info" }), children: "Copy" }),
        /* @__PURE__ */ jsx37(
          Button,
          {
            variant: "ghost",
            size: "sm",
            onClick: () => handleRevoke(key.id),
            className: "text-error hover:text-error hover:bg-error/10",
            children: "Revoke"
          }
        )
      ] })
    ] }, key.id)) }),
    keys.length === 0 && /* @__PURE__ */ jsx37("div", { className: "p-8 text-center text-sm text-text-3", children: "No active API keys." })
  ] });
}

// src/ApiDocs.tsx
import React4 from "react";
import { Fragment as Fragment6, jsx as jsx38, jsxs as jsxs32 } from "react/jsx-runtime";
var methodStyles = {
  GET: { background: "rgba(16, 185, 129, 0.1)", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.2)" },
  POST: { background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", borderColor: "rgba(59, 130, 246, 0.2)" },
  PUT: { background: "rgba(245, 158, 11, 0.1)", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.2)" },
  PATCH: { background: "rgba(249, 115, 22, 0.1)", color: "#fb923c", borderColor: "rgba(249, 115, 22, 0.2)" },
  DELETE: { background: "rgba(239, 68, 68, 0.1)", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.2)" }
};
function MethodBadge({ method }) {
  return /* @__PURE__ */ jsx38(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "6px",
        border: "1px solid",
        padding: "4px 8px",
        fontFamily: "ui-monospace, monospace",
        fontSize: "12px",
        fontWeight: 600,
        ...methodStyles[method]
      },
      children: method
    }
  );
}
function ApiEndpoint({ method, path, description, auth = "required", children }) {
  return /* @__PURE__ */ jsxs32(
    "div",
    {
      style: {
        margin: "24px 0",
        overflow: "hidden",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        background: "var(--surface-1)"
      },
      children: [
        /* @__PURE__ */ jsxs32(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
              padding: "12px 16px"
            },
            children: [
              /* @__PURE__ */ jsx38(MethodBadge, { method }),
              /* @__PURE__ */ jsx38("code", { style: { flex: 1, fontFamily: "ui-monospace, monospace", fontSize: "14px", color: "var(--text)" }, children: path }),
              auth === "required" && /* @__PURE__ */ jsxs32("span", { style: { display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-3)" }, children: [
                /* @__PURE__ */ jsx38("svg", { style: { width: "12px", height: "12px" }, fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx38("path", { fillRule: "evenodd", d: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z", clipRule: "evenodd" }) }),
                "Auth required"
              ] })
            ]
          }
        ),
        description && /* @__PURE__ */ jsx38("div", { style: { borderBottom: "1px solid var(--border)", padding: "12px 16px" }, children: /* @__PURE__ */ jsx38("p", { style: { fontSize: "14px", color: "var(--text-2)", margin: 0 }, children: description }) }),
        children
      ]
    }
  );
}
function ParameterTable({ title, type, params }) {
  const typeLabels = {
    path: "Path Parameters",
    query: "Query Parameters",
    body: "Request Body",
    header: "Headers"
  };
  const typeColors = {
    path: { bg: "rgba(168, 85, 247, 0.08)", color: "#a78bfa" },
    // purple
    query: { bg: "rgba(245, 158, 11, 0.08)", color: "#fbbf24" },
    // amber
    body: { bg: "rgba(59, 130, 246, 0.08)", color: "#60a5fa" },
    // blue
    header: { bg: "rgba(99, 102, 241, 0.08)", color: "#818cf8" }
    // indigo
  };
  const colors = type ? typeColors[type] : { bg: "rgba(107, 114, 128, 0.08)", color: "#9ca3af" };
  const displayTitle = title || (type ? typeLabels[type] : "Parameters");
  return /* @__PURE__ */ jsxs32("div", { style: { borderBottom: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ jsx38("div", { style: {
      padding: "12px 16px",
      background: colors.bg,
      borderBottom: "1px solid var(--border)"
    }, children: /* @__PURE__ */ jsx38("h4", { style: { margin: 0, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: colors.color }, children: displayTitle }) }),
    /* @__PURE__ */ jsx38("div", { style: { padding: "16px", overflowX: "auto" }, children: /* @__PURE__ */ jsxs32("table", { style: { width: "100%", fontSize: "14px", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ jsx38("thead", { children: /* @__PURE__ */ jsxs32("tr", { style: { borderBottom: "1px solid var(--border)", textAlign: "left" }, children: [
        /* @__PURE__ */ jsx38("th", { style: { paddingBottom: "8px", paddingRight: "16px", fontWeight: 500, color: "var(--text-2)" }, children: "Name" }),
        /* @__PURE__ */ jsx38("th", { style: { paddingBottom: "8px", paddingRight: "16px", fontWeight: 500, color: "var(--text-2)" }, children: "Type" }),
        /* @__PURE__ */ jsx38("th", { style: { paddingBottom: "8px", paddingRight: "16px", fontWeight: 500, color: "var(--text-2)" }, children: "Required" }),
        /* @__PURE__ */ jsx38("th", { style: { paddingBottom: "8px", fontWeight: 500, color: "var(--text-2)" }, children: "Description" })
      ] }) }),
      /* @__PURE__ */ jsx38("tbody", { children: params.map((param, i) => /* @__PURE__ */ jsxs32("tr", { style: { borderBottom: i < params.length - 1 ? "1px solid rgba(39, 39, 42, 0.5)" : "none" }, children: [
        /* @__PURE__ */ jsx38("td", { style: { padding: "10px 16px 10px 0" }, children: /* @__PURE__ */ jsx38("code", { style: { background: "var(--surface-2)", padding: "3px 8px", borderRadius: "4px", fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "var(--accent)" }, children: param.name }) }),
        /* @__PURE__ */ jsx38("td", { style: { padding: "10px 16px 10px 0" }, children: /* @__PURE__ */ jsx38("span", { style: { fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "var(--text-3)" }, children: param.type }) }),
        /* @__PURE__ */ jsx38("td", { style: { padding: "10px 16px 10px 0" }, children: param.required ? /* @__PURE__ */ jsx38("span", { style: { fontSize: "12px", fontWeight: 500, color: "var(--warning)" }, children: "Required" }) : /* @__PURE__ */ jsx38("span", { style: { fontSize: "12px", color: "var(--text-3)" }, children: "Optional" }) }),
        /* @__PURE__ */ jsxs32("td", { style: { padding: "10px 0", color: "var(--text-2)" }, children: [
          param.description,
          param.default && /* @__PURE__ */ jsxs32("span", { style: { marginLeft: "6px", color: "var(--text-3)" }, children: [
            "(default: ",
            /* @__PURE__ */ jsx38("code", { style: { fontSize: "12px", background: "var(--surface-2)", padding: "1px 4px", borderRadius: "3px" }, children: param.default }),
            ")"
          ] })
        ] })
      ] }, param.name)) })
    ] }) })
  ] });
}
function ResponseExample({ status, description, json }) {
  const [copied, setCopied] = React4.useState(false);
  const jsonString = JSON.stringify(json, null, 2);
  const statusColors = {
    200: "#34d399",
    201: "#34d399",
    204: "#34d399",
    400: "#fbbf24",
    401: "#f87171",
    403: "#f87171",
    404: "#fbbf24",
    409: "#fbbf24",
    500: "#f87171"
  };
  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  return /* @__PURE__ */ jsxs32("div", { style: { borderBottom: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ jsxs32("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(34, 197, 94, 0.08)", borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsxs32("h4", { style: { margin: 0, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#34d399" }, children: [
        "Response",
        /* @__PURE__ */ jsx38("span", { style: { marginLeft: "8px", fontFamily: "ui-monospace, monospace", color: statusColors[status] || "var(--text-2)" }, children: status }),
        description && /* @__PURE__ */ jsxs32("span", { style: { marginLeft: "8px", fontWeight: 400, textTransform: "none", color: "var(--text-3)" }, children: [
          "\u2014 ",
          description
        ] })
      ] }),
      /* @__PURE__ */ jsx38(
        "button",
        {
          onClick: handleCopy,
          style: {
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "transparent",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "12px",
            color: "var(--text-3)",
            cursor: "pointer"
          },
          children: copied ? /* @__PURE__ */ jsxs32(Fragment6, { children: [
            /* @__PURE__ */ jsx38("svg", { style: { width: "14px", height: "14px", color: "var(--success)" }, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx38("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }),
            "Copied"
          ] }) : /* @__PURE__ */ jsxs32(Fragment6, { children: [
            /* @__PURE__ */ jsx38("svg", { style: { width: "14px", height: "14px" }, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx38("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" }) }),
            "Copy"
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsx38("pre", { style: { overflow: "auto", borderRadius: "8px", background: "var(--surface-2)", padding: "16px", fontFamily: "ui-monospace, monospace", fontSize: "12px", lineHeight: 1.6, color: "var(--text)", margin: 0 }, children: /* @__PURE__ */ jsx38("code", { children: jsonString }) })
  ] });
}
function RequestExample({ json }) {
  const [copied, setCopied] = React4.useState(false);
  const jsonString = JSON.stringify(json, null, 2);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  return /* @__PURE__ */ jsxs32("div", { style: { borderBottom: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ jsxs32("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(59, 130, 246, 0.08)", borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsx38("h4", { style: { margin: 0, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#60a5fa" }, children: "Request Body" }),
      /* @__PURE__ */ jsx38(
        "button",
        {
          onClick: handleCopy,
          style: {
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "transparent",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "12px",
            color: "var(--text-3)",
            cursor: "pointer"
          },
          children: copied ? /* @__PURE__ */ jsxs32(Fragment6, { children: [
            /* @__PURE__ */ jsx38("svg", { style: { width: "14px", height: "14px", color: "var(--success)" }, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx38("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }),
            "Copied"
          ] }) : /* @__PURE__ */ jsxs32(Fragment6, { children: [
            /* @__PURE__ */ jsx38("svg", { style: { width: "14px", height: "14px" }, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx38("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" }) }),
            "Copy"
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsx38("pre", { style: { overflow: "auto", borderRadius: "8px", background: "var(--surface-2)", padding: "16px", fontFamily: "ui-monospace, monospace", fontSize: "12px", lineHeight: 1.6, color: "var(--text)", margin: 0 }, children: /* @__PURE__ */ jsx38("code", { children: jsonString }) })
  ] });
}
export {
  Accordion,
  AccordionItem,
  ActivityLog,
  Alert,
  ApiEndpoint,
  ApiKeyManager,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Callout,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  CodeBlock,
  CodeBlockCopy,
  CommandPalette,
  Divider,
  DropdownMenu,
  FileTree,
  IconButton,
  Input,
  Modal,
  ModalFooter,
  Pagination,
  ParameterTable,
  Popover,
  Progress,
  Radio,
  RadioGroup,
  RequestExample,
  ResponseExample,
  Search,
  SearchTrigger,
  Select,
  ShareDialog,
  Skeleton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  Spinner,
  StatCard,
  Step,
  Steps,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  ToastProvider,
  Tooltip,
  cn,
  useCommandPalette,
  useToast
};
//# sourceMappingURL=index.mjs.map