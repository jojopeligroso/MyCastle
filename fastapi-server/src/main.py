"""FastAPI MCP Server - Main Application."""
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .core.database import init_db, close_db
from .mcp.host import MCPHost
from .mcp.servers.finance import FinanceMCP
from .mcp.servers.academic import AcademicMCP
from .api import mcp, health

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global MCP Host instance
mcp_host: MCPHost = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global mcp_host

    logger.info("Starting MyCastle FastAPI MCP Server...")

    # Initialize database
    await init_db()

    # Create MCP Host
    mcp_host = MCPHost(
        name=settings.mcp_server_name,
        version=settings.mcp_server_version
    )

    # Register MCP servers
    finance_mcp = FinanceMCP()
    academic_mcp = AcademicMCP()

    mcp_host.register_server(finance_mcp)
    mcp_host.register_server(academic_mcp)

    # Initialize MCP Host
    await mcp_host.initialize()

    logger.info(
        f"MCP Host initialized with {mcp_host.server_count} servers "
        f"({mcp_host.total_tool_count} total tools)"
    )

    # Store MCP Host in app state
    app.state.mcp_host = mcp_host

    yield

    # Shutdown
    logger.info("Shutting down MyCastle FastAPI MCP Server...")
    await mcp_host.shutdown()
    await close_db()
    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="MyCastle FastAPI MCP Server",
    description="Model Context Protocol server for MyCastle ESL school management",
    version=settings.mcp_server_version,
    lifespan=lifespan,
    debug=settings.debug,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.debug else "An error occurred",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(mcp.router, prefix="/api/mcp", tags=["MCP"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.mcp_server_name,
        "version": settings.mcp_server_version,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level,
    )
