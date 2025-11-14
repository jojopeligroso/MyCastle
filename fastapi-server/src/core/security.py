"""Security utilities and authorization helpers."""
from typing import List
from fastapi import HTTPException

from ..mcp.types import AuthContext


def require_scope(context: AuthContext, required_scope: str) -> None:
    """Verify user has required scope.

    Args:
        context: Authentication context
        required_scope: Required scope (e.g., 'finance:*' or 'finance:create_booking')

    Raises:
        HTTPException: If user lacks required scope
    """
    if not context.has_scope(required_scope):
        raise HTTPException(
            status_code=403,
            detail=f"Missing required scope: {required_scope}"
        )


def require_any_scope(context: AuthContext, required_scopes: List[str]) -> None:
    """Verify user has at least one of the required scopes.

    Args:
        context: Authentication context
        required_scopes: List of acceptable scopes

    Raises:
        HTTPException: If user lacks all required scopes
    """
    if not any(context.has_scope(scope) for scope in required_scopes):
        raise HTTPException(
            status_code=403,
            detail=f"Missing required scopes. Need one of: {', '.join(required_scopes)}"
        )


def require_all_scopes(context: AuthContext, required_scopes: List[str]) -> None:
    """Verify user has all required scopes.

    Args:
        context: Authentication context
        required_scopes: List of required scopes

    Raises:
        HTTPException: If user lacks any required scope
    """
    missing_scopes = [
        scope for scope in required_scopes
        if not context.has_scope(scope)
    ]

    if missing_scopes:
        raise HTTPException(
            status_code=403,
            detail=f"Missing required scopes: {', '.join(missing_scopes)}"
        )


def require_role(context: AuthContext, required_roles: List[str]) -> None:
    """Verify user has one of the required roles.

    Args:
        context: Authentication context
        required_roles: List of acceptable roles

    Raises:
        HTTPException: If user lacks required role
    """
    if context.role.value not in required_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient privileges. Required roles: {', '.join(required_roles)}"
        )


def require_tenant(context: AuthContext, tenant_id: str) -> None:
    """Verify user belongs to specified tenant.

    Args:
        context: Authentication context
        tenant_id: Required tenant ID

    Raises:
        HTTPException: If user belongs to different tenant
    """
    if context.tenant_id != tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: tenant mismatch"
        )
