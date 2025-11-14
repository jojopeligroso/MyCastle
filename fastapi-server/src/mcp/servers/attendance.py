"""Attendance & Compliance MCP Server - 8 tools for attendance and compliance management."""
import logging
from typing import Any, Dict, List
from datetime import datetime, timedelta
import json
import hashlib

from supabase import create_client

from ..base import BaseMCPServer
from ..types import AuthContext, ToolInputSchema
from ...config import settings

logger = logging.getLogger(__name__)


class AttendanceMCP(BaseMCPServer):
    """Attendance & Compliance MCP Server implementing 8 tools."""

    def __init__(self):
        """Initialize Attendance MCP."""
        super().__init__(
            name="attendance-mcp",
            version="1.0.0",
            scope="attendance:*"
        )
        self.supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

    async def initialize(self) -> None:
        """Initialize Attendance MCP server."""
        await self._register_tools()
        await self._register_resources()
        await self._register_prompts()

        self._initialized = True
        logger.info(f"Attendance MCP initialized with {self.tool_count} tools")

    async def shutdown(self) -> None:
        """Shutdown Attendance MCP server."""
        self._initialized = False
        logger.info("Attendance MCP shutdown complete")

    async def _register_tools(self) -> None:
        """Register all 8 attendance tools."""

        # Tool 1: prepare_register
        self.register_tool(
            name="prepare_register",
            description="Initialize attendance register for a class session",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "session_id": {"type": "string", "format": "uuid"},
                    "date": {"type": "string", "format": "date"},
                },
                required=["session_id", "date"],
            ),
            handler=self._prepare_register,
        )

        # Tool 2: record_attendance
        self.register_tool(
            name="record_attendance",
            description="Mark attendance status for a student (Present/Absent/Late/Excused)",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "register_id": {"type": "string", "format": "uuid"},
                    "student_id": {"type": "string", "format": "uuid"},
                    "status": {"type": "string", "enum": ["present", "absent", "late", "excused"]},
                    "notes": {"type": "string"},
                },
                required=["register_id", "student_id", "status"],
            ),
            handler=self._record_attendance,
        )

        # Tool 3: correct_attendance
        self.register_tool(
            name="correct_attendance",
            description="Admin correction of attendance with audit trail",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "attendance_id": {"type": "string", "format": "uuid"},
                    "new_status": {"type": "string", "enum": ["present", "absent", "late", "excused"]},
                    "correction_reason": {"type": "string"},
                },
                required=["attendance_id", "new_status", "correction_reason"],
            ),
            handler=self._correct_attendance,
        )

        # Tool 4: export_attendance
        self.register_tool(
            name="export_attendance",
            description="Export attendance data with cryptographic hash for tamper evidence",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "class_id": {"type": "string", "format": "uuid"},
                    "date_from": {"type": "string", "format": "date"},
                    "date_to": {"type": "string", "format": "date"},
                    "format": {"type": "string", "enum": ["csv", "excel", "pdf"]},
                },
                required=["class_id", "date_from", "date_to"],
            ),
            handler=self._export_attendance,
        )

        # Tool 5: visa_compliance_report
        self.register_tool(
            name="visa_compliance_report",
            description="Track visa student attendance compliance (80% requirement)",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "student_id": {"type": "string", "format": "uuid"},
                    "period_weeks": {"type": "integer", "minimum": 1},
                },
                required=["student_id"],
            ),
            handler=self._visa_compliance_report,
        )

        # Tool 6: compile_compliance_pack
        self.register_tool(
            name="compile_compliance_pack",
            description="Bundle attendance documents for regulatory audit",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "audit_type": {"type": "string", "enum": ["visa", "accreditation", "internal"]},
                    "date_from": {"type": "string", "format": "date"},
                    "date_to": {"type": "string", "format": "date"},
                },
                required=["audit_type", "date_from", "date_to"],
            ),
            handler=self._compile_compliance_pack,
        )

        # Tool 7: anonymise_dataset
        self.register_tool(
            name="anonymise_dataset",
            description="GDPR anonymization of attendance data after retention period",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "before_date": {"type": "string", "format": "date"},
                    "dry_run": {"type": "boolean", "default": True},
                },
                required=["before_date"],
            ),
            handler=self._anonymise_dataset,
        )

        # Tool 8: policy_check
        self.register_tool(
            name="policy_check",
            description="Validate attendance data against retention and compliance policies",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "policy_type": {"type": "string", "enum": ["retention", "visa", "gdpr"]},
                },
                required=["policy_type"],
            ),
            handler=self._policy_check,
        )

    async def _register_resources(self) -> None:
        """Register attendance resources."""

        self.register_resource(
            uri="mycastle://attendance/registers",
            name="Attendance Registers",
            description="List of all attendance registers",
            handler=self._get_registers_resource,
        )

        self.register_resource(
            uri="mycastle://attendance/compliance-status",
            name="Compliance Status",
            description="Visa compliance status for all students",
            handler=self._get_compliance_status_resource,
        )

    async def _register_prompts(self) -> None:
        """Register attendance prompts."""

        self.register_prompt(
            name="attendance:absence_followup",
            description="AI prompt for following up on student absences",
            arguments=[
                {"name": "student_id", "description": "Student ID", "required": True}
            ],
            handler=self._absence_followup_prompt,
        )

    # Tool Handlers

    async def _prepare_register(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Prepare attendance register for a session."""
        try:
            # Get class enrollment
            students_response = self.supabase.table("enrollment").select(
                "student_id"
            ).eq("session_id", args["session_id"]).eq("active", True).execute()

            students = students_response.data or []

            # Create register
            register_data = {
                "session_id": args["session_id"],
                "date": args["date"],
                "status": "open",
                "student_count": len(students),
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("register").insert(register_data).execute()

            if not response.data:
                raise Exception("Failed to create register")

            register = response.data[0]

            # Create attendance entries for each student
            attendance_entries = []
            for student in students:
                entry = {
                    "register_id": register["id"],
                    "student_id": student["student_id"],
                    "status": "pending",
                    "tenant_id": context.tenant_id,
                }
                attendance_entries.append(entry)

            if attendance_entries:
                self.supabase.table("attendance").insert(attendance_entries).execute()

            return {
                "success": True,
                "register_id": register["id"],
                "student_count": len(students),
                "message": f"Register prepared for {len(students)} students",
                "register": register,
            }

        except Exception as e:
            logger.error(f"Error preparing register: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _record_attendance(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Record attendance for a student."""
        try:
            # Update attendance entry
            update_data = {
                "status": args["status"],
                "notes": args.get("notes", ""),
                "recorded_at": datetime.utcnow().isoformat(),
                "recorded_by": context.user_id,
            }

            response = self.supabase.table("attendance").update(update_data).eq(
                "register_id", args["register_id"]
            ).eq("student_id", args["student_id"]).execute()

            if not response.data:
                raise Exception("Attendance entry not found")

            # Generate hash chain for tamper evidence
            attendance = response.data[0]
            hash_data = f"{attendance['id']}:{attendance['status']}:{attendance['recorded_at']}"
            attendance_hash = hashlib.sha256(hash_data.encode()).hexdigest()

            # Update hash
            self.supabase.table("attendance").update({
                "hash": attendance_hash
            }).eq("id", attendance["id"]).execute()

            return {
                "success": True,
                "message": f"Attendance marked as {args['status']}",
                "attendance": attendance,
                "hash": attendance_hash,
            }

        except Exception as e:
            logger.error(f"Error recording attendance: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _correct_attendance(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Correct attendance with audit trail."""
        try:
            # Get current attendance
            current_response = self.supabase.table("attendance").select("*").eq(
                "id", args["attendance_id"]
            ).execute()

            if not current_response.data:
                raise Exception("Attendance record not found")

            current = current_response.data[0]

            # Check 48-hour edit window
            recorded_at = datetime.fromisoformat(current["recorded_at"])
            hours_elapsed = (datetime.utcnow() - recorded_at).total_seconds() / 3600

            if hours_elapsed > 48 and context.role.value not in ["super_admin", "admin"]:
                return {
                    "success": False,
                    "error": "Attendance can only be corrected within 48 hours, or by admin",
                }

            # Create audit entry
            audit_data = {
                "attendance_id": args["attendance_id"],
                "old_status": current["status"],
                "new_status": args["new_status"],
                "reason": args["correction_reason"],
                "corrected_by": context.user_id,
                "corrected_at": datetime.utcnow().isoformat(),
                "tenant_id": context.tenant_id,
            }

            self.supabase.table("attendance_correction").insert(audit_data).execute()

            # Update attendance
            update_data = {
                "status": args["new_status"],
                "corrected": True,
                "correction_count": (current.get("correction_count", 0) + 1),
            }

            response = self.supabase.table("attendance").update(update_data).eq(
                "id", args["attendance_id"]
            ).execute()

            return {
                "success": True,
                "message": "Attendance corrected with audit trail",
                "old_status": current["status"],
                "new_status": args["new_status"],
                "audit_created": True,
            }

        except Exception as e:
            logger.error(f"Error correcting attendance: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _export_attendance(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Export attendance with cryptographic hash."""
        try:
            # Fetch attendance data
            response = self.supabase.table("attendance").select(
                "*, register:register_id(*), student:student_id(*)"
            ).eq("register.class_id", args["class_id"]).gte(
                "register.date", args["date_from"]
            ).lte("register.date", args["date_to"]).execute()

            attendance_records = response.data or []

            # Generate export hash
            export_data = json.dumps(attendance_records, sort_keys=True)
            export_hash = hashlib.sha256(export_data.encode()).hexdigest()

            # Format based on export type
            export_format = args.get("format", "csv")

            return {
                "success": True,
                "format": export_format,
                "record_count": len(attendance_records),
                "data": attendance_records,
                "export_hash": export_hash,
                "message": f"Exported {len(attendance_records)} records with hash verification",
            }

        except Exception as e:
            logger.error(f"Error exporting attendance: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _visa_compliance_report(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Generate visa compliance report."""
        try:
            period_weeks = args.get("period_weeks", 4)
            date_from = (datetime.utcnow() - timedelta(weeks=period_weeks)).date().isoformat()
            date_to = datetime.utcnow().date().isoformat()

            # Fetch attendance for student
            response = self.supabase.table("attendance").select(
                "status, register:register_id(date)"
            ).eq("student_id", args["student_id"]).gte(
                "register.date", date_from
            ).lte("register.date", date_to).execute()

            records = response.data or []

            # Calculate attendance percentage
            total_sessions = len(records)
            present_count = sum(1 for r in records if r["status"] in ["present", "late"])
            attendance_percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 0

            # Visa requirement is typically 80%
            compliant = attendance_percentage >= 80

            status = "compliant" if compliant else "at_risk"
            if attendance_percentage < 70:
                status = "non_compliant"

            return {
                "success": True,
                "student_id": args["student_id"],
                "period_weeks": period_weeks,
                "total_sessions": total_sessions,
                "present_count": present_count,
                "attendance_percentage": round(attendance_percentage, 2),
                "compliant": compliant,
                "status": status,
                "warning": "Student below 80% visa compliance threshold" if not compliant else None,
            }

        except Exception as e:
            logger.error(f"Error generating visa compliance report: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _compile_compliance_pack(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Compile compliance documentation pack."""
        try:
            audit_type = args["audit_type"]
            date_from = args["date_from"]
            date_to = args["date_to"]

            # Fetch relevant data based on audit type
            documents = []

            # Attendance registers
            registers_response = self.supabase.table("register").select(
                "*, attendance:attendance(*)"
            ).gte("date", date_from).lte("date", date_to).execute()

            documents.append({
                "type": "attendance_registers",
                "count": len(registers_response.data or []),
                "data": registers_response.data,
            })

            # Corrections audit trail
            corrections_response = self.supabase.table("attendance_correction").select(
                "*"
            ).gte("corrected_at", date_from).lte("corrected_at", date_to).execute()

            documents.append({
                "type": "corrections_audit",
                "count": len(corrections_response.data or []),
                "data": corrections_response.data,
            })

            # Visa compliance for visa audits
            if audit_type == "visa":
                visa_students_response = self.supabase.table("user").select(
                    "id, name"
                ).eq("visa_student", True).eq("tenant_id", context.tenant_id).execute()

                visa_compliance = []
                for student in (visa_students_response.data or []):
                    compliance = await self._visa_compliance_report(
                        {"student_id": student["id"]},
                        context
                    )
                    visa_compliance.append(compliance)

                documents.append({
                    "type": "visa_compliance",
                    "count": len(visa_compliance),
                    "data": visa_compliance,
                })

            # Generate pack hash
            pack_data = json.dumps(documents, sort_keys=True)
            pack_hash = hashlib.sha256(pack_data.encode()).hexdigest()

            return {
                "success": True,
                "audit_type": audit_type,
                "period": f"{date_from} to {date_to}",
                "document_count": len(documents),
                "documents": documents,
                "pack_hash": pack_hash,
                "message": f"Compiled {len(documents)} document types for {audit_type} audit",
            }

        except Exception as e:
            logger.error(f"Error compiling compliance pack: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _anonymise_dataset(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """GDPR anonymization of old attendance data."""
        try:
            before_date = args["before_date"]
            dry_run = args.get("dry_run", True)

            # Find records to anonymize
            response = self.supabase.table("attendance").select(
                "id, student_id"
            ).lt("recorded_at", before_date).execute()

            records_to_anonymize = response.data or []

            if dry_run:
                return {
                    "success": True,
                    "dry_run": True,
                    "records_count": len(records_to_anonymize),
                    "message": f"Would anonymize {len(records_to_anonymize)} records (dry run)",
                }

            # Anonymize by replacing student_id with hashed version
            anonymized_count = 0
            for record in records_to_anonymize:
                anonymous_id = hashlib.sha256(
                    f"anon_{record['student_id']}".encode()
                ).hexdigest()[:16]

                self.supabase.table("attendance").update({
                    "student_id": anonymous_id,
                    "anonymized": True,
                    "anonymized_at": datetime.utcnow().isoformat(),
                }).eq("id", record["id"]).execute()

                anonymized_count += 1

            return {
                "success": True,
                "dry_run": False,
                "records_anonymized": anonymized_count,
                "message": f"Anonymized {anonymized_count} records for GDPR compliance",
            }

        except Exception as e:
            logger.error(f"Error anonymizing dataset: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _policy_check(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Validate against compliance policies."""
        try:
            policy_type = args["policy_type"]
            issues = []

            if policy_type == "retention":
                # Check for data older than 7 years (typical retention)
                seven_years_ago = (
                    datetime.utcnow() - timedelta(days=7*365)
                ).date().isoformat()

                old_data = self.supabase.table("attendance").select(
                    "id"
                ).lt("recorded_at", seven_years_ago).eq(
                    "anonymized", False
                ).execute()

                if old_data.data:
                    issues.append({
                        "type": "retention_violation",
                        "count": len(old_data.data),
                        "message": f"{len(old_data.data)} records exceed 7-year retention policy",
                    })

            elif policy_type == "visa":
                # Check visa students below 80%
                visa_students = self.supabase.table("user").select(
                    "id"
                ).eq("visa_student", True).eq("tenant_id", context.tenant_id).execute()

                for student in (visa_students.data or []):
                    compliance = await self._visa_compliance_report(
                        {"student_id": student["id"]},
                        context
                    )
                    if not compliance.get("compliant"):
                        issues.append({
                            "type": "visa_compliance",
                            "student_id": student["id"],
                            "attendance_percentage": compliance.get("attendance_percentage"),
                            "message": "Student below 80% visa compliance",
                        })

            elif policy_type == "gdpr":
                # Check for unanonymized old data
                two_years_ago = (
                    datetime.utcnow() - timedelta(days=2*365)
                ).date().isoformat()

                old_personal_data = self.supabase.table("attendance").select(
                    "id"
                ).lt("recorded_at", two_years_ago).eq(
                    "anonymized", False
                ).execute()

                if old_personal_data.data:
                    issues.append({
                        "type": "gdpr_anonymization",
                        "count": len(old_personal_data.data),
                        "message": f"{len(old_personal_data.data)} records should be anonymized",
                    })

            compliant = len(issues) == 0

            return {
                "success": True,
                "policy_type": policy_type,
                "compliant": compliant,
                "issue_count": len(issues),
                "issues": issues,
                "message": "Policy check complete" if compliant else f"Found {len(issues)} policy violations",
            }

        except Exception as e:
            logger.error(f"Error checking policy: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    # Resource Handlers

    async def _get_registers_resource(self, context: AuthContext) -> str:
        """Get attendance registers resource."""
        try:
            response = self.supabase.table("register").select(
                "*, attendance:attendance(*)"
            ).eq("tenant_id", context.tenant_id).order(
                "date", desc=True
            ).limit(100).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching registers resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    async def _get_compliance_status_resource(self, context: AuthContext) -> str:
        """Get visa compliance status resource."""
        try:
            visa_students = self.supabase.table("user").select(
                "id, name"
            ).eq("visa_student", True).eq("tenant_id", context.tenant_id).execute()

            compliance_status = []
            for student in (visa_students.data or []):
                status = await self._visa_compliance_report(
                    {"student_id": student["id"]},
                    context
                )
                compliance_status.append({
                    "student_name": student["name"],
                    **status
                })

            return json.dumps(compliance_status)
        except Exception as e:
            logger.error(f"Error fetching compliance status: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    # Prompt Handlers

    async def _absence_followup_prompt(
        self, args: Dict[str, Any], context: AuthContext
    ) -> list:
        """Generate absence follow-up prompt."""
        try:
            student_id = args["student_id"]

            # Fetch recent absences
            response = self.supabase.table("attendance").select(
                "*, register:register_id(*), student:student_id(*)"
            ).eq("student_id", student_id).eq("status", "absent").order(
                "recorded_at", desc=True
            ).limit(10).execute()

            absences = response.data or []

            return [
                {
                    "role": "system",
                    "content": "You are a pastoral care coordinator following up on student absences."
                },
                {
                    "role": "user",
                    "content": f"Draft a follow-up message for student with {len(absences)} recent absences:\n"
                               f"{json.dumps(absences, indent=2)}"
                }
            ]
        except Exception as e:
            logger.error(f"Error generating absence followup prompt: {str(e)}", exc_info=True)
            return [{"role": "user", "content": f"Error: {str(e)}"}]
