# @roset/sdk

TypeScript SDK for Roset - the filesystem for object storage.

## Installation

```bash
npm install @roset/sdk
# or
pnpm add @roset/sdk
```

## Quick Start

```typescript
import { RosetClient } from "@roset/sdk";

const client = new RosetClient({
  baseUrl: "https://api.roset.dev",
  apiKey: "dk_...",
});

// Resolve paths to nodes
const nodes = await client.nodes.resolve(["/documents", "/images"]);

// Create a folder
const folder = await client.nodes.createFolder("Reports", {
  parentPath: "/documents",
});

// Upload a file
const file = await client.uploads.upload(
  "/documents/Reports/q4-summary.pdf",
  pdfBuffer,
  { contentType: "application/pdf" }
);

// Create a share link (expires in 7 days)
const share = await client.shares.create(file.id, { expiresIn: "7d" });
console.log(share.url);

// Query audit log
const { items } = await client.audit.query({ action: "upload" });
```

## API Reference

### `RosetClient`

Main entry point. Initialize with your API credentials:

```typescript
const client = new RosetClient({
  baseUrl: string;       // Required
  apiKey: string;        // Required
  tenantId?: string;     // Optional
  timeout?: number;      // Default: 30000ms
  retries?: number;      // Default: 3
});
```

### `client.nodes`

| Method | Description |
|--------|-------------|
| `resolve(paths)` | Batch resolve paths to nodes |
| `resolvePath(path)` | Resolve single path |
| `get(id)` | Get node by ID |
| `listChildren(id, options)` | List folder contents |
| `create(name, type, options)` | Create file/folder |
| `createFolder(name, options)` | Create folder (convenience) |
| `update(id, updates)` | Rename/move node |
| `rename(id, newName)` | Rename (convenience) |
| `move(id, newParentId)` | Move (convenience) |
| `delete(id)` | Soft delete |
| `restore(id)` | Restore from trash |

### `client.uploads`

| Method | Description |
|--------|-------------|
| `init(path, options)` | Get signed upload URL |
| `commit(token, etag)` | Finalize upload |
| `abort(token)` | Cancel upload |
| `upload(path, data, options)` | Upload file (convenience) |
| `getDownloadUrl(id)` | Get signed download URL |
| `download(id)` | Download file (convenience) |

### `client.shares`

| Method | Description |
|--------|-------------|
| `create(nodeId, options)` | Create share link |
| `get(token)` | Get share info |
| `revoke(token)` | Revoke share |
| `listForNode(nodeId)` | List shares for node |
| `access(token, options)` | Access shared content |

### `client.audit`

| Method | Description |
|--------|-------------|
| `query(options)` | Query audit log |
| `forNode(nodeId)` | Get node's audit history |
| `iterate(options)` | Async iterator for pagination |

## Error Handling

```typescript
import { NotFoundError, ForbiddenError, RosetError } from "@roset/sdk";

try {
  await client.nodes.get("invalid-id");
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log("Node not found");
  } else if (error instanceof ForbiddenError) {
    console.log("Access denied");
  } else if (error instanceof RosetError) {
    console.log(error.code, error.statusCode);
  }
}
```

## License

MIT
