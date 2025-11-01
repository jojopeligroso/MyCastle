"""
Transform service for XLSX to Supabase data transformation

Handles:
- File upload and temporary storage
- Sheet parsing and preview
- Schema detection (delegated to MCP/Agent)
- Data transformation and insertion to Supabase
"""

import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..config.logfire_config import get_logger
from ..utils.xlsx_utils import XLSXParseError, extract_sheet_data, parse_xlsx_file

logger = get_logger(__name__)


class TransformService:
    """Service for handling XLSX to Supabase transformations"""

    def __init__(self):
        # Use system temp directory for uploaded files
        self.upload_dir = Path(tempfile.gettempdir()) / "archon_uploads"
        self.upload_dir.mkdir(exist_ok=True)

    def save_uploaded_file(self, file_content: bytes, filename: str) -> dict[str, Any]:
        """
        Save uploaded XLSX file to temporary storage and parse metadata

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            Dict with upload_id, file info, and sheets metadata
        """
        try:
            # Generate unique upload ID
            upload_id = str(uuid.uuid4())

            # Ensure filename ends with .xlsx
            if not filename.lower().endswith(".xlsx"):
                filename = f"{filename}.xlsx"

            # Create upload directory for this file
            upload_path = self.upload_dir / upload_id
            upload_path.mkdir(exist_ok=True)

            # Save file
            file_path = upload_path / filename
            file_path.write_bytes(file_content)

            logger.info(f"Saved uploaded file: {filename} (upload_id: {upload_id})")

            # Parse XLSX metadata
            try:
                metadata = parse_xlsx_file(file_path)
            except XLSXParseError as e:
                # Clean up file if parsing fails
                shutil.rmtree(upload_path, ignore_errors=True)
                raise

            return {
                "upload_id": upload_id,
                "filename": filename,
                "file_size": metadata["file_size"],
                "sheet_count": metadata["sheet_count"],
                "sheets": metadata["sheets"],
                "most_recent_sheet": metadata["most_recent_sheet"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

        except XLSXParseError:
            raise
        except Exception as e:
            logger.error(f"Failed to save uploaded file: {e}", exc_info=True)
            raise Exception(f"Failed to save uploaded file: {e}") from e

    def get_sheet_preview(self, upload_id: str, sheet_name: str) -> dict[str, Any]:
        """
        Get preview data from a specific sheet

        Args:
            upload_id: Upload ID from save_uploaded_file
            sheet_name: Name of sheet to preview

        Returns:
            Dict with columns, sample rows, and metadata
        """
        try:
            # Find uploaded file
            upload_path = self.upload_dir / upload_id
            if not upload_path.exists():
                raise Exception(f"Upload not found: {upload_id}")

            # Find XLSX file in upload directory
            xlsx_files = list(upload_path.glob("*.xlsx"))
            if not xlsx_files:
                raise Exception(f"No XLSX file found in upload: {upload_id}")

            file_path = xlsx_files[0]

            # Extract sheet data
            sheet_data = extract_sheet_data(file_path, sheet_name, max_rows=1000)

            logger.info(f"Generated preview for sheet '{sheet_name}' in upload {upload_id}")

            return sheet_data

        except XLSXParseError:
            raise
        except Exception as e:
            logger.error(f"Failed to get sheet preview: {e}", exc_info=True)
            raise Exception(f"Failed to get sheet preview: {e}") from e

    def cleanup_upload(self, upload_id: str) -> bool:
        """
        Clean up temporary upload directory

        Args:
            upload_id: Upload ID to clean up

        Returns:
            True if cleanup successful
        """
        try:
            upload_path = self.upload_dir / upload_id
            if upload_path.exists():
                shutil.rmtree(upload_path)
                logger.info(f"Cleaned up upload: {upload_id}")
                return True
            return False

        except Exception as e:
            logger.error(f"Failed to cleanup upload: {e}", exc_info=True)
            return False

    def execute_transformation(
        self,
        upload_id: str,
        sheet_name: str,
        table_name: str,
        column_mapping: dict[str, str],
        supabase_client: Any,
    ) -> dict[str, Any]:
        """
        Execute transformation from XLSX to Supabase table

        Args:
            upload_id: Upload ID
            sheet_name: Sheet to transform
            table_name: Target Supabase table name
            column_mapping: Dict mapping XLSX column names to Supabase column names
            supabase_client: Initialized Supabase client

        Returns:
            Dict with transformation results and statistics
        """
        try:
            # Get full sheet data
            upload_path = self.upload_dir / upload_id
            if not upload_path.exists():
                raise Exception(f"Upload not found: {upload_id}")

            xlsx_files = list(upload_path.glob("*.xlsx"))
            if not xlsx_files:
                raise Exception(f"No XLSX file found in upload: {upload_id}")

            file_path = xlsx_files[0]

            # Extract all data (no row limit for transformation)
            sheet_data = extract_sheet_data(file_path, sheet_name, max_rows=10000)

            columns = sheet_data["columns"]
            rows = sheet_data["rows"]

            # Transform rows to Supabase records
            records = []
            errors = []

            for row_idx, row in enumerate(rows):
                try:
                    record = {}

                    for xlsx_col, supabase_col in column_mapping.items():
                        # Find column index
                        try:
                            col_idx = columns.index(xlsx_col)
                            value = row[col_idx] if col_idx < len(row) else None

                            # Handle empty values
                            if value == "":
                                value = None

                            record[supabase_col] = value

                        except ValueError:
                            # Column not found in XLSX
                            record[supabase_col] = None

                    # Add metadata
                    record["created_at"] = datetime.now(timezone.utc).isoformat()
                    record["source_file"] = file_path.name
                    record["source_sheet"] = sheet_name
                    record["source_row"] = row_idx + 2  # +2 because header is row 1

                    records.append(record)

                except Exception as e:
                    errors.append({"row": row_idx + 2, "error": str(e)})

            # Insert records to Supabase
            inserted_count = 0
            failed_count = 0

            if records:
                try:
                    # Batch insert (Supabase handles this efficiently)
                    result = supabase_client.table(table_name).insert(records).execute()
                    inserted_count = len(records)
                    logger.info(f"Inserted {inserted_count} records to {table_name}")

                except Exception as e:
                    logger.error(f"Failed to insert records: {e}", exc_info=True)
                    failed_count = len(records)
                    errors.append({"batch": "all", "error": str(e)})

            return {
                "success": failed_count == 0,
                "table_name": table_name,
                "total_rows": len(rows),
                "inserted_count": inserted_count,
                "failed_count": failed_count,
                "errors": errors[:10],  # Return first 10 errors
                "has_more_errors": len(errors) > 10,
            }

        except Exception as e:
            logger.error(f"Failed to execute transformation: {e}", exc_info=True)
            raise Exception(f"Failed to execute transformation: {e}") from e
