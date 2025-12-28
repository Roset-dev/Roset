"use client";

import React, { useState, useEffect } from 'react';
import styles from './CodeBlock.module.css';
import { cn } from '../../lib/utils';
import { Copy, Check, Terminal, Zap } from 'lucide-react';
import Prism from 'prismjs';
import { cursorPromptDeeplink, generateContextPrompt } from '../../utils/promptLinks';

// Import Prism languages
if (typeof window !== 'undefined') {
  require('prismjs/components/prism-typescript');
  require('prismjs/components/prism-javascript');
  require('prismjs/components/prism-bash');
  require('prismjs/components/prism-json');
  require('prismjs/components/prism-python');
  require('prismjs/components/prism-go');
  require('prismjs/components/prism-yaml');
  require('prismjs/components/prism-sql');
  require('prismjs/components/prism-markdown');
}

interface CodeBlockProps {
  code?: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export const CodeBlock = ({ 
  code = '', 
  language = 'bash', 
  className,
  showLineNumbers = false
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  // We handle highlighting manually via highlightedCode to avoid double-processing
  // and ensure SSR/hydration stability.

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cursorLink = cursorPromptDeeplink(generateContextPrompt(code, language));

  const highlightedCode = (lang: string, content: string) => {
    if (typeof window === 'undefined') return content;
    
    // Ensure Prism languages are available
    const grammar = Prism.languages[lang] || Prism.languages.bash || Prism.languages.javascript;
    
    if (!grammar) return content;

    try {
      return Prism.highlight(content, grammar, lang);
    } catch (e) {
      console.warn(`Prism highlight failed for ${lang}`, e);
      return content;
    }
  };

  return (
    <div className={cn(styles.wrapper, className)}>
      <header className={styles.header}>
        <div className={styles.meta}>
          <Terminal size={12} className={styles.terminalIcon} />
          <span className={styles.language}>{language}</span>
        </div>
        <div className={styles.actions}>
          <a
            href={cursorLink}
            className={styles.copyButton}
            title="Open in Cursor"
          >
            <Zap size={14} />
          </a>
          <button 
            className={cn(styles.copyButton, copied && styles.copied)} 
            onClick={handleCopy}
            aria-label="Copy code"
            title="Copy command"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </header>
      <pre className={cn(styles.pre, `language-${language}`)}>
        <code 
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode(language, code) }}
        />
      </pre>
    </div>
  );
};
