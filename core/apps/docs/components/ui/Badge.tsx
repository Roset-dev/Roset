import React, { ReactNode } from 'react';
import styles from './Badge.module.css';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className 
}: BadgeProps) => {
  return (
    <span className={cn(
      styles.badge,
      styles[variant],
      styles[size],
      className
    )}>
      {children}
    </span>
  );
};
