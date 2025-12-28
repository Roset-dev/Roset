"use client";

import React, { ReactNode } from 'react';
import styles from './ApiDocs.module.css';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';
import { CodeBlock } from './CodeBlock';

interface ApiEndpointProps {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string;
  description?: string;
  children?: ReactNode;
}

export const ApiEndpoint = ({ method = 'GET', path = '', description, children }: ApiEndpointProps) => {
  const methodColors: Record<string, string> = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    PATCH: 'warning',
    DELETE: 'error',
  };

  return (
    <div className={styles.endpoint}>
      <div className={styles.header}>
        <div className={styles.route}>
          <Badge variant={methodColors[method] as any} size="sm" className={styles.method}>
            {method}
          </Badge>
          <code className={styles.path}>{path}</code>
        </div>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
};

interface Parameter {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  default?: string;
}

interface ParameterTableProps {
  type?: 'path' | 'query' | 'body' | 'header';
  params?: Parameter[];
}

export const ParameterTable = ({ type = 'query', params = [] }: ParameterTableProps) => {
  return (
    <div className={styles.paramSection}>
      <h4 className={styles.paramTitle}>{type.toUpperCase()} PARAMETERS</h4>
      <div className={styles.paramTableWrapper}>
        <table className={styles.paramTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((param) => (
              <tr key={param.name}>
                <td className={styles.paramName}>
                  <code>{param.name}</code>
                  {param.required && <span className={styles.required}>*</span>}
                </td>
                <td className={styles.paramType}>
                  <code>{param.type}</code>
                </td>
                <td className={styles.paramDesc}>
                  {param.description}
                  {param.default && (
                    <div className={styles.defaultValue}>
                      Default: <code>{param.default}</code>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const RequestExample = ({ json = {}, title = "Request Body" }: { json?: any; title?: string }) => {
  return (
    <div className={styles.example}>
      <div className={styles.exampleHeader}>{title}</div>
      <CodeBlock code={JSON.stringify(json, null, 2)} language="json" className={styles.exampleCode} />
    </div>
  );
};

export const ResponseExample = ({ status = 200, json = {}, description }: { status?: number; json?: any; description?: string }) => {
  const isError = status >= 400;
  return (
    <div className={styles.example}>
      <div className={styles.exampleHeader}>
        Response <code>{status}</code>
        {description && <span className={styles.exampleDesc}> — {description}</span>}
      </div>
      <CodeBlock code={JSON.stringify(json, null, 2)} language="json" className={styles.exampleCode} />
    </div>
  );
};
