"""Authentication and JWT handling."""
from datetime import datetime, timedelta
from typing import Optional, List
import logging

import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client, Client

from ..config import settings
from ..mcp.types import AuthContext, UserRole

logger = logging.getLogger(__name__)

security = HTTPBearer()


class AuthService:
    """Authentication service using Supabase."""

    def __init__(self):
        """Initialize auth service."""
        self.supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

    def verify_jwt(self, token: str) -> dict:
        """Verify JWT token.

        Args:
            token: JWT token to verify

        Returns:
            Decoded token payload

        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            # First try to verify with Supabase
            response = self.supabase.auth.get_user(token)
            if response and response.user:
                return {
                    "sub": response.user.id,
                    "email": response.user.email,
                }

        except Exception as e:
            logger.warning(f"Supabase verification failed: {str(e)}")

        # Fallback to manual JWT verification
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm]
            )
            return payload

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    async def get_user_context(self, token: str) -> AuthContext:
        """Get full authentication context from token.

        Args:
            token: JWT token

        Returns:
            Authentication context

        Raises:
            HTTPException: If user not found or token invalid
        """
        payload = self.verify_jwt(token)
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user ID")

        # Fetch user details from database
        try:
            response = self.supabase.table("user").select(
                "id, tenant_id, role_scope, scopes"
            ).eq("id", user_id).execute()

            if not response.data or len(response.data) == 0:
                raise HTTPException(status_code=404, detail="User not found")

            user_data = response.data[0]

            # Generate scopes from role if not explicitly set
            scopes = user_data.get("scopes", [])
            if not scopes:
                scopes = self._generate_scopes_from_role(user_data["role_scope"])

            return AuthContext(
                user_id=user_id,
                tenant_id=user_data["tenant_id"],
                role=UserRole(user_data["role_scope"]),
                scopes=scopes,
                session_id=payload.get("session_id"),
                expires_at=datetime.fromtimestamp(payload.get("exp", 0))
                if payload.get("exp")
                else None,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching user context: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Failed to fetch user context"
            )

    def _generate_scopes_from_role(self, role: str) -> List[str]:
        """Generate default scopes based on user role.

        Args:
            role: User role

        Returns:
            List of scopes
        """
        role_scope_map = {
            "super_admin": [
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
            "admin": [
                "finance:*",
                "academic:*",
                "attendance:*",
                "compliance:*",
                "student_services:*",
                "quality:*",
            ],
            "admin_dos": [
                "academic:*",
                "teacher:*",
                "quality:*",
            ],
            "admin_reception": [
                "student_services:*",
                "attendance:*",
            ],
            "admin_student_operations": [
                "student_services:*",
                "compliance:*",
            ],
            "admin_sales": [
                "finance:*",
            ],
            "teacher": [
                "teacher:*",
            ],
            "teacher_dos": [
                "teacher:*",
                "academic:*",
            ],
            "student": [
                "student:*",
            ],
        }

        return role_scope_map.get(role, [])

    def create_jwt(
        self,
        user_id: str,
        tenant_id: str,
        role: str,
        scopes: List[str],
        session_id: Optional[str] = None,
    ) -> str:
        """Create a JWT token.

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            role: User role
            scopes: User scopes
            session_id: Optional session ID

        Returns:
            JWT token
        """
        expiration = datetime.utcnow() + timedelta(
            minutes=settings.jwt_expiration_minutes
        )

        payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "role_scope": role,
            "scopes": scopes,
            "session_id": session_id,
            "iat": datetime.utcnow(),
            "exp": expiration,
        }

        return jwt.encode(
            payload,
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm
        )


# Global auth service instance
auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthContext:
    """FastAPI dependency to get current authenticated user.

    Args:
        credentials: HTTP authorization credentials

    Returns:
        Authentication context

    Raises:
        HTTPException: If authentication fails
    """
    return await auth_service.get_user_context(credentials.credentials)
