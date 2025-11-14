"""Tests for Attendance & Compliance MCP Server."""
import pytest

from src.mcp.servers.attendance import AttendanceMCP
from src.mcp.types import AuthContext


@pytest.mark.asyncio
class TestAttendanceMCP:
    """Test Attendance & Compliance MCP Server."""

    async def test_server_initialization(self):
        """Test server initializes correctly."""
        server = AttendanceMCP()
        await server.initialize()

        assert server.name == "attendance-mcp"
        assert server.version == "1.0.0"
        assert server.scope == "attendance:*"
        assert server.tool_count == 8  # Should have exactly 8 tools
        assert server._initialized is True

        await server.shutdown()

    async def test_tool_registration(self):
        """Test all 8 tools are registered."""
        server = AttendanceMCP()
        await server.initialize()

        expected_tools = [
            "attendance:prepare_register",
            "attendance:record_attendance",
            "attendance:correct_attendance",
            "attendance:export_attendance",
            "attendance:visa_compliance_report",
            "attendance:compile_compliance_pack",
            "attendance:anonymise_dataset",
            "attendance:policy_check",
        ]

        tools = server.get_tools()
        tool_names = [tool.name for tool in tools]

        for expected_tool in expected_tools:
            assert expected_tool in tool_names, f"Missing tool: {expected_tool}"

        assert len(tools) == 8, "Attendance MCP should have exactly 8 tools"

        await server.shutdown()

    async def test_authorization_scope_check(self, student_context: AuthContext):
        """Test that students cannot access attendance tools."""
        server = AttendanceMCP()
        await server.initialize()

        arguments = {
            "session_id": "test-session-id",
            "date": "2025-01-15",
        }

        # Should raise PermissionError
        with pytest.raises(PermissionError):
            await server.call_tool(
                "attendance:prepare_register",
                arguments,
                student_context
            )

        await server.shutdown()

    async def test_resources_registration(self, admin_context: AuthContext):
        """Test resources are registered."""
        server = AttendanceMCP()
        await server.initialize()

        resources = server.get_resources(admin_context)
        resource_uris = [r.uri for r in resources]

        assert "mycastle://attendance/registers" in resource_uris
        assert "mycastle://attendance/compliance-status" in resource_uris

        await server.shutdown()


@pytest.mark.asyncio
async def test_attendance_mcp_tool_count_constraint():
    """Test that Attendance MCP adheres to ≤10 tools constraint."""
    server = AttendanceMCP()
    await server.initialize()

    assert server.tool_count <= 10, (
        f"Attendance MCP has {server.tool_count} tools, "
        "which exceeds the maximum of 10 tools per MCP server"
    )

    await server.shutdown()
