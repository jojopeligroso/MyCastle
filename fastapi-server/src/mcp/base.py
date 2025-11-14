"""Base MCP server implementation."""
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional
from datetime import datetime
import logging

from .types import (
    AuthContext,
    Tool,
    Resource,
    Prompt,
    ToolCallResponse,
    ResourceResponse,
    PromptResponse,
)

logger = logging.getLogger(__name__)


class BaseMCPServer(ABC):
    """Base class for all MCP servers."""

    def __init__(self, name: str, version: str, scope: str):
        """Initialize MCP server.

        Args:
            name: Server name
            version: Server version
            scope: Base scope for this server (e.g., 'finance:*')
        """
        self.name = name
        self.version = version
        self.scope = scope
        self._tools: Dict[str, Tool] = {}
        self._tool_handlers: Dict[str, Callable] = {}
        self._resources: Dict[str, Resource] = {}
        self._resource_handlers: Dict[str, Callable] = {}
        self._prompts: Dict[str, Prompt] = {}
        self._prompt_handlers: Dict[str, Callable] = {}
        self._initialized = False

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the server. Must be implemented by subclasses."""
        pass

    @abstractmethod
    async def shutdown(self) -> None:
        """Shutdown the server. Must be implemented by subclasses."""
        pass

    def register_tool(
        self,
        name: str,
        description: str,
        input_schema: Dict[str, Any],
        handler: Callable,
        scope: Optional[str] = None,
    ) -> None:
        """Register a tool with the server.

        Args:
            name: Tool name (will be prefixed with server scope)
            description: Tool description
            input_schema: JSON schema for input validation
            handler: Async function to handle tool execution
            scope: Specific scope for this tool (defaults to server scope)
        """
        tool_name = name if ":" in name else f"{self.scope.split(':')[0]}:{name}"
        tool_scope = scope or self.scope

        tool = Tool(
            name=tool_name,
            description=description,
            inputSchema=input_schema,
            scope=tool_scope,
        )

        self._tools[tool_name] = tool
        self._tool_handlers[tool_name] = handler

        logger.info(f"Registered tool: {tool_name}")

    def register_resource(
        self,
        uri: str,
        name: str,
        description: str,
        handler: Callable,
        mime_type: str = "application/json",
        scope: Optional[str] = None,
    ) -> None:
        """Register a resource with the server.

        Args:
            uri: Resource URI
            name: Resource name
            description: Resource description
            handler: Async function to fetch resource
            mime_type: MIME type of resource
            scope: Required scope to access this resource
        """
        resource = Resource(
            uri=uri,
            name=name,
            description=description,
            mimeType=mime_type,
            scope=scope or self.scope,
        )

        self._resources[uri] = resource
        self._resource_handlers[uri] = handler

        logger.info(f"Registered resource: {uri}")

    def register_prompt(
        self,
        name: str,
        description: str,
        arguments: List[Dict[str, Any]],
        handler: Callable,
        scope: Optional[str] = None,
    ) -> None:
        """Register a prompt template with the server.

        Args:
            name: Prompt name
            description: Prompt description
            arguments: List of prompt arguments
            handler: Async function to generate prompt
            scope: Required scope to use this prompt
        """
        prompt = Prompt(
            name=name,
            description=description,
            arguments=arguments,
            scope=scope or self.scope,
        )

        self._prompts[name] = prompt
        self._prompt_handlers[name] = handler

        logger.info(f"Registered prompt: {name}")

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        context: AuthContext,
    ) -> ToolCallResponse:
        """Execute a tool.

        Args:
            tool_name: Name of tool to execute
            arguments: Tool arguments
            context: Authentication context

        Returns:
            Tool execution response

        Raises:
            ValueError: If tool not found
            PermissionError: If user lacks required scope
        """
        if tool_name not in self._tools:
            raise ValueError(f"Tool not found: {tool_name}")

        tool = self._tools[tool_name]

        # Check authorization
        if not context.has_scope(tool.scope):
            raise PermissionError(
                f"Missing required scope '{tool.scope}' for tool '{tool_name}'"
            )

        handler = self._tool_handlers[tool_name]

        try:
            result = await handler(arguments, context)

            return ToolCallResponse(
                content=[{
                    "type": "text",
                    "text": str(result) if not isinstance(result, dict) else result
                }],
                isError=False,
            )
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}", exc_info=True)
            return ToolCallResponse(
                content=[{
                    "type": "text",
                    "text": f"Error: {str(e)}"
                }],
                isError=True,
            )

    async def fetch_resource(
        self,
        uri: str,
        context: AuthContext,
    ) -> ResourceResponse:
        """Fetch a resource.

        Args:
            uri: Resource URI
            context: Authentication context

        Returns:
            Resource contents

        Raises:
            ValueError: If resource not found
            PermissionError: If user lacks required scope
        """
        if uri not in self._resources:
            raise ValueError(f"Resource not found: {uri}")

        resource = self._resources[uri]

        # Check authorization
        if not context.has_scope(resource.scope):
            raise PermissionError(
                f"Missing required scope '{resource.scope}' for resource '{uri}'"
            )

        handler = self._resource_handlers[uri]

        try:
            contents = await handler(context)

            return ResourceResponse(
                contents=[{
                    "uri": uri,
                    "mimeType": resource.mimeType,
                    "text": contents if isinstance(contents, str) else str(contents)
                }]
            )
        except Exception as e:
            logger.error(f"Error fetching resource {uri}: {str(e)}", exc_info=True)
            raise

    async def get_prompt(
        self,
        name: str,
        arguments: Dict[str, Any],
        context: AuthContext,
    ) -> PromptResponse:
        """Get a prompt template.

        Args:
            name: Prompt name
            arguments: Prompt arguments
            context: Authentication context

        Returns:
            Prompt response

        Raises:
            ValueError: If prompt not found
            PermissionError: If user lacks required scope
        """
        if name not in self._prompts:
            raise ValueError(f"Prompt not found: {name}")

        prompt = self._prompts[name]

        # Check authorization
        if not context.has_scope(prompt.scope):
            raise PermissionError(
                f"Missing required scope '{prompt.scope}' for prompt '{name}'"
            )

        handler = self._prompt_handlers[name]

        try:
            messages = await handler(arguments, context)

            return PromptResponse(
                description=prompt.description,
                messages=messages,
            )
        except Exception as e:
            logger.error(f"Error generating prompt {name}: {str(e)}", exc_info=True)
            raise

    def get_tools(self, context: Optional[AuthContext] = None) -> List[Tool]:
        """Get list of available tools, optionally filtered by user's scopes.

        Args:
            context: Optional authentication context for filtering

        Returns:
            List of available tools
        """
        if context is None:
            return list(self._tools.values())

        return [
            tool for tool in self._tools.values()
            if context.has_scope(tool.scope)
        ]

    def get_resources(self, context: Optional[AuthContext] = None) -> List[Resource]:
        """Get list of available resources, optionally filtered by user's scopes.

        Args:
            context: Optional authentication context for filtering

        Returns:
            List of available resources
        """
        if context is None:
            return list(self._resources.values())

        return [
            resource for resource in self._resources.values()
            if context.has_scope(resource.scope)
        ]

    def get_prompts(self, context: Optional[AuthContext] = None) -> List[Prompt]:
        """Get list of available prompts, optionally filtered by user's scopes.

        Args:
            context: Optional authentication context for filtering

        Returns:
            List of available prompts
        """
        if context is None:
            return list(self._prompts.values())

        return [
            prompt for prompt in self._prompts.values()
            if context.has_scope(prompt.scope)
        ]

    @property
    def tool_count(self) -> int:
        """Get number of registered tools."""
        return len(self._tools)

    def __repr__(self) -> str:
        """String representation of server."""
        return (
            f"{self.__class__.__name__}("
            f"name='{self.name}', "
            f"version='{self.version}', "
            f"scope='{self.scope}', "
            f"tools={self.tool_count})"
        )
