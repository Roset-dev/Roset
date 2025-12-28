import React, { ReactNode } from 'react';
import styles from './Alert.module.css';
import { cn } from '../../lib/utils';
import { Info, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface AlertProps {
  children?: ReactNode;
  title?: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
  className?: string;
}

const icons = {
  info: <Info size={18} />,
  warning: <AlertCircle size={18} />,
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
};

export const Alert = ({ 
  children, 
  title, 
  variant = 'info', 
  className 
}: AlertProps) => {
  return (
    <div className={cn(styles.alert, styles[variant], className)}>
      <div className={styles.icon}>{icons[variant]}</div>
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};
