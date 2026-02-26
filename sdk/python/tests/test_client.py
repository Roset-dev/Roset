"""Tests for Client."""
from roset import Client
from roset.exceptions import RosetAPIError, RosetNotFoundError


def test_client_init():
    """Test client initialization."""
    client = Client(api_key="test-key")

    assert client.files is not None
    assert client.jobs is not None
    assert client.spaces is not None
    assert client.connections is not None
    assert client.nodes is not None
    assert client.analytics is not None
    assert client.webhooks is not None


def test_client_context_manager():
    """Test client as context manager."""
    with Client(api_key="test-key") as client:
        assert client.files is not None
        assert client.webhooks is not None


def test_exceptions_import():
    """Test exceptions can be imported."""
    assert RosetAPIError is not None
    assert RosetNotFoundError is not None
