# <img src="../../logo.png" width="32" height="32" align="center" /> @roset/sdk

The TypeScript SDK for Roset. Built for high-performance applications that need true filesystem semantics on object storage.

## Installation

```bash
npm install @roset/sdk
```

## Quick Start

```typescript
import { RosetClient } from "@roset/sdk";

const client = new RosetClient({
  apiKey: "dk_...",
});

// Atomic folder creation
const folder = await client.nodes.createFolder("Reports", {
  parentPath: "/documents",
});

// Direct upload with signed URLs
await client.uploads.upload("/documents/Reports/q4.pdf", buffer);
```

## Key Features

- **Batch Operations** - Resolve 100+ paths in a single round-trip.
- **Atomic Renames** - Moving a directory with a million files is O(1).
- **Audit Ready** - Full operation history built-in.

[TypeScript SDK Docs](https://docs.roset.dev/sdk/typescript)
