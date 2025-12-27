# <img src="../../logo.png" width="32" height="32" align="center" /> Roset Python SDK Changelog

All notable changes to the Roset Python SDK are documented here. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-26

### Added (Core)
- **Filesystem Semantics** on object storage (create, resolve, move, delete).
- **Atomic Commits**: Ensure directory integrity with backend write-sealing.
- **Commit Groups**: Coordinate multi-folder atomic updates.
- **Symbolic Refs**: Implementation of atomic pointers (e.g., `/latest`).

### Added (Integrations)
- **PyTorch Lightning**: `RosetCheckpointIO` for seamless checkpoint durability.
- **HuggingFace**: `RosetTrainerCallback` with asynchronous commit support.
- **Ray Train**: `RosetRayTrainCallback` for distributed training sync.

### Safety Guarantees
- Implementation of the **Checkpoint Safety Contract**: Prevent partial writes from becoming visible.
- Built-in retry logic with jitter and exponential backoff for high-latency environments.

[0.1.0]: https://github.com/roset-dev/roset/releases/tag/python-v0.1.0
