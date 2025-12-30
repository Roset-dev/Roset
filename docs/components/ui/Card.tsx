import React, { ReactNode } from 'react';
import styles from './Card.module.css';
import { cn } from '../../lib/utils';

interface CardProps {
  children?: ReactNode;
  className?: string;
  variant?: 'default' | 'surface' | 'glass' | 'persona' | 'terminal';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
}

export const Card = ({ 
  children, 
  className, 
  variant = 'default',
  padding = 'md',
  border = true
}: CardProps) => {
  return (
    <div className={cn(
      styles.card,
      styles[variant],
      styles[`p-${padding}`],
      border && styles.border,
      className
    )}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <div className={cn(styles.cardHeader, className)}>{children}</div>
);

export const CardTitle = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <h3 className={cn(styles.cardTitle, className)}>{children}</h3>
);

export const CardContent = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <div className={cn(styles.cardContent, className)}>{children}</div>
);
