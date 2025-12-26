
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, CodeBlock } from '@roset/ui';

export const MDXComponents = {
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
    // Nextra passes children to pre. Usually it's a code element.
    // We need to extract the code string and language.
    // The children of pre is usually a 'code' element.
    const codeElement = React.Children.only(props.children);
    
    if (React.isValidElement(codeElement)) {
        const { children, className } = codeElement.props as any;
        const language = className?.replace('language-', '') || 'text';
        
        // CodeBlock expects a string for 'code'.
        // If children is a string, great. If not, we might need to handle it.
        const codeString = typeof children === 'string' ? children.trim() : '';

        return <CodeBlock code={codeString} language={language}>{children}</CodeBlock>;
    }
    
    return <pre {...props} />;
  }
};
