"""
SchemaAnalyzerAgent - Intelligent XLSX Schema Analysis with PydanticAI

This agent analyzes XLSX data and provides intelligent schema suggestions for
Supabase table creation, including column types, constraints, and data quality warnings.
"""

import logging
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

from .base_agent import ArchonDependencies, BaseAgent

logger = logging.getLogger(__name__)


@dataclass
class SchemaAnalyzerDependencies(ArchonDependencies):
    """Dependencies for schema analysis operations."""

    sheet_data: dict[str, Any] | None = None  # XLSX sheet data with columns and rows
    file_name: str = ""
    sheet_name: str = ""


class ColumnAnalysis(BaseModel):
    """Analysis result for a single column."""

    source_column: str = Field(description="Original XLSX column name")
    suggested_name: str = Field(
        description="Suggested Supabase column name (snake_case, semantic)"
    )
    data_type: str = Field(
        description="Suggested PostgreSQL data type (text, numeric, integer, boolean, date, timestamp, json)"
    )
    is_key_field: bool = Field(
        description="Whether this is a key field that should not have missing values"
    )
    nullable: bool = Field(description="Whether NULL values should be allowed")
    unique: bool = Field(description="Whether values should be unique")
    missing_count: int = Field(description="Number of missing/null values found")
    missing_percentage: float = Field(description="Percentage of rows with missing values")
    has_duplicates: bool = Field(description="Whether duplicate values exist")
    duplicate_count: int = Field(description="Number of duplicate values")
    data_quality_warning: str | None = Field(
        description="Warning message if data quality issues detected"
    )
    example_values: list[str] = Field(
        description="Sample values from this column (first 3-5 unique values)"
    )


class SchemaAnalysisResult(BaseModel):
    """Structured output for schema analysis."""

    suggested_table_name: str = Field(
        description="Suggested table name based on file/sheet name"
    )
    columns: list[ColumnAnalysis] = Field(description="Analysis for each column")
    total_rows: int = Field(description="Total number of data rows analyzed")
    duplicate_row_count: int = Field(
        description="Number of completely duplicate rows found"
    )
    data_quality_summary: str = Field(
        description="Overall summary of data quality (good, fair, poor) with key issues"
    )
    recommended_indexes: list[str] = Field(
        description="Suggested indexes based on data patterns and key fields"
    )
    create_table_sql: str = Field(description="Generated CREATE TABLE SQL statement")
    warnings: list[str] = Field(
        description="List of important warnings about data quality or schema issues"
    )
    success: bool = Field(description="Whether analysis completed successfully")


class SchemaAnalyzerAgent(BaseAgent[SchemaAnalyzerDependencies, SchemaAnalysisResult]):
    """
    Intelligent agent for analyzing XLSX data and suggesting optimal Supabase schemas.

    Capabilities:
    - Semantic column naming (employee_id instead of emp_id)
    - Intelligent type detection
    - Key field identification (fields that shouldn't be blank)
    - Missing value detection for key fields only
    - Duplicate row detection
    - Constraint suggestions (NOT NULL, UNIQUE)
    - Index recommendations
    - Data quality warnings
    """

    def __init__(self, model: str = None, **kwargs):
        if model is None:
            import os

            model = os.getenv("SCHEMA_ANALYZER_MODEL", "openai:gpt-4o")

        super().__init__(
            model=model, name="SchemaAnalyzerAgent", retries=2, enable_rate_limiting=True, **kwargs
        )

    def _create_agent(self, **kwargs) -> Agent:
        """Create the PydanticAI agent with analysis capabilities."""

        agent = Agent(
            model=self.model,
            deps_type=SchemaAnalyzerDependencies,
            result_type=SchemaAnalysisResult,
            system_prompt="""You are a Database Schema Analyst specializing in analyzing XLSX data and suggesting optimal Supabase (PostgreSQL) table schemas.

**Your Expertise:**
- Semantic column naming (convert "emp_id" to "employee_id", "cust_name" to "customer_name")
- Intelligent data type detection beyond simple patterns
- Identifying key fields vs optional fields
- Data quality assessment
- Index optimization for query performance

**Key Field Detection Rules:**
You must identify which fields are "key fields" that should not have missing values:
- **Key fields** (require NOT NULL): id, name, email, username, title, status, type, category, date, created_at, user_id, customer_id, etc.
- **Optional fields** (allow NULL): middle_name, notes, comments, description, optional_*, secondary_*, alternate_*, suffix, prefix, etc.

**Data Quality Checks:**
1. **Missing Values**: Only warn about missing values in KEY FIELDS. Ignore missing values in optional fields.
2. **Duplicate Rows**: Always check for and report completely duplicate rows
3. **Data Consistency**: Look for format inconsistencies in the same column
4. **Value Ranges**: Flag outliers or suspicious values

**Column Naming Best Practices:**
- Use snake_case: "Customer Name" → "customer_name"
- Be semantic: "Emp ID" → "employee_id" (not "emp_id")
- Avoid abbreviations unless standard: "Qty" → "quantity", "Dept" → "department"
- Use singular nouns: "customers" → "customer" (table names are plural, columns are singular)

**Type Detection Intelligence:**
- Look beyond surface patterns - "123" might be an ID (text) not a number
- Dates can be strings, Excel dates, or ISO format
- Consider semantic meaning: "phone_number" should be text even if numeric
- JSON data might be in text columns with {, [, or quoted structures

**Index Recommendations:**
- Primary keys (id fields)
- Foreign keys (fields ending in _id)
- Frequently filtered fields (status, type, category, date)
- Fields used in joins

**Output Format:**
Provide a complete analysis with:
1. Semantic column mappings
2. Precise type detection
3. Constraint recommendations (NOT NULL, UNIQUE)
4. Data quality warnings (missing values in KEY fields only, duplicate rows)
5. Suggested indexes
6. Complete CREATE TABLE SQL

Be concise but thorough. Focus on actionable insights.""",
            **kwargs,
        )

        # Register analysis tools
        @agent.tool
        async def analyze_column_semantics(
            ctx: RunContext[SchemaAnalyzerDependencies], column_name: str
        ) -> dict[str, Any]:
            """
            Analyze a column name to suggest semantic improvements.

            Args:
                column_name: Original XLSX column name

            Returns:
                Semantic analysis including suggested name and whether it's a key field
            """
            # Common abbreviation mappings
            abbrev_map = {
                "emp": "employee",
                "cust": "customer",
                "dept": "department",
                "mgr": "manager",
                "addr": "address",
                "qty": "quantity",
                "amt": "amount",
                "num": "number",
                "desc": "description",
                "ref": "reference",
                "cat": "category",
                "prod": "product",
                "org": "organization",
                "auth": "authorization",
                "config": "configuration",
                "admin": "administrator",
            }

            # Key field patterns (should not allow NULL)
            key_patterns = [
                "id",
                "name",
                "email",
                "username",
                "title",
                "status",
                "type",
                "category",
                "date",
                "created",
                "updated",
                "user_id",
                "customer_id",
                "employee_id",
            ]

            # Optional field patterns (can allow NULL)
            optional_patterns = [
                "middle",
                "note",
                "comment",
                "description",
                "optional",
                "secondary",
                "alternate",
                "suffix",
                "prefix",
                "nickname",
                "alias",
            ]

            # Convert to snake_case
            import re

            suggested = column_name.lower().replace(" ", "_").replace("-", "_")
            suggested = "".join(c if c.isalnum() or c == "_" else "_" for c in suggested)

            # Remove consecutive underscores
            while "__" in suggested:
                suggested = suggested.replace("__", "_")

            # Expand abbreviations
            words = suggested.split("_")
            expanded_words = [abbrev_map.get(word, word) for word in words]
            suggested = "_".join(expanded_words)

            # Determine if key field
            is_key = any(pattern in suggested.lower() for pattern in key_patterns)
            is_optional = any(pattern in suggested.lower() for pattern in optional_patterns)

            # If both match, optional patterns take precedence for certain cases
            if is_optional:
                is_key = False

            return {
                "original": column_name,
                "suggested": suggested,
                "is_key_field": is_key,
                "explanation": f"{'Key field' if is_key else 'Optional field'} - {'should not' if is_key else 'can'} have NULL values",
            }

        @agent.tool
        async def analyze_column_data_quality(
            ctx: RunContext[SchemaAnalyzerDependencies],
            column_name: str,
            is_key_field: bool,
        ) -> dict[str, Any]:
            """
            Analyze data quality for a specific column.

            Args:
                column_name: Name of the column to analyze
                is_key_field: Whether this is identified as a key field

            Returns:
                Data quality metrics including missing values, duplicates, and warnings
            """
            if not ctx.deps.sheet_data:
                return {"error": "No sheet data available"}

            columns = ctx.deps.sheet_data.get("columns", [])
            rows = ctx.deps.sheet_data.get("rows", [])

            if column_name not in columns:
                return {"error": f"Column '{column_name}' not found"}

            col_idx = columns.index(column_name)
            values = [row[col_idx] if col_idx < len(row) else "" for row in rows]

            # Count missing values
            missing_count = sum(1 for v in values if v == "" or v is None)
            total_count = len(values)
            missing_pct = (missing_count / total_count * 100) if total_count > 0 else 0

            # Count duplicates
            from collections import Counter

            value_counts = Counter(v for v in values if v != "" and v is not None)
            duplicate_count = sum(count - 1 for count in value_counts.values() if count > 1)
            has_duplicates = duplicate_count > 0

            # Generate warning if needed
            warning = None
            if is_key_field and missing_count > 0:
                warning = (
                    f"KEY FIELD has {missing_count} missing values ({missing_pct:.1f}%) - "
                    f"should be required (NOT NULL)"
                )
            elif is_key_field and has_duplicates:
                warning = f"KEY FIELD has {duplicate_count} duplicate values - consider UNIQUE constraint"

            # Get example values (first 5 unique non-empty values)
            unique_values = [v for v in dict.fromkeys(values) if v != "" and v is not None]
            examples = [str(v) for v in unique_values[:5]]

            return {
                "column": column_name,
                "missing_count": missing_count,
                "missing_percentage": missing_pct,
                "has_duplicates": has_duplicates,
                "duplicate_count": duplicate_count,
                "warning": warning,
                "example_values": examples,
            }

        @agent.tool
        async def detect_duplicate_rows(
            ctx: RunContext[SchemaAnalyzerDependencies],
        ) -> dict[str, Any]:
            """
            Detect completely duplicate rows in the dataset.

            Returns:
                Count of duplicate rows and examples
            """
            if not ctx.deps.sheet_data:
                return {"error": "No sheet data available"}

            rows = ctx.deps.sheet_data.get("rows", [])

            # Convert rows to tuples for hashing
            from collections import Counter

            row_tuples = [tuple(row) for row in rows]
            row_counts = Counter(row_tuples)

            # Count duplicates
            duplicate_count = sum(count - 1 for count in row_counts.values() if count > 1)
            duplicate_rows = [
                {"row": list(row), "count": count}
                for row, count in row_counts.items()
                if count > 1
            ]

            return {
                "total_rows": len(rows),
                "duplicate_count": duplicate_count,
                "unique_rows": len(row_counts),
                "has_duplicates": duplicate_count > 0,
                "examples": duplicate_rows[:3],  # First 3 duplicate examples
            }

        @agent.tool
        async def suggest_postgresql_type(
            ctx: RunContext[SchemaAnalyzerDependencies],
            column_name: str,
            detected_type: str,
        ) -> str:
            """
            Suggest the optimal PostgreSQL data type based on column name and detected type.

            Args:
                column_name: Name of the column (provides semantic context)
                detected_type: Initially detected type (text, number, date, boolean)

            Returns:
                Optimal PostgreSQL type with reasoning
            """
            # Semantic type overrides
            semantic_types = {
                "email": "text",  # Could use citext for case-insensitive
                "phone": "text",
                "zip": "text",
                "postal": "text",
                "id": "text",  # IDs are typically text (UUIDs, etc.)
                "code": "text",
                "reference": "text",
                "url": "text",
                "description": "text",
                "notes": "text",
                "content": "text",
                "price": "numeric",
                "amount": "numeric",
                "quantity": "integer",
                "count": "integer",
                "age": "integer",
                "year": "integer",
                "created_at": "timestamp",
                "updated_at": "timestamp",
                "date": "date",
                "active": "boolean",
                "enabled": "boolean",
                "verified": "boolean",
            }

            column_lower = column_name.lower()

            # Check for semantic matches
            for keyword, pg_type in semantic_types.items():
                if keyword in column_lower:
                    return pg_type

            # Default type mapping
            type_map = {
                "text": "text",
                "number": "numeric",  # Safe default for numbers
                "date": "date",
                "boolean": "boolean",
            }

            return type_map.get(detected_type, "text")

        return agent

    async def analyze_schema(
        self,
        sheet_data: dict[str, Any],
        file_name: str,
        sheet_name: str,
    ) -> SchemaAnalysisResult:
        """
        Analyze XLSX sheet data and provide comprehensive schema recommendations.

        Args:
            sheet_data: Dictionary with 'columns', 'rows', 'column_types'
            file_name: Name of the XLSX file
            sheet_name: Name of the sheet being analyzed

        Returns:
            Complete schema analysis with recommendations
        """
        deps = SchemaAnalyzerDependencies(
            sheet_data=sheet_data, file_name=file_name, sheet_name=sheet_name
        )

        # Create analysis prompt
        columns_info = "\n".join(
            [
                f"- {col}: {sheet_data['column_types'].get(col, 'unknown')}"
                for col in sheet_data["columns"]
            ]
        )

        prompt = f"""Analyze this XLSX data and provide a complete Supabase schema recommendation:

**File**: {file_name}
**Sheet**: {sheet_name}
**Rows**: {sheet_data.get('total_rows', len(sheet_data.get('rows', [])))}

**Columns**:
{columns_info}

**Sample Data** (first 3 rows):
{sheet_data.get('rows', [])[:3]}

Please provide:
1. Semantic column naming (improve abbreviations, use snake_case)
2. Identify KEY FIELDS vs OPTIONAL FIELDS
3. Check for missing values in KEY FIELDS only
4. Detect duplicate rows
5. Suggest appropriate PostgreSQL types
6. Recommend constraints (NOT NULL, UNIQUE)
7. Suggest indexes for performance
8. Generate CREATE TABLE SQL
9. Provide data quality summary

Remember: Only warn about missing values in KEY FIELDS (like id, name, email). Ignore missing values in optional fields (like notes, comments, middle_name)."""

        result = await self.run(prompt, deps=deps)
        return result.data
