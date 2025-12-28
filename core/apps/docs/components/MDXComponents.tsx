import React from 'react';
import { 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, CodeBlock,
  Button, Card, CardHeader, CardTitle, CardContent, Badge, Alert,
  ApiEndpoint, ParameterTable, ResponseExample, RequestExample,
  Accordion, AccordionItem
} from './ui';
import { PromptActions } from './PromptActions';
import { InstallInCursor } from './InstallInCursor';

export const MDXComponents = {
  Button: (props: any) => <Button {...props} />,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Alert,
  Callout: Alert,
  ApiEndpoint,
  ParameterTable,
  ResponseExample,
  RequestExample,
  Accordion,
  AccordionItem,
  CodeBlock,
  table: (props: any) => (
    <Table className="my-6">
      {props.children}
    </Table>
  ),
  thead: (props: any) => <TableHeader {...props} />,
  tbody: (props: any) => <TableBody {...props} />,
  tr: (props: any) => <TableRow {...props} />,
  th: (props: any) => <TableHead {...props} />,
  td: (props: any) => <TableCell {...props} />,
  pre: (props: any) => {
    const { children } = props;
    console.log('[Roset MDX] pre override firing', { hasChildren: !!children, childType: typeof children });
    
    // Helper to recursively get text content from React nodes
    const getTextContent = (node: any): string => {
      if (!node) return '';
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(getTextContent).join('');
      if (React.isValidElement(node)) {
        return getTextContent((node.props as any).children);
      }
      return '';
    };

    // Find the code element to get the language
    const findCodeElement = (node: any): any => {
      if (!node) return null;
      if (React.isValidElement(node)) {
        if (node.type === 'code' || (node.props as any)?.originalType === 'code') return node;
        return findCodeElement((node.props as any).children);
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findCodeElement(child);
          if (found) return found;
        }
      }
      return null;
    };

    const codeElement = findCodeElement(children);
    if (codeElement) {
      const { className } = codeElement.props as any;
      const language = className?.replace('language-', '') || 'text';
      // Grab all text content recursively
      const code = getTextContent(codeElement).trim();
      
      if (code) {
        return <CodeBlock code={code} language={language} />;
      }
    }
    
    // Fallback to plain pre if we can't find code or it's empty
    return <pre {...props} />;
  },
  Pre: (props: any) => MDXComponents.pre(props),
  PromptActions,
  InstallInCursor,
};
