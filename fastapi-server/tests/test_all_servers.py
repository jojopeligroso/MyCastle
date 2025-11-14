"""Integration tests for all MCP servers."""
import pytest

from src.mcp.host import MCPHost
from src.mcp.servers import (
    FinanceMCP,
    AcademicMCP,
    AttendanceMCP,
    StudentServicesMCP,
    OperationsMCP,
    StudentMCP,
)
from src.mcp.types import AuthContext


@pytest.mark.asyncio
class TestAllServers:
    """Integration tests for all MCP servers."""

    async def test_all_servers_initialize(self):
        """Test all servers can be initialized together."""
        servers = [
            FinanceMCP(),
            AcademicMCP(),
            AttendanceMCP(),
            StudentServicesMCP(),
            OperationsMCP(),
            StudentMCP(),
        ]

        for server in servers:
            await server.initialize()
            assert server._initialized is True
            await server.shutdown()

    async def test_host_with_all_servers(self):
        """Test MCP Host can manage all 6 servers."""
        host = MCPHost()

        # Register all servers
        servers = [
            FinanceMCP(),
            AcademicMCP(),
            AttendanceMCP(),
            StudentServicesMCP(),
            OperationsMCP(),
            StudentMCP(),
        ]

        for server in servers:
            host.register_server(server)

        await host.initialize()

        # Verify all registered
        assert host.server_count == 6
        assert host.total_tool_count == 9 + 10 + 8 + 9 + 8 + 10  # 54 total tools

        await host.shutdown()

    async def test_tool_count_constraints(self):
        """Test all servers adhere to ≤10 tools constraint."""
        servers = [
            FinanceMCP(),
            AcademicMCP(),
            AttendanceMCP(),
            StudentServicesMCP(),
            OperationsMCP(),
            StudentMCP(),
        ]

        expected_counts = {
            "finance-mcp": 9,
            "academic-mcp": 10,
            "attendance-mcp": 8,
            "student-services-mcp": 9,
            "operations-mcp": 8,
            "student-mcp": 10,
        }

        for server in servers:
            await server.initialize()

            # Check constraint
            assert server.tool_count <= 10, (
                f"{server.name} has {server.tool_count} tools, exceeds limit"
            )

            # Check expected count
            assert server.tool_count == expected_counts[server.name], (
                f"{server.name} expected {expected_counts[server.name]} tools, "
                f"got {server.tool_count}"
            )

            await server.shutdown()

    async def test_unique_tool_names(self):
        """Test all tool names are unique across servers."""
        host = MCPHost()

        servers = [
            FinanceMCP(),
            AcademicMCP(),
            AttendanceMCP(),
            StudentServicesMCP(),
            OperationsMCP(),
            StudentMCP(),
        ]

        for server in servers:
            host.register_server(server)

        await host.initialize()

        # Get all capabilities
        capabilities = host.get_capabilities()

        # Check for duplicate tool names
        tool_names = [tool.name for tool in capabilities.tools]
        unique_names = set(tool_names)

        assert len(tool_names) == len(unique_names), (
            f"Duplicate tool names found: "
            f"{[name for name in tool_names if tool_names.count(name) > 1]}"
        )

        await host.shutdown()

    async def test_scope_based_filtering(self, student_context: AuthContext):
        """Test that capabilities are filtered by user scopes."""
        host = MCPHost()

        servers = [
            FinanceMCP(),
            AcademicMCP(),
            AttendanceMCP(),
            StudentServicesMCP(),
            OperationsMCP(),
            StudentMCP(),
        ]

        for server in servers:
            host.register_server(server)

        await host.initialize()

        # Get capabilities for student (should only see student tools)
        capabilities = host.get_capabilities(student_context)

        # Student should only see tools from student:* scope
        for tool in capabilities.tools:
            assert tool.scope == "student:*" or student_context.has_scope(tool.scope), (
                f"Student should not see tool '{tool.name}' with scope '{tool.scope}'"
            )

        await host.shutdown()

    async def test_server_info(self):
        """Test server info is correctly reported."""
        host = MCPHost()

        servers = [
            FinanceMCP(),
            AcademicMCP(),
            AttendanceMCP(),
            StudentServicesMCP(),
            OperationsMCP(),
            StudentMCP(),
        ]

        for server in servers:
            host.register_server(server)

        await host.initialize()

        capabilities = host.get_capabilities()

        assert capabilities.serverInfo["name"] == "mycastle-mcp-host"
        assert capabilities.serverInfo["version"] == "3.0.0"
        assert len(capabilities.serverInfo["servers"]) == 6

        await host.shutdown()


@pytest.mark.asyncio
async def test_total_system_tools():
    """Test total number of tools across all servers."""
    servers = [
        ("Finance", FinanceMCP(), 9),
        ("Academic", AcademicMCP(), 10),
        ("Attendance", AttendanceMCP(), 8),
        ("Student Services", StudentServicesMCP(), 9),
        ("Operations", OperationsMCP(), 8),
        ("Student", StudentMCP(), 10),
    ]

    total_tools = 0

    for name, server, expected_count in servers:
        await server.initialize()
        assert server.tool_count == expected_count, (
            f"{name} MCP expected {expected_count} tools, got {server.tool_count}"
        )
        total_tools += server.tool_count
        await server.shutdown()

    # Total should be 54 tools (9 + 10 + 8 + 9 + 8 + 10)
    assert total_tools == 54, f"Expected 54 total tools, got {total_tools}"
