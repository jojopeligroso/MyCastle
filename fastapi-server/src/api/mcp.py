"""MCP API endpoints."""
from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Query

from ..core.auth import get_current_user
from ..mcp.types import (
    AuthContext,
    ToolCallRequest,
    ToolCallResponse,
    ResourceRequest,
    ResourceResponse,
    PromptRequest,
    PromptResponse,
    CapabilitiesResponse,
)
from ..mcp.host import MCPHost

router = APIRouter()
logger = logging.getLogger(__name__)


def get_mcp_host(request: Request) -> MCPHost:
    """Get MCP Host from request state.

    Args:
        request: FastAPI request

    Returns:
        MCP Host instance

    Raises:
        HTTPException: If MCP Host not initialized
    """
    mcp_host = getattr(request.app.state, "mcp_host", None)

    if not mcp_host:
        raise HTTPException(
            status_code=503,
            detail="MCP Host not initialized"
        )

    return mcp_host


@router.get("/capabilities", response_model=CapabilitiesResponse)
async def get_capabilities(
    request: Request,
    context: AuthContext = Depends(get_current_user),
) -> CapabilitiesResponse:
    """Get MCP capabilities (tools, resources, prompts).

    Returns list of available capabilities filtered by user's scopes.

    Args:
        request: FastAPI request
        context: Authentication context

    Returns:
        Capabilities response with available tools, resources, and prompts
    """
    mcp_host = get_mcp_host(request)

    logger.info(f"User {context.user_id} requested capabilities")

    return mcp_host.get_capabilities(context)


@router.post("/tools/{tool_name}", response_model=ToolCallResponse)
async def call_tool(
    tool_name: str,
    request_body: ToolCallRequest,
    request: Request,
    context: AuthContext = Depends(get_current_user),
) -> ToolCallResponse:
    """Execute an MCP tool.

    Args:
        tool_name: Name of tool to execute
        request_body: Tool call request with arguments
        request: FastAPI request
        context: Authentication context

    Returns:
        Tool execution response

    Raises:
        HTTPException: If tool not found or execution fails
    """
    mcp_host = get_mcp_host(request)

    logger.info(
        f"User {context.user_id} calling tool '{tool_name}' "
        f"with arguments: {request_body.arguments}"
    )

    try:
        return await mcp_host.call_tool(
            tool_name,
            request_body.arguments,
            context
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Tool execution failed: {str(e)}")


@router.get("/resources", response_model=ResourceResponse)
async def get_resource(
    uri: str = Query(..., description="Resource URI (e.g., mycastle://finance/invoices)"),
    request: Request = None,
    context: AuthContext = Depends(get_current_user),
) -> ResourceResponse:
    """Fetch an MCP resource.

    Args:
        uri: Resource URI
        request: FastAPI request
        context: Authentication context

    Returns:
        Resource contents

    Raises:
        HTTPException: If resource not found or access denied
    """
    mcp_host = get_mcp_host(request)

    logger.info(f"User {context.user_id} fetching resource '{uri}'")

    try:
        return await mcp_host.fetch_resource(uri, context)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching resource {uri}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Resource fetch failed: {str(e)}")


@router.post("/prompts/{prompt_name}", response_model=PromptResponse)
async def get_prompt(
    prompt_name: str,
    request_body: PromptRequest,
    request: Request,
    context: AuthContext = Depends(get_current_user),
) -> PromptResponse:
    """Get an MCP prompt template.

    Args:
        prompt_name: Name of prompt
        request_body: Prompt request with arguments
        request: FastAPI request
        context: Authentication context

    Returns:
        Prompt response with messages

    Raises:
        HTTPException: If prompt not found or access denied
    """
    mcp_host = get_mcp_host(request)

    logger.info(
        f"User {context.user_id} requesting prompt '{prompt_name}' "
        f"with arguments: {request_body.arguments}"
    )

    try:
        return await mcp_host.get_prompt(
            prompt_name,
            request_body.arguments,
            context
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting prompt {prompt_name}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prompt generation failed: {str(e)}")


@router.get("/servers")
async def list_servers(
    request: Request,
    context: AuthContext = Depends(get_current_user),
):
    """List registered MCP servers.

    Args:
        request: FastAPI request
        context: Authentication context

    Returns:
        List of registered servers
    """
    mcp_host = get_mcp_host(request)

    servers_info = []
    for server_name, server in mcp_host._servers.items():
        servers_info.append({
            "name": server.name,
            "version": server.version,
            "scope": server.scope,
            "tool_count": server.tool_count,
            "tools": [tool.name for tool in server.get_tools(context)],
        })

    return {
        "servers": servers_info,
        "total_servers": mcp_host.server_count,
        "total_tools": mcp_host.total_tool_count,
    }
