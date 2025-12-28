"""Tests for RosetClient."""
import pytest
from roset import RosetClient, RosetAdmin
from roset.exceptions import RosetAPIError, RosetNotFoundError

def test_client_init():
    """Test data plane client initialization."""
    client = RosetClient(api_key="test")
    
    # Verify Data Plane Resources
    assert client.nodes is not None
    assert client.uploads is not None
    assert client.shares is not None
    assert client.audit is not None
    assert client.mounts is not None
    assert client.commits is not None
    assert client.refs is not None
    assert client.search is not None

    # Verify Control Plane Resources are ABSENT
    assert not hasattr(client, "org")
    assert not hasattr(client, "integrations")

def test_admin_init():
    """Test control plane client initialization."""
    admin = RosetAdmin(api_key="test")
    
    # Verify Control Plane Resources
    assert admin.org is not None
    assert admin.integrations is not None

    # Verify Data Plane Resources are ABSENT
    assert not hasattr(admin, "nodes")
    assert not hasattr(admin, "commits")

def test_exceptions_import():
    """Test exceptions can be imported."""
    assert RosetAPIError is not None
    assert RosetNotFoundError is not None
