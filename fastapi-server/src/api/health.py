"""Health check endpoints."""
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..config import settings
from ..mcp.types import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request) -> HealthResponse:
    """Health check endpoint.

    Returns:
        Health status and server information
    """
    mcp_host = getattr(request.app.state, "mcp_host", None)

    details: Dict[str, Any] = {
        "environment": settings.env,
        "debug": settings.debug,
    }

    if mcp_host:
        details.update({
            "mcp_servers": mcp_host.server_count,
            "total_tools": mcp_host.total_tool_count,
            "initialized": mcp_host._initialized,
        })
        status = "healthy" if mcp_host._initialized else "unhealthy"
    else:
        status = "unhealthy"
        details["error"] = "MCP Host not initialized"

    return HealthResponse(
        status=status,
        version=settings.mcp_server_version,
        timestamp=datetime.utcnow(),
        details=details,
    )


@router.get("/health/ready")
async def readiness_check(request: Request) -> JSONResponse:
    """Readiness check for Kubernetes/Docker.

    Returns:
        200 if ready, 503 if not ready
    """
    mcp_host = getattr(request.app.state, "mcp_host", None)

    if mcp_host and mcp_host._initialized:
        return JSONResponse(
            status_code=200,
            content={"status": "ready"}
        )

    return JSONResponse(
        status_code=503,
        content={"status": "not ready"}
    )


@router.get("/health/live")
async def liveness_check() -> JSONResponse:
    """Liveness check for Kubernetes/Docker.

    Returns:
        200 always (if server is running)
    """
    return JSONResponse(
        status_code=200,
        content={"status": "alive"}
    )
