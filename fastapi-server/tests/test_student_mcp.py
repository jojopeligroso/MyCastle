"""Tests for Student MCP Server."""
import pytest

from src.mcp.servers.student import StudentMCP
from src.mcp.types import AuthContext


@pytest.mark.asyncio
class TestStudentMCP:
    """Test Student MCP Server."""

    async def test_server_initialization(self):
        """Test server initializes correctly."""
        server = StudentMCP()
        await server.initialize()

        assert server.name == "student-mcp"
        assert server.version == "1.0.0"
        assert server.scope == "student:*"
        assert server.tool_count == 10  # Should have exactly 10 tools
        assert server._initialized is True

        await server.shutdown()

    async def test_tool_registration(self):
        """Test all 10 tools are registered."""
        server = StudentMCP()
        await server.initialize()

        expected_tools = [
            "student:view_timetable",
            "student:download_materials",
            "student:submit_homework",
            "student:view_grades",
            "student:ask_tutor",
            "student:track_progress",
            "student:attendance_summary",
            "student:request_letter",
            "student:raise_support_request",
            "student:view_invoice",
        ]

        tools = server.get_tools()
        tool_names = [tool.name for tool in tools]

        for expected_tool in expected_tools:
            assert expected_tool in tool_names, f"Missing tool: {expected_tool}"

        assert len(tools) == 10, "Student MCP should have exactly 10 tools"

        await server.shutdown()

    async def test_student_can_access_tools(self, student_context: AuthContext):
        """Test that students can access student tools."""
        server = StudentMCP()
        await server.initialize()

        # Students should be able to access their own tools
        tools = server.get_tools(student_context)
        assert len(tools) > 0, "Students should see student tools"

        await server.shutdown()

    async def test_resources_registration(self, student_context: AuthContext):
        """Test resources are registered."""
        server = StudentMCP()
        await server.initialize()

        resources = server.get_resources(student_context)
        resource_uris = [r.uri for r in resources]

        assert "mycastle://student/timetable" in resource_uris
        assert "mycastle://student/materials" in resource_uris
        assert "mycastle://student/progress" in resource_uris

        await server.shutdown()

    async def test_view_timetable_tool(self, student_context: AuthContext):
        """Test view_timetable tool execution."""
        server = StudentMCP()
        await server.initialize()

        arguments = {"week_offset": 0}

        # This should not raise an exception
        response = await server.call_tool(
            "student:view_timetable",
            arguments,
            student_context
        )

        assert response is not None
        assert isinstance(response.content, list)

        await server.shutdown()


@pytest.mark.asyncio
async def test_student_mcp_tool_count_constraint():
    """Test that Student MCP adheres to ≤10 tools constraint."""
    server = StudentMCP()
    await server.initialize()

    assert server.tool_count <= 10, (
        f"Student MCP has {server.tool_count} tools, "
        "which exceeds the maximum of 10 tools per MCP server"
    )

    await server.shutdown()
