"""Tests for RosetClient."""

import pytest


def test_client_init():
    """Test client initialization."""
    from roset import Client

    # Would need mock server to test properly
    # For now just verify import works
    assert Client is not None


def test_models_import():
    """Test models can be imported."""
    from roset.models import Commit, CommitGroup, Node, Ref

    assert Node is not None
    assert Commit is not None
    assert CommitGroup is not None
    assert Ref is not None


def test_exceptions_import():
    """Test exceptions can be imported."""
    from roset.exceptions import RosetAPIError, RosetError, RosetNotFoundError

    assert RosetError is not None
    assert RosetAPIError is not None
    assert RosetNotFoundError is not None
