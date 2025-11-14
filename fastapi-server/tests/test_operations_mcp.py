"""Tests for Operations & Quality MCP Server."""
import pytest

from src.mcp.servers.operations import OperationsMCP
from src.mcp.types import AuthContext


@pytest.mark.asyncio
class TestOperationsMCP:
    """Test Operations & Quality MCP Server."""

    async def test_server_initialization(self):
        """Test server initializes correctly."""
        server = OperationsMCP()
        await server.initialize()

        assert server.name == "operations-mcp"
        assert server.version == "1.0.0"
        assert server.scope == "ops:*"
        assert server.tool_count == 8  # Should have exactly 8 tools
        assert server._initialized is True

        await server.shutdown()

    async def test_tool_registration(self):
        """Test all 8 tools are registered."""
        server = OperationsMCP()
        await server.initialize()

        expected_tools = [
            "ops:backup_db",
            "ops:restore_snapshot",
            "ops:record_observation",
            "ops:assign_cpd",
            "ops:export_quality_report",
            "ops:bulk_email",
            "ops:notify_stakeholders",
            "ops:mail_merge_pdf",
        ]

        tools = server.get_tools()
        tool_names = [tool.name for tool in tools]

        for expected_tool in expected_tools:
            assert expected_tool in tool_names, f"Missing tool: {expected_tool}"

        assert len(tools) == 8, "Operations MCP should have exactly 8 tools"

        await server.shutdown()

    async def test_authorization_scope_check(self, student_context: AuthContext):
        """Test that students cannot access operations tools."""
        server = OperationsMCP()
        await server.initialize()

        arguments = {
            "backup_type": "full",
        }

        # Should raise PermissionError
        with pytest.raises(PermissionError):
            await server.call_tool(
                "ops:backup_db",
                arguments,
                student_context
            )

        await server.shutdown()

    async def test_resources_registration(self, super_admin_context: AuthContext):
        """Test resources are registered."""
        server = OperationsMCP()
        await server.initialize()

        resources = server.get_resources(super_admin_context)
        resource_uris = [r.uri for r in resources]

        assert "mycastle://ops/backups" in resource_uris
        assert "mycastle://ops/observations" in resource_uris

        await server.shutdown()


@pytest.mark.asyncio
async def test_operations_mcp_tool_count_constraint():
    """Test that Operations MCP adheres to ≤10 tools constraint."""
    server = OperationsMCP()
    await server.initialize()

    assert server.tool_count <= 10, (
        f"Operations MCP has {server.tool_count} tools, "
        "which exceeds the maximum of 10 tools per MCP server"
    )

    await server.shutdown()
