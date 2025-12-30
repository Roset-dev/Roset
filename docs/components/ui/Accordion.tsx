"use client";

import React, { useState, ReactNode } from 'react';
import styles from './Accordion.module.css';
import { cn } from '../../lib/utils';

interface AccordionItemProps {
  title?: string;
  count?: number;
  children?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const AccordionItem = ({ title = "Version", count, children, defaultOpen = false, className }: AccordionItemProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn(styles.item, isOpen && styles.open, className)}>
      <button 
        className={styles.header} 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.title}>
          {title}
          {count !== undefined && <span className={styles.count}>({count})</span>}
        </span>
        <span className={styles.icon}>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
      <div className={styles.contentWrapper}>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};

interface AccordionProps {
  children?: ReactNode;
  className?: string;
}

export const Accordion = ({ children, className }: AccordionProps) => {
  return (
    <div className={cn(styles.accordion, className)}>
      {children}
    </div>
  );
};
