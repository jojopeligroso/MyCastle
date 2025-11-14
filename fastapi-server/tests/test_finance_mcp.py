"""Tests for Finance MCP Server."""
import pytest
from datetime import datetime

from src.mcp.servers.finance import FinanceMCP
from src.mcp.types import AuthContext


@pytest.mark.asyncio
class TestFinanceMCP:
    """Test Finance MCP Server."""

    async def test_server_initialization(self):
        """Test server initializes correctly."""
        server = FinanceMCP()
        await server.initialize()

        assert server.name == "finance-mcp"
        assert server.version == "1.0.0"
        assert server.scope == "finance:*"
        assert server.tool_count == 9  # Should have exactly 9 tools
        assert server._initialized is True

        await server.shutdown()

    async def test_tool_registration(self):
        """Test all 9 tools are registered."""
        server = FinanceMCP()
        await server.initialize()

        expected_tools = [
            "finance:create_booking",
            "finance:edit_booking",
            "finance:issue_invoice",
            "finance:apply_discount",
            "finance:refund_payment",
            "finance:reconcile_payouts",
            "finance:ledger_export",
            "finance:aging_report",
            "finance:confirm_intake",
        ]

        tools = server.get_tools()
        tool_names = [tool.name for tool in tools]

        for expected_tool in expected_tools:
            assert expected_tool in tool_names, f"Missing tool: {expected_tool}"

        assert len(tools) == 9, "Finance MCP should have exactly 9 tools"

        await server.shutdown()

    async def test_create_booking_tool(self, admin_context: AuthContext):
        """Test create_booking tool."""
        server = FinanceMCP()
        await server.initialize()

        # Note: This will fail without actual database, but tests the flow
        arguments = {
            "student_id": "test-student-id",
            "programme_id": "test-programme-id",
            "start_date": "2025-01-15",
            "weeks": 4,
            "accommodation": True,
        }

        # This should not raise an exception for invalid arguments
        response = await server.call_tool(
            "finance:create_booking",
            arguments,
            admin_context
        )

        assert response is not None
        assert isinstance(response.content, list)

        await server.shutdown()

    async def test_authorization_scope_check(self, student_context: AuthContext):
        """Test that students cannot access finance tools."""
        server = FinanceMCP()
        await server.initialize()

        arguments = {
            "student_id": "test-student-id",
            "programme_id": "test-programme-id",
            "start_date": "2025-01-15",
            "weeks": 4,
        }

        # Should raise PermissionError
        with pytest.raises(PermissionError):
            await server.call_tool(
                "finance:create_booking",
                arguments,
                student_context
            )

        await server.shutdown()

    async def test_resources_registration(self, admin_context: AuthContext):
        """Test resources are registered."""
        server = FinanceMCP()
        await server.initialize()

        resources = server.get_resources(admin_context)
        resource_uris = [r.uri for r in resources]

        assert "mycastle://finance/invoices" in resource_uris
        assert "mycastle://finance/outstanding" in resource_uris

        await server.shutdown()

    async def test_prompts_registration(self, admin_context: AuthContext):
        """Test prompts are registered."""
        server = FinanceMCP()
        await server.initialize()

        prompts = server.get_prompts(admin_context)
        prompt_names = [p.name for p in prompts]

        assert "finance:invoice_review" in prompt_names

        await server.shutdown()


@pytest.mark.asyncio
async def test_finance_mcp_tool_count_constraint():
    """Test that Finance MCP adheres to ≤10 tools constraint."""
    server = FinanceMCP()
    await server.initialize()

    assert server.tool_count <= 10, (
        f"Finance MCP has {server.tool_count} tools, "
        "which exceeds the maximum of 10 tools per MCP server"
    )

    await server.shutdown()
