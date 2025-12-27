"""
Roset Ray Train Integration

Callback for Ray Train checkpoints.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    import ray  # noqa: F401 - import for availability check only
except ImportError as e:
    raise ImportError(
        "Ray is required for this integration. Install with: pip install roset[ray]"
    ) from e

from roset.client import RosetClient
from roset.exceptions import RosetAPIError
from roset.models import Commit

logger = logging.getLogger(__name__)


class RosetRayTrainCallback:
    """
    Callback/Hook for Ray Train checkpoints to trigger Roset commits.

    Note: Ray Train's callback API varies across versions. This class provides
    a `process_checkpoint` helper that can be called manually or integrated
    into custom training loops.

    Usage (manual integration):
        roset_callback = RosetRayTrainCallback(client=client, update_ref="latest")

        # In your training loop after saving checkpoint:
        commit = roset_callback.process_checkpoint("/mnt/roset/checkpoints/step-1000", step=1000)
        if commit:
            print(f"Committed: {commit.id}")
    """

    def __init__(
        self,
        client: RosetClient,
        update_ref: str | None = "latest",
        mount_path: str = "/mnt/roset",
        async_commit: bool = False,
    ):
        """
        Initialize Ray Train callback.

        Args:
            client: Roset API client
            update_ref: Ref name to update (e.g. "latest")
            mount_path: Local mount path where checkpoints are written
            async_commit: If True, commit in background thread (non-blocking)
        """
        self.client = client
        self.update_ref = update_ref
        self.mount_path = Path(mount_path)
        self.async_commit = async_commit
        self._executor = ThreadPoolExecutor(max_workers=1) if async_commit else None

    def _do_commit(self, folder_id: str, step: int) -> Commit | None:
        """
        Perform the actual commit + ref update.

        Returns:
            Commit object on success, None on failure.
        """
        try:
            message = f"Ray Checkpoint: step {step}"
            commit = self.client.commit(folder_id, message=message)
            commit = self.client.wait_for_commit(commit.id)

            if self.update_ref:
                self.client.update_ref(self.update_ref, commit.id)
                logger.info(f"Updated Ray ref '{self.update_ref}' to {commit.id}")

            logger.info(f"Successfully committed Ray checkpoint step {step}")
            return commit

        except RosetAPIError as e:
            logger.error(f"Failed to commit Ray checkpoint: {e}")
            return None

    def process_checkpoint(
        self,
        checkpoint_dir: str | Path,
        step: int = 0,
    ) -> Commit | None:
        """
        Process a saved checkpoint directory.

        Args:
            checkpoint_dir: Path to the checkpoint folder on the local filesystem (FUSE).
            step: Training step number (for commit message).

        Returns:
            Commit object on success, None on failure or if path is not in mount.
        """
        path = Path(checkpoint_dir)

        # Check if inside mount
        try:
            rel_path = path.relative_to(self.mount_path)
            roset_path = f"/{rel_path}"
        except ValueError:
            logger.warning(f"Checkpoint {path} not in mount {self.mount_path}. Skipping commit.")
            return None

        # Resolve node
        folder = self.client.resolve_path(roset_path)
        if not folder:
            logger.error(f"Roset node not found for {roset_path}")
            return None

        # Commit (async or sync)
        if self.async_commit and self._executor:
            self._executor.submit(self._do_commit, folder.id, step)
            return None  # Async mode returns None immediately
        else:
            return self._do_commit(folder.id, step)

    def __del__(self):
        """Cleanup thread pool on deletion."""
        if self._executor:
            self._executor.shutdown(wait=False)
