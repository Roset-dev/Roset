# Changelog

All notable changes to the Roset Python SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-26

### Added

- Initial release of the Roset Python SDK
- Core `RosetClient` with full API coverage:
  - Node operations (create, resolve, delete)
  - Atomic commits with async support
  - Commit groups for cross-folder atomicity
  - Refs (atomic pointers like `latest`)
- **PyTorch Lightning integration** (`RosetCheckpointIO`)
  - Drop-in `CheckpointIO` plugin
  - Automatic folder wrapping for atomic commits
  - Ref updates after each checkpoint
- **HuggingFace Transformers integration** (`RosetTrainerCallback`)
  - `TrainerCallback` for automatic checkpoint commits
  - Async commit support for large models
  - World process zero handling for distributed training
- **Ray Train integration** (`RosetRayTrainCallback`)
  - Manual `process_checkpoint()` helper
  - Async commit support
- Automatic retry with exponential backoff
- Full type annotations (strict mypy compatible)
- Comprehensive error handling with typed exceptions

### Checkpoint Safety Contract

This release implements the core Roset guarantee:

```
STAGING → SEALING → COMMITTED
```

- Partial checkpoints are never visible
- `latest` pointer only updates after successful commit
- Committed folders are immutable

[0.1.0]: https://github.com/roset-dev/roset/releases/tag/python-v0.1.0
