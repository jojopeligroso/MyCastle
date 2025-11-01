"""
Transform API endpoints for XLSX to Supabase conversion

Handles:
- File upload with multipart/form-data
- Sheet listing and selection
- Data preview
- Schema analysis (via MCP/Agent)
- Transformation execution
"""

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi import status as http_status
from pydantic import BaseModel

from ..config.logfire_config import get_logger
from ..services.transform_service import TransformService
from ..utils import get_supabase_client
from ..utils.xlsx_utils import XLSXParseError

# Import schema analyzer agent
try:
    from ...agents.schema_analyzer_agent import SchemaAnalyzerAgent

    AGENT_AVAILABLE = True
except ImportError:
    AGENT_AVAILABLE = False
    logger.warning("Schema analyzer agent not available - using basic analysis")

logger = get_logger(__name__)

router = APIRouter(prefix="/api/transform", tags=["transform"])


class PreviewRequest(BaseModel):
    upload_id: str
    sheet_name: str


class ExecuteTransformRequest(BaseModel):
    upload_id: str
    sheet_name: str
    table_name: str
    column_mapping: dict[str, str]  # XLSX column name -> Supabase column name


@router.post("/upload")
async def upload_xlsx(file: UploadFile = File(...)):
    """
    Upload an XLSX file for transformation

    Returns upload_id and sheet metadata
    """
    try:
        logger.info(f"Uploading XLSX file: {file.filename}")

        # Validate file type
        if not file.filename or not file.filename.lower().endswith(".xlsx"):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Only .xlsx files are supported",
            )

        # Read file content
        content = await file.read()

        if len(content) == 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST, detail="File is empty"
            )

        # Save and parse file
        service = TransformService()
        result = service.save_uploaded_file(content, file.filename)

        return result

    except XLSXParseError as e:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to upload XLSX: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {e}",
        )


@router.post("/preview")
async def preview_sheet(request: PreviewRequest):
    """
    Get preview data from a specific sheet

    Returns columns, sample rows, and column type detection
    """
    try:
        logger.info(
            f"Generating preview for sheet '{request.sheet_name}' in upload {request.upload_id}"
        )

        service = TransformService()
        result = service.get_sheet_preview(request.upload_id, request.sheet_name)

        return result

    except XLSXParseError as e:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to generate preview: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Preview failed: {e}",
        )


@router.post("/analyze-schema")
async def analyze_schema(request: PreviewRequest):
    """
    Analyze XLSX sheet and suggest Supabase schema

    Uses AI-powered agent to detect column types, relationships, and data quality issues
    Returns suggested table schema, column mappings, and comprehensive analysis
    """
    try:
        logger.info(
            f"Analyzing schema for sheet '{request.sheet_name}' in upload {request.upload_id}"
        )

        # Get sheet data
        service = TransformService()
        sheet_data = service.get_sheet_preview(request.upload_id, request.sheet_name)

        # Use AI agent for intelligent analysis if available
        if AGENT_AVAILABLE:
            try:
                logger.info("Using AI agent for schema analysis")
                agent = SchemaAnalyzerAgent()
                analysis = await agent.analyze_schema(
                    sheet_data=sheet_data,
                    file_name=request.upload_id,
                    sheet_name=request.sheet_name,
                )

                # Convert agent result to API response format
                suggested_mapping = {}
                suggested_schema = []

                for col_analysis in analysis.columns:
                    suggested_mapping[col_analysis.source_column] = col_analysis.suggested_name
                    suggested_schema.append(
                        {
                            "column_name": col_analysis.suggested_name,
                            "data_type": col_analysis.data_type,
                            "source_column": col_analysis.source_column,
                            "nullable": col_analysis.nullable,
                            "unique": col_analysis.unique,
                            "is_key_field": col_analysis.is_key_field,
                            "data_quality_warning": col_analysis.data_quality_warning,
                        }
                    )

                return {
                    "suggested_mapping": suggested_mapping,
                    "suggested_schema": suggested_schema,
                    "suggested_table_name": analysis.suggested_table_name,
                    "column_count": len(analysis.columns),
                    "row_count": analysis.total_rows,
                    "duplicate_row_count": analysis.duplicate_row_count,
                    "data_quality_summary": analysis.data_quality_summary,
                    "recommended_indexes": analysis.recommended_indexes,
                    "create_table_sql": analysis.create_table_sql,
                    "warnings": analysis.warnings,
                    "ai_enhanced": True,
                }

            except Exception as agent_error:
                logger.error(f"AI agent analysis failed: {agent_error}", exc_info=True)
                logger.info("Falling back to basic analysis")
                # Fall through to basic analysis

        # Basic analysis fallback (if agent not available or failed)
        columns = sheet_data["columns"]
        column_types = sheet_data["column_types"]

        # Map XLSX types to Postgres types
        type_mapping = {
            "text": "text",
            "number": "numeric",
            "date": "date",
            "boolean": "boolean",
        }

        # Suggest column mappings (snake_case conversion)
        suggested_mapping = {}
        suggested_schema = []

        for col in columns:
            if not col:
                continue

            # Convert to snake_case
            snake_col = col.lower().replace(" ", "_").replace("-", "_")
            snake_col = "".join(c if c.isalnum() or c == "_" else "_" for c in snake_col)

            # Remove consecutive underscores
            while "__" in snake_col:
                snake_col = snake_col.replace("__", "_")

            suggested_mapping[col] = snake_col

            pg_type = type_mapping.get(column_types.get(col, "text"), "text")

            suggested_schema.append(
                {"column_name": snake_col, "data_type": pg_type, "source_column": col}
            )

        return {
            "suggested_mapping": suggested_mapping,
            "suggested_schema": suggested_schema,
            "column_count": len(columns),
            "row_count": sheet_data["row_count"],
            "ai_enhanced": False,
        }

    except Exception as e:
        logger.error(f"Failed to analyze schema: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schema analysis failed: {e}",
        )


@router.post("/execute")
async def execute_transformation(request: ExecuteTransformRequest):
    """
    Execute transformation from XLSX to Supabase table

    Transforms data and inserts into specified table
    """
    try:
        logger.info(
            f"Executing transformation: sheet '{request.sheet_name}' -> table '{request.table_name}'"
        )

        # Validate inputs
        if not request.column_mapping:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Column mapping is required",
            )

        # Get Supabase client
        supabase_client = get_supabase_client()

        # Execute transformation
        service = TransformService()
        result = service.execute_transformation(
            upload_id=request.upload_id,
            sheet_name=request.sheet_name,
            table_name=request.table_name,
            column_mapping=request.column_mapping,
            supabase_client=supabase_client,
        )

        return result

    except Exception as e:
        logger.error(f"Failed to execute transformation: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transformation failed: {e}",
        )


@router.delete("/cleanup/{upload_id}")
async def cleanup_upload(upload_id: str):
    """
    Clean up temporary upload files

    Should be called after transformation is complete or cancelled
    """
    try:
        logger.info(f"Cleaning up upload: {upload_id}")

        service = TransformService()
        success = service.cleanup_upload(upload_id)

        return {"success": success, "upload_id": upload_id}

    except Exception as e:
        logger.error(f"Failed to cleanup upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cleanup failed: {e}",
        )
