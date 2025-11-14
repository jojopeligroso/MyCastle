"""Tests for Academic MCP Server."""
import pytest

from src.mcp.servers.academic import AcademicMCP
from src.mcp.types import AuthContext


@pytest.mark.asyncio
class TestAcademicMCP:
    """Test Academic MCP Server."""

    async def test_server_initialization(self):
        """Test server initializes correctly."""
        server = AcademicMCP()
        await server.initialize()

        assert server.name == "academic-mcp"
        assert server.version == "1.0.0"
        assert server.scope == "academic:*"
        assert server.tool_count == 10  # Should have exactly 10 tools
        assert server._initialized is True

        await server.shutdown()

    async def test_tool_registration(self):
        """Test all 10 tools are registered."""
        server = AcademicMCP()
        await server.initialize()

        expected_tools = [
            "academic:create_programme",
            "academic:create_course",
            "academic:map_cefr_level",
            "academic:schedule_class",
            "academic:assign_teacher",
            "academic:allocate_room",
            "academic:register_lesson_template",
            "academic:approve_lesson_plan",
            "academic:link_cefr_descriptor",
            "academic:publish_materials",
        ]

        tools = server.get_tools()
        tool_names = [tool.name for tool in tools]

        for expected_tool in expected_tools:
            assert expected_tool in tool_names, f"Missing tool: {expected_tool}"

        assert len(tools) == 10, "Academic MCP should have exactly 10 tools"

        await server.shutdown()

    async def test_create_programme_tool(self, admin_context: AuthContext):
        """Test create_programme tool."""
        server = AcademicMCP()
        await server.initialize()

        arguments = {
            "name": "General English",
            "description": "General English programme for all levels",
            "duration_weeks": 12,
            "price_per_week": 250,
            "cefr_level_min": "A1",
            "cefr_level_max": "C2",
        }

        response = await server.call_tool(
            "academic:create_programme",
            arguments,
            admin_context
        )

        assert response is not None
        assert isinstance(response.content, list)

        await server.shutdown()

    async def test_authorization_scope_check(self, student_context: AuthContext):
        """Test that students cannot access academic tools."""
        server = AcademicMCP()
        await server.initialize()

        arguments = {
            "name": "Test Programme",
            "description": "Test",
            "duration_weeks": 4,
            "price_per_week": 200,
        }

        # Should raise PermissionError
        with pytest.raises(PermissionError):
            await server.call_tool(
                "academic:create_programme",
                arguments,
                student_context
            )

        await server.shutdown()

    async def test_resources_registration(self, admin_context: AuthContext):
        """Test resources are registered."""
        server = AcademicMCP()
        await server.initialize()

        resources = server.get_resources(admin_context)
        resource_uris = [r.uri for r in resources]

        assert "mycastle://academic/programmes" in resource_uris
        assert "mycastle://academic/courses" in resource_uris
        assert "mycastle://academic/cefr-descriptors" in resource_uris

        await server.shutdown()

    async def test_prompts_registration(self, admin_context: AuthContext):
        """Test prompts are registered."""
        server = AcademicMCP()
        await server.initialize()

        prompts = server.get_prompts(admin_context)
        prompt_names = [p.name for p in prompts]

        assert "academic:curriculum_design" in prompt_names

        await server.shutdown()


@pytest.mark.asyncio
async def test_academic_mcp_tool_count_constraint():
    """Test that Academic MCP adheres to ≤10 tools constraint."""
    server = AcademicMCP()
    await server.initialize()

    assert server.tool_count <= 10, (
        f"Academic MCP has {server.tool_count} tools, "
        "which exceeds the maximum of 10 tools per MCP server"
    )

    await server.shutdown()
