"""
Roset Hugging Face Integration

Atomic checkpoint callback for Hugging Face Trainer.
"""

from __future__ import annotations

import logging
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import TYPE_CHECKING, Any

try:
    from transformers import TrainerCallback, TrainerControl, TrainerState, TrainingArguments
except ImportError as e:
    raise ImportError(
        "Transformers is required for this integration. "
        "Install with: pip install roset[huggingface]"
    ) from e

from roset.client import RosetClient
from roset.exceptions import RosetAPIError
from roset.models import Commit

if TYPE_CHECKING:
    from transformers import TrainerControl, TrainerState, TrainingArguments

logger = logging.getLogger(__name__)

# Pattern to match HF checkpoint folders
CHECKPOINT_PATTERN = re.compile(r"^checkpoint-(\d+)$")


class RosetTrainerCallback(TrainerCallback):
    """
    Atomic checkpoint callback for Hugging Face Trainer.

    Triggers an atomic commit and updates a ref whenever Trainer saves a checkpoint.

    Usage:
        from transformers import Trainer
        from roset.integrations.huggingface import RosetTrainerCallback

        trainer = Trainer(
            ...,
            callbacks=[
                RosetTrainerCallback(
                    client=client,
                    update_ref="latest",
                    async_commit=True,  # Non-blocking for large checkpoints
                )
            ]
        )
    """

    def __init__(
        self,
        client: RosetClient,
        update_ref: str | None = "latest",
        commit_message_prefix: str = "HF Checkpoint",
        mount_path: str = "/mnt/roset",
        async_commit: bool = False,
    ):
        """
        Initialize callback.

        Args:
            client: Roset API client
            update_ref: Ref name to update (e.g. "latest")
            commit_message_prefix: Prefix for commit messages
            mount_path: Local mount path where checkpoints are written
            async_commit: If True, commit in background thread (non-blocking)
        """
        self.client = client
        self.update_ref = update_ref
        self.commit_message_prefix = commit_message_prefix
        self.mount_path = Path(mount_path)
        self.async_commit = async_commit
        self._executor = ThreadPoolExecutor(max_workers=1) if async_commit else None

    def _find_latest_checkpoint(self, output_dir: Path) -> Path | None:
        """
        Find the most recent checkpoint folder in output_dir.
        
        Handles save_total_limit rotation by scanning for highest numbered checkpoint.
        """
        if not output_dir.exists():
            return None
            
        checkpoints = []
        for child in output_dir.iterdir():
            if child.is_dir():
                match = CHECKPOINT_PATTERN.match(child.name)
                if match:
                    checkpoints.append((int(match.group(1)), child))
        
        if not checkpoints:
            return None
        
        # Return highest step checkpoint
        checkpoints.sort(key=lambda x: x[0], reverse=True)
        return checkpoints[0][1]

    def _do_commit(self, folder_id: str, step: int) -> Commit | None:
        """
        Perform the actual commit + ref update.
        
        Returns:
            Commit object on success, None on failure.
        """
        try:
            message = f"{self.commit_message_prefix}: step {step}"
            commit = self.client.commit(folder_id, message=message)
            commit = self.client.wait_for_commit(commit.id)

            if self.update_ref:
                self.client.update_ref(self.update_ref, commit.id)
                logger.info(f"Updated ref '{self.update_ref}' to commit {commit.id}")

            logger.info(f"Successfully committed checkpoint step {step}")
            return commit

        except RosetAPIError as e:
            logger.error(f"Failed to commit checkpoint: {e}")
            return None

    def on_save(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs: Any,
    ) -> None:
        """
        Event called after a checkpoint save.
        """
        if not state.is_world_process_zero:
            return  # Only commit from main process

        output_dir = Path(args.output_dir)

        # Resolve Roset path
        try:
            rel_path = output_dir.relative_to(self.mount_path)
            roset_base_path = f"/{rel_path}"
        except ValueError:
            logger.warning(
                f"Output dir {output_dir} is not inside mount path {self.mount_path}. "
                "Skipping Roset commit."
            )
            return

        # Find the actual checkpoint folder (handles save_total_limit rotation)
        checkpoint_dir = self._find_latest_checkpoint(output_dir)
        if not checkpoint_dir:
            logger.warning(f"No checkpoint folders found in {output_dir}")
            return

        roset_path = f"{roset_base_path}/{checkpoint_dir.name}"
        logger.info(f"Committing HF checkpoint: {roset_path}")

        # Resolve node ID
        folder = self.client.resolve_path(roset_path)
        if not folder:
            logger.error(f"Could not find Roset node for {roset_path} after save.")
            return

        # Extract step from folder name
        match = CHECKPOINT_PATTERN.match(checkpoint_dir.name)
        step = int(match.group(1)) if match else state.global_step

        # Commit (async or sync)
        if self.async_commit and self._executor:
            self._executor.submit(self._do_commit, folder.id, step)
        else:
            self._do_commit(folder.id, step)

    def __del__(self):
        """Cleanup thread pool on deletion."""
        if self._executor:
            self._executor.shutdown(wait=False)
