import os
import pytest

BASE_URL = os.environ.get("BIG365_API_URL", "http://localhost:8080/api")


@pytest.fixture(scope="session")
def base_url():
    """Return the base URL for the API under test."""
    return BASE_URL


@pytest.fixture
def api_url():
    """Return the API base URL (same as base_url, provided for convenience)."""
    return BASE_URL
