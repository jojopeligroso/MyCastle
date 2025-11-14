"""Tests for Student Services MCP Server."""
import pytest

from src.mcp.servers.student_services import StudentServicesMCP
from src.mcp.types import AuthContext


@pytest.mark.asyncio
class TestStudentServicesMCP:
    """Test Student Services MCP Server."""

    async def test_server_initialization(self):
        """Test server initializes correctly."""
        server = StudentServicesMCP()
        await server.initialize()

        assert server.name == "student-services-mcp"
        assert server.version == "1.0.0"
        assert server.scope == "student_services:*"
        assert server.tool_count == 9  # Should have exactly 9 tools
        assert server._initialized is True

        await server.shutdown()

    async def test_tool_registration(self):
        """Test all 9 tools are registered."""
        server = StudentServicesMCP()
        await server.initialize()

        expected_tools = [
            "student_services:register_host",
            "student_services:allocate_accommodation",
            "student_services:swap_accommodation",
            "student_services:export_placements",
            "student_services:issue_letter",
            "student_services:approve_deferral",
            "student_services:award_certificate",
            "student_services:track_visa_status",
            "student_services:record_pastoral_note",
        ]

        tools = server.get_tools()
        tool_names = [tool.name for tool in tools]

        for expected_tool in expected_tools:
            assert expected_tool in tool_names, f"Missing tool: {expected_tool}"

        assert len(tools) == 9, "Student Services MCP should have exactly 9 tools"

        await server.shutdown()

    async def test_authorization_scope_check(self, student_context: AuthContext):
        """Test that students cannot access student services tools."""
        server = StudentServicesMCP()
        await server.initialize()

        arguments = {
            "name": "Test Host",
            "address": "123 Test St",
            "capacity": 2,
            "contact_email": "test@example.com",
        }

        # Should raise PermissionError
        with pytest.raises(PermissionError):
            await server.call_tool(
                "student_services:register_host",
                arguments,
                student_context
            )

        await server.shutdown()

    async def test_resources_registration(self, admin_context: AuthContext):
        """Test resources are registered."""
        server = StudentServicesMCP()
        await server.initialize()

        resources = server.get_resources(admin_context)
        resource_uris = [r.uri for r in resources]

        assert "mycastle://student_services/hosts" in resource_uris
        assert "mycastle://student_services/placements" in resource_uris

        await server.shutdown()


@pytest.mark.asyncio
async def test_student_services_mcp_tool_count_constraint():
    """Test that Student Services MCP adheres to ≤10 tools constraint."""
    server = StudentServicesMCP()
    await server.initialize()

    assert server.tool_count <= 10, (
        f"Student Services MCP has {server.tool_count} tools, "
        "which exceeds the maximum of 10 tools per MCP server"
    )

    await server.shutdown()
