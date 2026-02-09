/**
 * Directory tree visualization for documentation pages.
 * Used in MDX to illustrate project structures with folders, files, and optional annotations.
 *
 * @module components/file-tree
 */

/** Props for the {@link FileTree} container. */
interface FileTreeProps {
  /** Nested {@link Folder} and {@link File} elements. */
  children: React.ReactNode;
}

/**
 * Top-level container that renders a code-style box around a directory tree.
 * Wrap {@link Folder} and {@link File} components inside to build the tree.
 */
export function FileTree({ children }: FileTreeProps) {
  return (
    <div className="my-6 rounded-xl border border-code-border bg-code-bg p-4 font-mono text-sm">
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

/** Props for the {@link Folder} component. */
interface FolderProps {
  /** Directory name displayed next to the folder icon. */
  name: string;
  /** Nested {@link Folder} and {@link File} children indented below this directory. */
  children?: React.ReactNode;
}

/**
 * Renders a directory entry with a folder icon and optional nested children.
 * Children are indented with a left border to convey hierarchy.
 */
export function Folder({ name, children }: FolderProps) {
  return (
    <div>
      <div className="flex items-center gap-2 py-0.5 text-foreground">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span className="font-semibold">{name}</span>
      </div>
      {children && (
        <div className="ml-3 pl-3 border-l border-border">{children}</div>
      )}
    </div>
  );
}

/** Props for the {@link File} component. */
interface FileProps {
  /** Filename displayed next to the file icon. */
  name: string;
  /** Optional inline annotation shown after the filename (e.g., "entry point"). */
  comment?: string;
}

/**
 * Renders a single file entry with a document icon and optional comment.
 */
export function File({ name, comment }: FileProps) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="text-muted">{name}</span>
      {comment && <span className="text-subtle text-xs ml-1">— {comment}</span>}
    </div>
  );
}
