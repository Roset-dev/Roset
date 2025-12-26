"""
Roset PyTorch Lightning Integration

Atomic checkpoint I/O for PyTorch Lightning.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any

try:
    import torch
    from pytorch_lightning.plugins.io import CheckpointIO
except ImportError as e:
    raise ImportError(
        "PyTorch Lightning is required for this integration. "
        "Install with: pip install roset[pytorch]"
    ) from e

from roset.client import RosetClient
from roset.exceptions import RosetAPIError


class RosetCheckpointIO(CheckpointIO):
    """
    Atomic checkpoint I/O for PyTorch Lightning.

    Provides the "Resume always works" guarantee via Roset's atomic commits
    and release pointers.

    Example:
        from roset import Client
        from roset.integrations.pytorch import RosetCheckpointIO
        from pytorch_lightning import Trainer

        client = Client(api_url="...", api_key="...")

        trainer = Trainer(
            plugins=[RosetCheckpointIO(
                client=client,
                mount_path="/mnt/roset",
                checkpoint_dir="/checkpoints",
                update_ref="latest",
            )]
        )

        # Resume from latest (always works!)
        trainer.fit(model, ckpt_path="latest")
    """

    def __init__(
        self,
        client: RosetClient,
        mount_path: str = "/mnt/roset",
        checkpoint_dir: str = "/checkpoints",
        update_ref: str | None = "latest",
    ):
        """
        Initialize RosetCheckpointIO.

        Args:
            client: Roset API client
            mount_path: Local mount path where Roset FUSE is mounted
            checkpoint_dir: Directory within mount for checkpoints
            update_ref: Ref name to update after commit (e.g., "latest")
        """
        super().__init__()
        self.client = client
        self.mount_path = Path(mount_path)
        self.checkpoint_dir = checkpoint_dir
        self.update_ref = update_ref

    def _resolve_path(self, path: str | Path) -> tuple[Path, str]:
        """
        Resolve path to local filesystem path and Roset path.

        Returns:
            (local_path, roset_path)
        """
        path = Path(path)

        # If path is absolute and starts with mount, extract roset path
        if path.is_absolute() and str(path).startswith(str(self.mount_path)):
            roset_path = "/" + str(path.relative_to(self.mount_path))
            return path, roset_path

        # If path is "latest" or a ref name, resolve it
        if str(path) == "latest" or not path.suffix:
            ref = self.client.get_ref(str(path))
            if ref and ref.commit:
                # Get the node path for this commit
                commit = self.client.get_commit(ref.commit_id)
                node = self.client.get_node(commit.node_id)
                roset_path = f"{self.checkpoint_dir}/{node.name}"
                local_path = self.mount_path / roset_path.lstrip("/")
                return local_path, roset_path

        # Otherwise, treat as relative to checkpoint_dir
        roset_path = f"{self.checkpoint_dir}/{path}"
        local_path = self.mount_path / roset_path.lstrip("/")
        return local_path, roset_path

    def save_checkpoint(
        self,
        checkpoint: dict[str, Any],
        path: str | Path,
        storage_options: dict[str, Any] | None = None,
    ) -> None:
        """
        Save checkpoint atomically.

        Steps:
        1. Create folder in Roset
        2. Write checkpoint via FUSE mount
        3. Commit atomically
        4. Update ref (if configured)
        """
        local_path, roset_path = self._resolve_path(path)

        # Roset folder is the *parent* of the file (checkpoints/step-1000/model.ckpt)
        # OR usually PyTorch Lightning saves as a *file*.
        # For Roset atomic commits, we usually want to commit a *folder*.
        # If path is `checkpoints/epoch=1.ckpt` (file), we should probably put it in `checkpoints/epoch=1/model.ckpt`?
        # Standard PL behavior: path IS the file.
        # Roset Model: We commit FOLDERS.
        # Strategy: Create a folder with the checkpoint name (without extension), write file inside.

        # However, to be compatible with PL expectation that path IS the file:
        # We need to see if the user provided a folder or file path.
        # PL usually provides a file path.

        # Let's assume we treat the file's parent directory as the "checkpoint folder"
        # IF that folder was created just for this checkpoint.

        # Alternative: The user creates `checkpoints/step-1/` and we save `checkpoints/step-1/checkpoint.ckpt`.
        # Code above derived `folder_name` from `path.name`.
        # If `path` is `.../step-1.ckpt`, folder_name is `step-1.ckpt`. We create a folder `step-1.ckpt`?

        # Correct Roset pattern:
        # Checkpoint = Directory.
        # Checkpoint content = Files in directory.

        # If PL gives `.../epoch=1.ckpt`, we can't easily turn that into a directory without confusing PL (maybe).
        # Actually, PL supports directory checkpoints (ShardedTensor).
        # But for standard models, it's a file.

        # Improvement: We will use the PARENT directory of the checkpoint file as the commit target,
        # assuming the user configured `ModelCheckpoint(dirpath="checkpoints/step-N")`.
        # But `ModelCheckpoint` usually reuses `dirpath` and changes filename.

        # Let's stick to the previous logical assumption or improve it:
        # We create a folder `path.stem` (e.g. `epoch=1`), put the file inside as `checkpoint.ckpt`?
        # That would change the path structure PL expects on load.

        # Let's assume the simpler case:
        # The user configured PL to save to `.../folder_name/checkpoint.ckpt`.
        # So `parent_path` is the folder we want to commit.

        # We will create a folder for this checkpoint to ensure atomicity and isolation.
        # If we just write to /checkpoints/ and commit /checkpoints/, we commit ALL checkpoints. Bad.

        # NEW STRATEGY:
        # We use the filename as a FOLDER name.
        # Inside, we save the actual data.
        # PL might be confused if `path` is supposed to be a file.

        # BUT `torch.save` takes a file-like object.
        # We open `local_path` (which includes the filename).
        # So we represent the checkpoint as a FILE in Roset, but to commit it, we need it to be in a uncommitted state?
        # Roset commits are FOLDER level.
        # Can we commit a SINGLE FILE? No, `initiateCommit` expects a folder node_id.

        # Fix: We MUST create a wrapper folder.
        # If path is `.../epoch=0.ckpt`, we create FOLDER `.../epoch=0` and save file `checkpoint.ckpt` inside.
        # Then, we might need to adjust what we return to PL?
        # `save_checkpoint` returns None.

        # Adjusted logic:
        # 1. Parse `path`
        # 2. Checkpoint Folder = `path` (strip extension)
        # 3. File inside = `path.name` (keep extension)

        ckpt_folder_name = local_path.stem # epoch=0
        ckpt_parent = str(Path(roset_path).parent) # /checkpoints

        # Checkpoint Folder Path: /checkpoints/epoch=0
        ckpt_roset_path = f"{ckpt_parent}/{ckpt_folder_name}"

        # 1. Create folder
        try:
            folder = self.client.create_folder(ckpt_parent, ckpt_folder_name)
        except RosetAPIError as e:
            if e.code == "ALREADY_EXISTS":
                # Use resolve_path to get the node ID
                folder = self.client.resolve_path(ckpt_roset_path)
                if not folder:
                    raise  # Should not happen if ALREADY_EXISTS
            else:
                raise

        # 2. Write file
        # We write to `.../epoch=0/epoch=0.ckpt` to keep filename consistent?
        # Or just `checkpoint.ckpt`?
        # User expects `path` to exist.
        # If we change the path structure, `load_checkpoint(path)` needs to know.
        # Our `load_checkpoint` does resolve path.

        # Let's write to `path` directly as requested by PL, BUT ensure it is inside a dedicated folder?
        # Impossible if PL controls the path entirely (e.g. `dirpath` + `filename`).

        # Workaround: valid Roset usage requires `ModelCheckpoint` to be configured such that each checkpoint is a folder?
        # Or we implicitly wrap every file checkpoint in a folder.

        # Let's stick to: Create folder matching the filename. Write the file inside with same name.
        # Local path becomes: `mount/.../epoch=0.ckpt/epoch=0.ckpt`? (Folder ending in .ckpt)
        # Verify: `local_path` is the target file path.
        # We intercept this.

        # Actually, let's look at `torch.save`. It writes to a file.
        # If `local_path` is `/mnt/roset/checkpoints/ep1.ckpt`.
        # We create folder `/checkpoints/ep1.ckpt`.
        # We write file `/mnt/roset/checkpoints/ep1.ckpt/model.pt`.
        # This seems safest.

        # But `load_checkpoint` receives `/mnt/roset/checkpoints/ep1.ckpt`.
        # It expects to find a file. It will find a directory. `torch.load` might fail.
        # WE override `load_checkpoint`. So we can handle this redirection.

        real_folder_path = local_path # Treat the "file path" as a directory
        real_file_path = real_folder_path / "model.pt"

        parent_roset_path = str(Path(roset_path).parent)
        folder_node_name = local_path.name

        # 1. Create folder (the "checkpoint file" is virtually a folder)
        try:
            folder = self.client.create_folder(parent_roset_path, folder_node_name)
        except RosetAPIError as e:
            if e.code == "ALREADY_EXISTS":
                folder = self.client.resolve_path(f"{parent_roset_path}/{folder_node_name}")
                if not folder:
                    raise
            else:
                raise

        # 2. Write file inside
        real_folder_path.mkdir(parents=True, exist_ok=True)

        with open(real_file_path, "wb") as f:
            torch.save(checkpoint, f)

        # 3. Commit the FOLDER
        commit = self.client.commit(folder.id, message=f"Checkpoint: {folder_node_name}")
        commit = self.client.wait_for_commit(commit.id)

        # 4. Update ref
        if self.update_ref:
            self.client.update_ref(self.update_ref, commit.id)

    def load_checkpoint(
        self,
        path: str | Path,
        map_location: Any = None,
    ) -> dict[str, Any]:
        """Load checkpoint from Roset."""
        local_path, _ = self._resolve_path(path)

        # We expect local_path to be a directory containing `model.pt`
        # per our save_checkpoint logic.
        real_file_path = local_path / "model.pt"

        if not real_file_path.exists():
            # Fallback: maybe it's an old style generic file?
            if local_path.is_file():
                return torch.load(local_path, map_location=map_location)
            raise FileNotFoundError(f"Checkpoint not found: {real_file_path}")

        return torch.load(real_file_path, map_location=map_location)

    def remove_checkpoint(self, path: str | Path) -> None:
        """Remove checkpoint (soft delete via API)."""
        _, roset_path = self._resolve_path(path)

        # Resolve to node ID
        node = self.client.resolve_path(roset_path)
        if node:
            self.client.delete_node(node.id)
        elif os.path.exists(path):
             # Fallback cleanup for local-only files (unlikely in this integration)
             shutil.rmtree(path)
