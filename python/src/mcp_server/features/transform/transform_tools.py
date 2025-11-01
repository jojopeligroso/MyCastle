"""
Transform tools for MCP server - XLSX schema analysis and transformation.
"""

import asyncio
import logging
from typing import Any

from mcp.server import Server
from mcp.types import Tool

from ...config.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def register_transform_tools(server: Server):
    """Register all transform-related MCP tools."""

    @server.list_tools()
    async def list_transform_tools() -> list[Tool]:
        """List all available transform tools."""
        return [
            Tool(
                name="archon:transform_analyze_xlsx",
                description="""Analyze an XLSX file and provide intelligent schema recommendations for Supabase.

This tool uses AI to:
- Suggest semantic column names (employee_id instead of emp_id)
- Detect appropriate PostgreSQL data types
- Identify key fields vs optional fields
- Check for missing values in KEY FIELDS only (not optional fields)
- Detect duplicate rows
- Recommend constraints (NOT NULL, UNIQUE)
- Suggest indexes for performance
- Generate CREATE TABLE SQL
- Provide data quality warnings

Use this when you need to help a user transform XLSX data to Supabase tables.

Arguments:
- upload_id: Upload ID from file upload
- sheet_name: Name of the sheet to analyze

Returns comprehensive schema analysis including:
- Suggested column mappings
- Data types and constraints
- Data quality warnings
- CREATE TABLE SQL
- Recommended indexes""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "upload_id": {
                            "type": "string",
                            "description": "Upload ID from the XLSX upload operation",
                        },
                        "sheet_name": {
                            "type": "string",
                            "description": "Name of the sheet to analyze",
                        },
                    },
                    "required": ["upload_id", "sheet_name"],
                },
            ),
            Tool(
                name="archon:transform_get_status",
                description="""Get the status of XLSX transformation operations.

Use this to check if a transformation is in progress, completed, or failed.

Arguments:
- upload_id: Upload ID to check status for

Returns:
- Status of the transformation
- Any error messages if failed
- Results if completed""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "upload_id": {
                            "type": "string",
                            "description": "Upload ID to check status for",
                        },
                    },
                    "required": ["upload_id"],
                },
            ),
        ]

    @server.call_tool()
    async def call_transform_tool(name: str, arguments: dict[str, Any]) -> list[dict[str, Any]]:
        """Handle transform tool calls."""

        if name == "archon:transform_analyze_xlsx":
            return await _analyze_xlsx_schema(arguments)
        elif name == "archon:transform_get_status":
            return await _get_transform_status(arguments)
        else:
            return [{"type": "text", "text": f"Unknown tool: {name}"}]


async def _analyze_xlsx_schema(arguments: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Analyze XLSX schema using the AI-powered schema analyzer agent.

    This connects to the Archon backend API to trigger schema analysis.
    """
    try:
        upload_id = arguments.get("upload_id")
        sheet_name = arguments.get("sheet_name")

        if not upload_id or not sheet_name:
            return [
                {
                    "type": "text",
                    "text": "Error: Both upload_id and sheet_name are required",
                }
            ]

        # Call the backend API endpoint
        import httpx

        async with httpx.AsyncClient(timeout=60.0) as client:
            # Get backend URL from environment or default
            import os

            backend_url = os.getenv("ARCHON_BACKEND_URL", "http://localhost:8181")

            response = await client.post(
                f"{backend_url}/api/transform/analyze-schema",
                json={"upload_id": upload_id, "sheet_name": sheet_name},
            )

            if response.status_code != 200:
                error_text = response.text
                return [
                    {
                        "type": "text",
                        "text": f"Schema analysis failed: {error_text}",
                    }
                ]

            result = response.json()

        # Format the response for AI consumption
        ai_enhanced = result.get("ai_enhanced", False)
        analysis_type = "AI-Enhanced" if ai_enhanced else "Basic"

        output = f"""# XLSX Schema Analysis ({analysis_type})

**File**: {upload_id}
**Sheet**: {sheet_name}
**Rows**: {result.get('row_count', 0)}
**Columns**: {result.get('column_count', 0)}

## Suggested Table
"""

        if "suggested_table_name" in result:
            output += f"**Table Name**: `{result['suggested_table_name']}`\n\n"

        # Column mappings
        output += "## Column Mappings\n\n"
        for col_schema in result.get("suggested_schema", []):
            source = col_schema.get("source_column", "")
            target = col_schema.get("column_name", "")
            dtype = col_schema.get("data_type", "text")
            nullable = col_schema.get("nullable", True)
            unique = col_schema.get("unique", False)

            constraints = []
            if not nullable:
                constraints.append("NOT NULL")
            if unique:
                constraints.append("UNIQUE")

            constraint_str = f" ({', '.join(constraints)})" if constraints else ""

            output += f"- `{source}` → `{target}` ({dtype}){constraint_str}\n"

            # Add data quality warning if present
            if "data_quality_warning" in col_schema and col_schema["data_quality_warning"]:
                output += f"  ⚠️ {col_schema['data_quality_warning']}\n"

        # Data quality summary
        if "data_quality_summary" in result:
            output += f"\n## Data Quality\n{result['data_quality_summary']}\n"

        # Duplicate rows
        if "duplicate_row_count" in result and result["duplicate_row_count"] > 0:
            output += f"\n⚠️ **Duplicate Rows**: {result['duplicate_row_count']} duplicate rows found\n"

        # Warnings
        if "warnings" in result and result["warnings"]:
            output += "\n## Warnings\n"
            for warning in result["warnings"]:
                output += f"- {warning}\n"

        # Recommended indexes
        if "recommended_indexes" in result and result["recommended_indexes"]:
            output += "\n## Recommended Indexes\n"
            for index in result["recommended_indexes"]:
                output += f"- {index}\n"

        # CREATE TABLE SQL
        if "create_table_sql" in result:
            output += f"\n## Generated SQL\n```sql\n{result['create_table_sql']}\n```\n"

        return [{"type": "text", "text": output}]

    except Exception as e:
        logger.error(f"Error analyzing XLSX schema: {e}", exc_info=True)
        return [
            {
                "type": "text",
                "text": f"Error analyzing XLSX schema: {str(e)}",
            }
        ]


async def _get_transform_status(arguments: dict[str, Any]) -> list[dict[str, Any]]:
    """Get the status of a transformation operation."""
    try:
        upload_id = arguments.get("upload_id")

        if not upload_id:
            return [{"type": "text", "text": "Error: upload_id is required"}]

        # Check if the upload exists
        import os
        from pathlib import Path
        import tempfile

        upload_dir = Path(tempfile.gettempdir()) / "archon_uploads" / upload_id

        if not upload_dir.exists():
            return [
                {
                    "type": "text",
                    "text": f"Upload ID {upload_id} not found. It may have been cleaned up after transformation completed.",
                }
            ]

        # List files in upload directory
        xlsx_files = list(upload_dir.glob("*.xlsx"))

        if not xlsx_files:
            return [
                {
                    "type": "text",
                    "text": f"No XLSX files found for upload {upload_id}",
                }
            ]

        file_info = []
        for xlsx_file in xlsx_files:
            file_info.append(
                {
                    "filename": xlsx_file.name,
                    "size": xlsx_file.stat().st_size,
                    "path": str(xlsx_file),
                }
            )

        return [
            {
                "type": "text",
                "text": f"""Transform Status for {upload_id}:

Files found: {len(xlsx_files)}

{chr(10).join([f"- {f['filename']} ({f['size']} bytes)" for f in file_info])}

Status: Upload complete, ready for analysis or transformation.
Use archon:transform_analyze_xlsx to analyze the schema.""",
            }
        ]

    except Exception as e:
        logger.error(f"Error getting transform status: {e}", exc_info=True)
        return [
            {
                "type": "text",
                "text": f"Error getting transform status: {str(e)}",
            }
        ]
