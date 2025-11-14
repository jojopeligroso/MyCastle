"""MCP Host - Central orchestration for all MCP servers."""
from typing import Dict, List, Optional
import logging

from .base import BaseMCPServer
from .types import (
    AuthContext,
    Tool,
    Resource,
    Prompt,
    ToolCallResponse,
    ResourceResponse,
    PromptResponse,
    CapabilitiesResponse,
)

logger = logging.getLogger(__name__)


class MCPHost:
    """Central orchestration layer for all MCP servers."""

    def __init__(self, name: str = "mycastle-mcp-host", version: str = "3.0.0"):
        """Initialize MCP Host.

        Args:
            name: Host name
            version: Host version
        """
        self.name = name
        self.version = version
        self._servers: Dict[str, BaseMCPServer] = {}
        self._scope_to_server: Dict[str, str] = {}
        self._initialized = False

    def register_server(self, server: BaseMCPServer) -> None:
        """Register an MCP server with the host.

        Args:
            server: MCP server instance to register

        Raises:
            ValueError: If scope already registered
        """
        scope_prefix = server.scope.split(":")[0]

        if scope_prefix in self._scope_to_server:
            raise ValueError(
                f"Scope '{scope_prefix}' already registered by server "
                f"'{self._scope_to_server[scope_prefix]}'"
            )

        self._servers[server.name] = server
        self._scope_to_server[scope_prefix] = server.name

        logger.info(
            f"Registered MCP server: {server.name} "
            f"(scope: {server.scope}, tools: {server.tool_count})"
        )

    async def initialize(self) -> None:
        """Initialize all registered servers."""
        for server in self._servers.values():
            logger.info(f"Initializing server: {server.name}")
            await server.initialize()

        self._initialized = True
        logger.info(f"MCP Host initialized with {len(self._servers)} servers")

    async def shutdown(self) -> None:
        """Shutdown all registered servers."""
        for server in self._servers.values():
            logger.info(f"Shutting down server: {server.name}")
            await server.shutdown()

        self._initialized = False
        logger.info("MCP Host shutdown complete")

    def _extract_scope_prefix(self, tool_name: str) -> str:
        """Extract scope prefix from tool name.

        Args:
            tool_name: Tool name (e.g., 'finance:create_booking')

        Returns:
            Scope prefix (e.g., 'finance')
        """
        if ":" not in tool_name:
            raise ValueError(f"Invalid tool name format: {tool_name}")

        return tool_name.split(":")[0]

    def _get_server_for_scope(self, scope_prefix: str) -> BaseMCPServer:
        """Get server responsible for a scope.

        Args:
            scope_prefix: Scope prefix (e.g., 'finance')

        Returns:
            MCP server instance

        Raises:
            ValueError: If no server registered for scope
        """
        if scope_prefix not in self._scope_to_server:
            raise ValueError(f"No server registered for scope: {scope_prefix}")

        server_name = self._scope_to_server[scope_prefix]
        return self._servers[server_name]

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict,
        context: AuthContext,
    ) -> ToolCallResponse:
        """Route and execute a tool call.

        Args:
            tool_name: Full tool name (e.g., 'finance:create_booking')
            arguments: Tool arguments
            context: Authentication context

        Returns:
            Tool execution response
        """
        scope_prefix = self._extract_scope_prefix(tool_name)
        server = self._get_server_for_scope(scope_prefix)

        logger.info(
            f"Routing tool '{tool_name}' to server '{server.name}' "
            f"for user {context.user_id}"
        )

        return await server.call_tool(tool_name, arguments, context)

    async def fetch_resource(
        self,
        uri: str,
        context: AuthContext,
    ) -> ResourceResponse:
        """Route and fetch a resource.

        Args:
            uri: Resource URI (e.g., 'mycastle://finance/invoices')
            context: Authentication context

        Returns:
            Resource contents
        """
        # Extract scope from URI (e.g., 'mycastle://finance/...' -> 'finance')
        if not uri.startswith("mycastle://"):
            raise ValueError(f"Invalid resource URI: {uri}")

        parts = uri.replace("mycastle://", "").split("/")
        scope_prefix = parts[0]

        server = self._get_server_for_scope(scope_prefix)

        logger.info(
            f"Routing resource '{uri}' to server '{server.name}' "
            f"for user {context.user_id}"
        )

        return await server.fetch_resource(uri, context)

    async def get_prompt(
        self,
        name: str,
        arguments: Dict,
        context: AuthContext,
    ) -> PromptResponse:
        """Route and get a prompt.

        Args:
            name: Prompt name (e.g., 'finance:invoice_review')
            arguments: Prompt arguments
            context: Authentication context

        Returns:
            Prompt response
        """
        scope_prefix = self._extract_scope_prefix(name)
        server = self._get_server_for_scope(scope_prefix)

        logger.info(
            f"Routing prompt '{name}' to server '{server.name}' "
            f"for user {context.user_id}"
        )

        return await server.get_prompt(name, arguments, context)

    def get_capabilities(
        self,
        context: Optional[AuthContext] = None,
    ) -> CapabilitiesResponse:
        """Get combined capabilities from all servers.

        Args:
            context: Optional authentication context for filtering

        Returns:
            Combined capabilities from all servers
        """
        all_tools: List[Tool] = []
        all_resources: List[Resource] = []
        all_prompts: List[Prompt] = []

        for server in self._servers.values():
            all_tools.extend(server.get_tools(context))
            all_resources.extend(server.get_resources(context))
            all_prompts.extend(server.get_prompts(context))

        return CapabilitiesResponse(
            tools=all_tools,
            resources=all_resources,
            prompts=all_prompts,
            serverInfo={
                "name": self.name,
                "version": self.version,
                "servers": [
                    f"{server.name} ({server.scope})"
                    for server in self._servers.values()
                ],
            },
        )

    @property
    def server_count(self) -> int:
        """Get number of registered servers."""
        return len(self._servers)

    @property
    def total_tool_count(self) -> int:
        """Get total number of tools across all servers."""
        return sum(server.tool_count for server in self._servers.values())
