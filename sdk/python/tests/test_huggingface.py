"""Tests for Hugging Face integration."""

import pytest
from unittest.mock import MagicMock, patch

try:
    from roset.integrations.huggingface import RosetTrainerCallback
    from transformers import TrainerControl, TrainerState, TrainingArguments
except ImportError:
    pytest.skip("Transformers not installed", allow_module_level=True)


@pytest.fixture
def mock_client():
    client = MagicMock()
    # Mock commit return
    client.commit.return_value = MagicMock(id="commit-123")
    client.wait_for_commit.return_value = MagicMock(id="commit-123")
    # Mock resolve path
    client.resolve_path.return_value = MagicMock(id="node-123")
    return client


def test_hf_callback_init(mock_client):
    """Test callback initialization."""
    callback = RosetTrainerCallback(
        client=mock_client,
        update_ref="latest",
        mount_path="/tmp/roset"
    )
    assert callback.update_ref == "latest"
    assert str(callback.mount_path) == "/tmp/roset"


@patch("roset.integrations.huggingface.Path")
def test_hf_callback_on_save(mock_path, mock_client):
    """Test on_save logic trigger."""
    callback = RosetTrainerCallback(mock_client, mount_path="/mnt")
    
    # Mock state
    state = MagicMock(spec=TrainerState)
    state.is_world_process_zero = True
    state.global_step = 100
    
    # Mock args
    args = MagicMock(spec=TrainingArguments)
    args.output_dir = "/mnt/output"
    
    # This requires mocking the filesystem behavior for relative_to which is complex
    # without a real filesystem or pyfakefs. Tracking issue: SDK-123
    pytest.skip("Skipping deep path logic test until pyfakefs integration")
