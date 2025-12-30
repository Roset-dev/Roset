import React, { ReactNode } from 'react';
import styles from './Table.module.css';
import { cn } from '../../lib/utils';

export const Table = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <div className={cn(styles.wrapper, className)}>
    <table className={styles.table}>{children}</table>
  </div>
);

export const TableHeader = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <thead className={cn(styles.tableHeader, className)}>{children}</thead>
);

export const TableBody = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <tbody className={cn(styles.tableBody, className)}>{children}</tbody>
);

export const TableRow = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <tr className={cn(styles.tableRow, className)}>{children}</tr>
);

export const TableHead = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn(styles.tableHead, className)}>{children}</th>
);

export const TableCell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn(styles.tableCell, className)}>{children}</td>
);
