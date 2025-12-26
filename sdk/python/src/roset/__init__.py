"""
Roset Python SDK

Filesystem for object storage with atomic checkpoint support.
"""

from roset.client import RosetClient as Client
from roset.models import Commit, CommitGroup, Node, Ref
from roset.exceptions import RosetError, RosetAPIError, RosetValidationError

__version__ = "0.1.0"

__all__ = [
    "Client",
    "Node",
    "Commit",
    "CommitGroup",
    "Ref",
    "RosetError",
    "RosetAPIError",
    "RosetValidationError",
]
