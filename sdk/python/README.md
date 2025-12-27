# <img src="../../logo.png" width="32" height="32" align="center" /> Roset Python SDK

Atomic checkpoints for ML training. Never lose a checkpoint to corrupt uploads again.

## Why Roset?

Object storage is eventually consistent and lacks atomic directory moves. Roset adds a metadata layer that guarantees:
- ✅ **Atomic Commits** - Checkpoints are 100% visible or not at all.
- ✅ **Resume Always Works** - `latest` pointer only updates after successful flush.
- ✅ **One-Line Integration** - Native support for PyTorch Lightning and HuggingFace.

## Installation

```bash
pip install roset
```

## Quick Start

```python
import roset

client = roset.Client(api_key="rk_...")

# Create an atomic checkpoint group
checkpoint = client.create_folder("/training", "step-5000")

# After writing bytes...
client.commit(checkpoint.id)
client.update_ref("latest", checkpoint.id)
```

[Python SDK Docs](https://docs.roset.dev/sdk/python)

## HuggingFace Transformers Integration

```python
from transformers import Trainer, TrainingArguments
from roset import Client
from roset.integrations.huggingface import RosetTrainerCallback

client = Client(api_url="...", api_key="...")

trainer = Trainer(
    model=model,
    args=TrainingArguments(
        output_dir="/mnt/roset/checkpoints",
        save_steps=500,
    ),
    callbacks=[
        RosetTrainerCallback(
            client=client,
            update_ref="latest",
            async_commit=True,  # Non-blocking for large models
        )
    ],
)

trainer.train()
```

### Features

- **Automatic checkpoint detection** – Finds the latest `checkpoint-N` folder
- **Async commits** – Non-blocking for large model saves
- **World process zero** – Only commits from main process in distributed training

## Ray Train Integration

```python
from roset import Client
from roset.integrations.ray import RosetRayTrainCallback

client = Client(api_url="...", api_key="...")
callback = RosetRayTrainCallback(client=client, update_ref="latest")

# In your training function, after saving:
def train_func():
    # ... training loop ...
    checkpoint_dir = "/mnt/roset/checkpoints/step-1000"
    save_checkpoint(checkpoint_dir)
    
    # Commit atomically
    callback.process_checkpoint(checkpoint_dir, step=1000)
```

## The Checkpoint Safety Contract

Roset enforces a strict contract that prevents partial checkpoints:

| State | Visible to `latest`? | Writable? |
|-------|---------------------|-----------|
| **STAGING** | ❌ No | ✅ Yes |
| **SEALING** | ❌ No | ❌ No (write barrier) |
| **COMMITTED** | ✅ Yes (after ref update) | ❌ No (immutable) |

### What This Means

1. **Partial writes are impossible** – If a node dies mid-write, the checkpoint never becomes visible
2. **Resume always works** – `latest` only updates after successful commit
3. **Immutable history** – Committed checkpoints cannot be modified

## API Reference

### Client

```python
client = roset.Client(
    api_url="https://api.roset.dev",
    api_key="rsk_...",
    mount_id=None,        # Optional: specific mount
    timeout=30.0,         # Request timeout
    max_retries=3,        # Retry transient errors
)
```

### Core Methods

```python
# Nodes
client.get_node(node_id) -> Node
client.resolve_path("/path/to/folder") -> Node | None
client.create_folder("/parent", "name") -> Node
client.delete_node(node_id)  # Soft delete

# Commits
client.commit(node_id, message="...") -> Commit
client.wait_for_commit(commit_id, timeout=60) -> Commit
client.get_commit(commit_id) -> Commit

# Refs (atomic pointers)
client.get_ref("latest") -> Ref | None
client.update_ref("latest", commit_id) -> Ref
client.delete_ref("latest")

# Commit Groups (cross-folder atomicity)
group = client.create_commit_group(message="...")
client.commit(folder1_id, group_id=group.id)
client.commit(folder2_id, group_id=group.id)
client.seal_commit_group(group.id)
```

## Environment Variables

```bash
ROSET_API_URL=https://api.roset.dev
ROSET_API_KEY=rsk_...
ROSET_MOUNT_ID=mount_...  # Optional
```

## Error Handling

```python
from roset.exceptions import RosetError, RosetAPIError, RosetNotFoundError

try:
    folder = client.resolve_path("/nonexistent")
except RosetNotFoundError:
    print("Path not found")
except RosetAPIError as e:
    print(f"API error: {e.code} - {e.message}")
except RosetError as e:
    print(f"General error: {e}")
```

## Requirements

- Python 3.9+
- For FUSE mount: Linux with Roset FUSE client installed

## Links

- [Documentation](https://docs.roset.dev)
- [Checkpoint Safety Contract](https://docs.roset.dev/concepts/checkpoint-safety)
- [GitHub](https://github.com/roset-dev/roset)
- [Changelog](https://github.com/roset-dev/roset/blob/main/CHANGELOG.md)

## License

MIT
