"use client";

import React from 'react';
import styles from './Toast.module.css';
import { cn } from '../../../lib/utils';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Toast, ToastType } from './types';

interface ToastItemProps {
  id: string;
  message: string;
  type: ToastType;
  onRemove: (id: string) => void;
}

const ToastItem = ({ id, message, type, onRemove }: ToastItemProps) => {
  const icons = {
    success: <CheckCircle2 size={18} className={styles.successIcon} />,
    error: <AlertCircle size={18} className={styles.errorIcon} />,
    warning: <AlertTriangle size={18} className={styles.warningIcon} />,
    info: <Info size={18} className={styles.infoIcon} />,
  };

  return (
    <div className={cn(styles.toast, styles[type])} role="alert">
      <div className={styles.icon}>{icons[type]}</div>
      <div className={styles.message}>{message}</div>
      <button className={styles.closeButton} onClick={() => onRemove(id)} aria-label="Close">
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer = ({ 
  toasts, 
  onRemove 
}: { 
  toasts: Toast[]; 
  onRemove: (id: string) => void 
}) => {
  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onRemove={onRemove} />
      ))}
    </div>
  );
};
