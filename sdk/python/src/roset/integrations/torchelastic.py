"""
Roset TorchElastic Integration

Provides utilities for resume-on-eviction resilience with TorchElastic.
"""

from __future__ import annotations

from pathlib import Path

from roset.client import RosetClient


class RosetElastic:
    """
    Helper for TorchElastic resilience.
    
    Enables automatic discovery of the latest atomic checkpoint upon restart/resume.
    
    Usage:
        client = RosetClient(...)
        elastic = RosetElastic(client, mount_path="/mnt/roset", checkpoint_dir="/checkpoints")
        
        # On startup, check if we should resume
        resume_path = elastic.get_latest_checkpoint_path()
        if resume_path:
            load_checkpoint(resume_path)
    """

    def __init__(
        self,
        client: RosetClient,
        mount_path: str = "/mnt/roset",
        checkpoint_dir: str = "/checkpoints",
        ref_name: str = "latest",
    ):
        self.client = client
        self.mount_path = Path(mount_path)
        self.checkpoint_dir = checkpoint_dir.strip("/")
        self.ref_name = ref_name

    def get_latest_checkpoint_path(self) -> Path | None:
        """
        Resolve the 'latest' ref to a local filesystem path.
        
        Returns:
            Path to the latest checkpoint (directory or file depending on creation),
            or None if no committed checkpoint exists.
        """
        try:
            # 1. Fetch Ref
            ref = self.client.get_ref(self.ref_name)
            if not ref or not ref.commit_id:
                return None

            # 2. Get Commit -> Node
            commit = self.client.get_commit(ref.commit_id)
            if not commit:
                return None
                
            node = self.client.get_node(commit.node_id)
            if not node:
                return None

            # 3. Construct Path
            # This follows the pattern in pytorch.py: check_dir / node_name
            # If pytorch.py created it, node_name is "epoch=N.ckpt" (which is a folder)
            roset_path = f"{self.checkpoint_dir}/{node.name}"
            local_path = self.mount_path / roset_path.lstrip("/")
            
            # 4. Verify Local Existence (FUSE lag protection)
            # If the atomic commit happened, it should be visible.
            if local_path.exists():
                return local_path
            
            # Fallback: Check if it's strictly a file inside?
            # Assuming standard behavior, path should exist.
            return local_path
            
        except Exception:
            # On first run or error, return None to start fresh
            return None
