"""Tests for Ray integration."""

import pytest
from unittest.mock import MagicMock

try:
    from roset.integrations.ray import RosetRayTrainCallback
except ImportError:
    pytest.skip("Ray not installed", allow_module_level=True)


def test_ray_callback_init():
    """Test Ray callback initialization."""
    client = MagicMock()
    callback = RosetRayTrainCallback(client, mount_path="/tmp/roset")
    assert callback.mount_path.name == "roset"
