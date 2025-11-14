"""Pytest configuration and fixtures."""
import pytest
from datetime import datetime, timedelta
from typing import AsyncGenerator

from fastapi.testclient import TestClient
from httpx import AsyncClient

from src.main import app
from src.core.auth import auth_service
from src.mcp.types import AuthContext, UserRole


@pytest.fixture
def test_client():
    """Create test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create async test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def super_admin_context() -> AuthContext:
    """Create super admin authentication context for testing."""
    return AuthContext(
        user_id="test-super-admin-id",
        tenant_id="test-tenant-id",
        role=UserRole.SUPER_ADMIN,
        scopes=[
            "identity:*",
            "finance:*",
            "academic:*",
            "attendance:*",
            "compliance:*",
            "student_services:*",
            "ops:*",
            "quality:*",
            "teacher:*",
            "student:*",
        ],
        session_id="test-session-id",
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )


@pytest.fixture
def admin_context() -> AuthContext:
    """Create admin authentication context for testing."""
    return AuthContext(
        user_id="test-admin-id",
        tenant_id="test-tenant-id",
        role=UserRole.ADMIN,
        scopes=[
            "finance:*",
            "academic:*",
            "attendance:*",
            "compliance:*",
            "student_services:*",
            "quality:*",
        ],
        session_id="test-session-id",
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )


@pytest.fixture
def teacher_context() -> AuthContext:
    """Create teacher authentication context for testing."""
    return AuthContext(
        user_id="test-teacher-id",
        tenant_id="test-tenant-id",
        role=UserRole.TEACHER,
        scopes=["teacher:*"],
        session_id="test-session-id",
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )


@pytest.fixture
def student_context() -> AuthContext:
    """Create student authentication context for testing."""
    return AuthContext(
        user_id="test-student-id",
        tenant_id="test-tenant-id",
        role=UserRole.STUDENT,
        scopes=["student:*"],
        session_id="test-session-id",
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )


@pytest.fixture
def valid_jwt_token(admin_context: AuthContext) -> str:
    """Create a valid JWT token for testing."""
    return auth_service.create_jwt(
        user_id=admin_context.user_id,
        tenant_id=admin_context.tenant_id,
        role=admin_context.role.value,
        scopes=admin_context.scopes,
        session_id=admin_context.session_id,
    )
