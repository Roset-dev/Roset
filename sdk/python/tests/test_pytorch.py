"""Tests for PyTorch integration."""

import pytest


def test_pytorch_import():
    """Test PyTorch integration can be imported (if pytorch available)."""
    try:
        from roset.integrations.pytorch import RosetCheckpointIO

        assert RosetCheckpointIO is not None
    except ImportError:
        # PyTorch not installed, skip
        pytest.skip("PyTorch not installed")
