"use client";

import React, { ReactNode } from 'react';
import styles from './ChangeItem.module.css';

interface ChangeItemProps {
  title?: string;
  children?: ReactNode;
}

export const ChangeItem = ({ title = "Feature", children }: ChangeItemProps) => {
  return (
    <div className={styles.item}>
      <span className={styles.title}>{title}</span>
      <span className={styles.separator}>:</span>
      <span className={styles.content}>{children}</span>
    </div>
  );
};
