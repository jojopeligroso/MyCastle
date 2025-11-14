"""Tests for FastAPI endpoints."""
import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_root_endpoint(client: TestClient):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert "name" in data
    assert "version" in data
    assert "status" in data


def test_health_endpoint(client: TestClient):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "timestamp" in data


def test_health_live_endpoint(client: TestClient):
    """Test liveness probe endpoint."""
    response = client.get("/health/live")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "alive"


def test_capabilities_requires_auth(client: TestClient):
    """Test capabilities endpoint requires authentication."""
    response = client.get("/api/mcp/capabilities")
    assert response.status_code == 403  # No auth header


def test_tool_call_requires_auth(client: TestClient):
    """Test tool call endpoint requires authentication."""
    response = client.post(
        "/api/mcp/tools/finance:create_booking",
        json={"arguments": {}}
    )
    assert response.status_code == 403  # No auth header
