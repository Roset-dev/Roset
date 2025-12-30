"use client";

import React, { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';
import { cn } from '../../lib/utils';
import Link from 'next/link';

interface BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

type ButtonAsButtonProps = BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never, asChild?: boolean };
type ButtonAsLinkProps = BaseButtonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string, asChild?: boolean };

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    icon,
    iconPosition = 'left',
    children, 
    ...props 
  }, ref) => {
    const classNames = cn(
      styles.button,
      styles[variant],
      styles[size],
      className
    );

    const content = (
      <>
        {loading ? (
          <div className={styles.spinner} aria-hidden="true" />
        ) : icon && iconPosition === 'left' ? (
          <span className={styles.icon}>{icon}</span>
        ) : null}
        {children}
        {!loading && icon && iconPosition === 'right' ? (
          <span className={styles.icon}>{icon}</span>
        ) : null}
      </>
    );

    if ('href' in props && props.href) {
      const { href, ...linkProps } = props as ButtonAsLinkProps;
      return (
        <Link 
          href={href} 
          className={classNames}
          {...(linkProps as any)}
        >
          {content}
        </Link>
      );
    }

    const { ...buttonProps } = props as ButtonAsButtonProps;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={buttonProps.disabled || loading}
        className={classNames}
        {...(buttonProps as any)}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
