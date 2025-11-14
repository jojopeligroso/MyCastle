"""Student Services MCP Server - 9 tools for student support and services."""
import logging
from typing import Any, Dict
from datetime import datetime
import json
from io import BytesIO

from supabase import create_client

from ..base import BaseMCPServer
from ..types import AuthContext, ToolInputSchema
from ...config import settings

logger = logging.getLogger(__name__)


class StudentServicesMCP(BaseMCPServer):
    """Student Services MCP Server implementing 9 tools."""

    def __init__(self):
        """Initialize Student Services MCP."""
        super().__init__(
            name="student-services-mcp",
            version="1.0.0",
            scope="student_services:*"
        )
        self.supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

    async def initialize(self) -> None:
        """Initialize Student Services MCP server."""
        await self._register_tools()
        await self._register_resources()
        await self._register_prompts()

        self._initialized = True
        logger.info(f"Student Services MCP initialized with {self.tool_count} tools")

    async def shutdown(self) -> None:
        """Shutdown Student Services MCP server."""
        self._initialized = False
        logger.info("Student Services MCP shutdown complete")

    async def _register_tools(self) -> None:
        """Register all 9 student services tools."""

        # Tool 1: register_host
        self.register_tool(
            name="register_host",
            description="Register a host family for student accommodation",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "name": {"type": "string"},
                    "address": {"type": "string"},
                    "capacity": {"type": "integer", "minimum": 1},
                    "contact_phone": {"type": "string"},
                    "contact_email": {"type": "string", "format": "email"},
                    "amenities": {"type": "array", "items": {"type": "string"}},
                },
                required=["name", "address", "capacity", "contact_email"],
            ),
            handler=self._register_host,
        )

        # Tool 2: allocate_accommodation
        self.register_tool(
            name="allocate_accommodation",
            description="Assign student to accommodation",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "student_id": {"type": "string", "format": "uuid"},
                    "host_id": {"type": "string", "format": "uuid"},
                    "start_date": {"type": "string", "format": "date"},
                    "end_date": {"type": "string", "format": "date"},
                    "room_type": {"type": "string", "enum": ["single", "shared"]},
                },
                required=["student_id", "host_id", "start_date", "end_date"],
            ),
            handler=self._allocate_accommodation,
        )

        # Tool 3: swap_accommodation
        self.register_tool(
            name="swap_accommodation",
            description="Process accommodation change request",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "allocation_id": {"type": "string", "format": "uuid"},
                    "new_host_id": {"type": "string", "format": "uuid"},
                    "reason": {"type": "string"},
                    "effective_date": {"type": "string", "format": "date"},
                },
                required=["allocation_id", "new_host_id", "reason"],
            ),
            handler=self._swap_accommodation,
        )

        # Tool 4: export_placements
        self.register_tool(
            name="export_placements",
            description="Export accommodation placement list",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "date": {"type": "string", "format": "date"},
                    "format": {"type": "string", "enum": ["csv", "excel", "pdf"]},
                },
                required=["date"],
            ),
            handler=self._export_placements,
        )

        # Tool 5: issue_letter
        self.register_tool(
            name="issue_letter",
            description="Generate official letters (enrollment, completion, etc.)",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "student_id": {"type": "string", "format": "uuid"},
                    "letter_type": {
                        "type": "string",
                        "enum": ["enrollment", "completion", "attendance", "reference", "visa_support"]
                    },
                    "custom_text": {"type": "string"},
                },
                required=["student_id", "letter_type"],
            ),
            handler=self._issue_letter,
        )

        # Tool 6: approve_deferral
        self.register_tool(
            name="approve_deferral",
            description="Approve or reject course deferral request",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "deferral_request_id": {"type": "string", "format": "uuid"},
                    "approved": {"type": "boolean"},
                    "new_start_date": {"type": "string", "format": "date"},
                    "notes": {"type": "string"},
                },
                required=["deferral_request_id", "approved"],
            ),
            handler=self._approve_deferral,
        )

        # Tool 7: award_certificate
        self.register_tool(
            name="award_certificate",
            description="Issue completion certificate (digital + PDF)",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "student_id": {"type": "string", "format": "uuid"},
                    "programme_id": {"type": "string", "format": "uuid"},
                    "completion_date": {"type": "string", "format": "date"},
                    "grade": {"type": "string"},
                    "achievements": {"type": "array", "items": {"type": "string"}},
                },
                required=["student_id", "programme_id", "completion_date"],
            ),
            handler=self._award_certificate,
        )

        # Tool 8: track_visa_status
        self.register_tool(
            name="track_visa_status",
            description="Track and update visa application status",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "student_id": {"type": "string", "format": "uuid"},
                    "visa_status": {
                        "type": "string",
                        "enum": ["pending", "submitted", "approved", "rejected", "expired"]
                    },
                    "visa_expiry": {"type": "string", "format": "date"},
                    "notes": {"type": "string"},
                },
                required=["student_id", "visa_status"],
            ),
            handler=self._track_visa_status,
        )

        # Tool 9: record_pastoral_note
        self.register_tool(
            name="record_pastoral_note",
            description="Record confidential pastoral care note",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "student_id": {"type": "string", "format": "uuid"},
                    "category": {
                        "type": "string",
                        "enum": ["wellbeing", "academic", "accommodation", "social", "other"]
                    },
                    "content": {"type": "string"},
                    "action_required": {"type": "boolean"},
                    "followup_date": {"type": "string", "format": "date"},
                },
                required=["student_id", "category", "content"],
            ),
            handler=self._record_pastoral_note,
        )

    async def _register_resources(self) -> None:
        """Register student services resources."""

        self.register_resource(
            uri="mycastle://student_services/hosts",
            name="Host Families",
            description="List of registered host families",
            handler=self._get_hosts_resource,
        )

        self.register_resource(
            uri="mycastle://student_services/placements",
            name="Accommodation Placements",
            description="Current accommodation placements",
            handler=self._get_placements_resource,
        )

    async def _register_prompts(self) -> None:
        """Register student services prompts."""

        self.register_prompt(
            name="student_services:letter_template",
            description="AI prompt for generating official letter templates",
            arguments=[
                {"name": "letter_type", "description": "Type of letter", "required": True},
                {"name": "student_id", "description": "Student ID", "required": True}
            ],
            handler=self._letter_template_prompt,
        )

    # Tool Handlers

    async def _register_host(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Register a host family."""
        try:
            host_data = {
                "name": args["name"],
                "address": args["address"],
                "capacity": args["capacity"],
                "contact_phone": args.get("contact_phone", ""),
                "contact_email": args["contact_email"],
                "amenities": args.get("amenities", []),
                "active": True,
                "current_occupancy": 0,
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("host").insert(host_data).execute()

            if not response.data:
                raise Exception("Failed to register host")

            return {
                "success": True,
                "host_id": response.data[0]["id"],
                "message": f"Host family '{args['name']}' registered successfully",
                "host": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error registering host: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _allocate_accommodation(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Allocate accommodation to a student."""
        try:
            # Check host capacity
            host_response = self.supabase.table("host").select("*").eq(
                "id", args["host_id"]
            ).execute()

            if not host_response.data:
                raise Exception("Host not found")

            host = host_response.data[0]

            if host["current_occupancy"] >= host["capacity"]:
                return {
                    "success": False,
                    "error": "Host is at full capacity",
                }

            # Create allocation
            allocation_data = {
                "student_id": args["student_id"],
                "host_id": args["host_id"],
                "start_date": args["start_date"],
                "end_date": args["end_date"],
                "room_type": args.get("room_type", "single"),
                "status": "active",
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("accommodation_allocation").insert(
                allocation_data
            ).execute()

            if not response.data:
                raise Exception("Failed to allocate accommodation")

            # Update host occupancy
            self.supabase.table("host").update({
                "current_occupancy": host["current_occupancy"] + 1
            }).eq("id", args["host_id"]).execute()

            return {
                "success": True,
                "allocation_id": response.data[0]["id"],
                "message": "Accommodation allocated successfully",
                "allocation": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error allocating accommodation: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _swap_accommodation(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Process accommodation swap."""
        try:
            # Get current allocation
            current_response = self.supabase.table("accommodation_allocation").select(
                "*"
            ).eq("id", args["allocation_id"]).execute()

            if not current_response.data:
                raise Exception("Allocation not found")

            current = current_response.data[0]

            # End current allocation
            effective_date = args.get("effective_date", datetime.utcnow().date().isoformat())

            self.supabase.table("accommodation_allocation").update({
                "status": "ended",
                "end_date": effective_date,
                "swap_reason": args["reason"],
            }).eq("id", args["allocation_id"]).execute()

            # Update old host occupancy
            self.supabase.table("host").update({
                "current_occupancy": self.supabase.rpc("decrement", {"x": 1})
            }).eq("id", current["host_id"]).execute()

            # Create new allocation
            new_allocation = await self._allocate_accommodation({
                "student_id": current["student_id"],
                "host_id": args["new_host_id"],
                "start_date": effective_date,
                "end_date": current["end_date"],
                "room_type": current.get("room_type", "single"),
            }, context)

            return {
                "success": True,
                "message": "Accommodation swap completed",
                "old_allocation": current,
                "new_allocation": new_allocation.get("allocation"),
            }

        except Exception as e:
            logger.error(f"Error swapping accommodation: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _export_placements(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Export accommodation placements."""
        try:
            date = args["date"]

            # Fetch active placements on specified date
            response = self.supabase.table("accommodation_allocation").select(
                "*, student:student_id(*), host:host_id(*)"
            ).eq("status", "active").lte("start_date", date).gte("end_date", date).eq(
                "tenant_id", context.tenant_id
            ).execute()

            placements = response.data or []

            export_format = args.get("format", "csv")

            return {
                "success": True,
                "format": export_format,
                "date": date,
                "placement_count": len(placements),
                "data": placements,
                "message": f"Exported {len(placements)} placements",
            }

        except Exception as e:
            logger.error(f"Error exporting placements: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _issue_letter(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Issue official letter to student."""
        try:
            # Fetch student details
            student_response = self.supabase.table("user").select("*").eq(
                "id", args["student_id"]
            ).execute()

            if not student_response.data:
                raise Exception("Student not found")

            student = student_response.data[0]
            letter_type = args["letter_type"]

            # Generate letter content based on type
            letter_templates = {
                "enrollment": f"This is to certify that {student['name']} is enrolled in our programme.",
                "completion": f"This certifies that {student['name']} has successfully completed the programme.",
                "attendance": f"This confirms {student['name']}'s attendance record.",
                "reference": f"This is a reference letter for {student['name']}.",
                "visa_support": f"This letter supports {student['name']}'s visa application.",
            }

            letter_content = args.get("custom_text", letter_templates.get(letter_type, ""))

            # Create letter record
            letter_data = {
                "student_id": args["student_id"],
                "letter_type": letter_type,
                "content": letter_content,
                "issued_date": datetime.utcnow().date().isoformat(),
                "issued_by": context.user_id,
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("letter").insert(letter_data).execute()

            if not response.data:
                raise Exception("Failed to create letter")

            return {
                "success": True,
                "letter_id": response.data[0]["id"],
                "letter_type": letter_type,
                "message": f"{letter_type.replace('_', ' ').title()} letter issued",
                "letter": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error issuing letter: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _approve_deferral(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Approve or reject deferral request."""
        try:
            # Get deferral request
            request_response = self.supabase.table("deferral_request").select("*").eq(
                "id", args["deferral_request_id"]
            ).execute()

            if not request_response.data:
                raise Exception("Deferral request not found")

            request = request_response.data[0]

            # Update request
            update_data = {
                "status": "approved" if args["approved"] else "rejected",
                "reviewed_by": context.user_id,
                "reviewed_at": datetime.utcnow().isoformat(),
                "notes": args.get("notes", ""),
            }

            if args["approved"] and "new_start_date" in args:
                update_data["new_start_date"] = args["new_start_date"]

            response = self.supabase.table("deferral_request").update(update_data).eq(
                "id", args["deferral_request_id"]
            ).execute()

            # If approved, update booking
            if args["approved"] and "new_start_date" in args:
                self.supabase.table("booking").update({
                    "start_date": args["new_start_date"],
                    "deferred": True,
                }).eq("id", request["booking_id"]).execute()

            status_text = "approved" if args["approved"] else "rejected"

            return {
                "success": True,
                "message": f"Deferral request {status_text}",
                "approved": args["approved"],
                "deferral_request": response.data[0] if response.data else None,
            }

        except Exception as e:
            logger.error(f"Error approving deferral: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _award_certificate(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Award completion certificate."""
        try:
            # Create certificate record
            certificate_data = {
                "student_id": args["student_id"],
                "programme_id": args["programme_id"],
                "completion_date": args["completion_date"],
                "grade": args.get("grade", ""),
                "achievements": args.get("achievements", []),
                "certificate_number": f"CERT-{datetime.utcnow().strftime('%Y%m%d')}-{args['student_id'][:8]}",
                "issued_by": context.user_id,
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("certificate").insert(certificate_data).execute()

            if not response.data:
                raise Exception("Failed to create certificate")

            certificate = response.data[0]

            # TODO: Generate PDF certificate
            # This would integrate with PDF generation library

            return {
                "success": True,
                "certificate_id": certificate["id"],
                "certificate_number": certificate["certificate_number"],
                "message": "Certificate awarded successfully",
                "certificate": certificate,
            }

        except Exception as e:
            logger.error(f"Error awarding certificate: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _track_visa_status(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Track visa application status."""
        try:
            # Update or create visa status
            visa_data = {
                "student_id": args["student_id"],
                "status": args["visa_status"],
                "visa_expiry": args.get("visa_expiry"),
                "notes": args.get("notes", ""),
                "updated_by": context.user_id,
                "updated_at": datetime.utcnow().isoformat(),
                "tenant_id": context.tenant_id,
            }

            # Check if visa record exists
            existing = self.supabase.table("visa_status").select("id").eq(
                "student_id", args["student_id"]
            ).execute()

            if existing.data:
                response = self.supabase.table("visa_status").update(visa_data).eq(
                    "student_id", args["student_id"]
                ).execute()
            else:
                response = self.supabase.table("visa_status").insert(visa_data).execute()

            if not response.data:
                raise Exception("Failed to update visa status")

            return {
                "success": True,
                "visa_status": args["visa_status"],
                "message": f"Visa status updated to {args['visa_status']}",
                "visa_record": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error tracking visa status: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _record_pastoral_note(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Record pastoral care note."""
        try:
            note_data = {
                "student_id": args["student_id"],
                "category": args["category"],
                "content": args["content"],
                "action_required": args.get("action_required", False),
                "followup_date": args.get("followup_date"),
                "confidential": True,
                "recorded_by": context.user_id,
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("pastoral_note").insert(note_data).execute()

            if not response.data:
                raise Exception("Failed to record pastoral note")

            return {
                "success": True,
                "note_id": response.data[0]["id"],
                "message": "Pastoral note recorded",
                "action_required": args.get("action_required", False),
            }

        except Exception as e:
            logger.error(f"Error recording pastoral note: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    # Resource Handlers

    async def _get_hosts_resource(self, context: AuthContext) -> str:
        """Get host families resource."""
        try:
            response = self.supabase.table("host").select("*").eq(
                "tenant_id", context.tenant_id
            ).eq("active", True).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching hosts resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    async def _get_placements_resource(self, context: AuthContext) -> str:
        """Get accommodation placements resource."""
        try:
            response = self.supabase.table("accommodation_allocation").select(
                "*, student:student_id(name), host:host_id(name)"
            ).eq("status", "active").eq("tenant_id", context.tenant_id).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching placements resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    # Prompt Handlers

    async def _letter_template_prompt(
        self, args: Dict[str, Any], context: AuthContext
    ) -> list:
        """Generate letter template prompt."""
        try:
            letter_type = args["letter_type"]
            student_id = args["student_id"]

            # Fetch student details
            student_response = self.supabase.table("user").select("*").eq(
                "id", student_id
            ).execute()

            student = student_response.data[0] if student_response.data else {}

            return [
                {
                    "role": "system",
                    "content": "You are a professional administrative assistant drafting official letters."
                },
                {
                    "role": "user",
                    "content": f"Draft a {letter_type.replace('_', ' ')} letter for:\n"
                               f"Student: {student.get('name', 'N/A')}\n"
                               f"Email: {student.get('email', 'N/A')}\n"
                               f"Use formal, professional language."
                }
            ]
        except Exception as e:
            logger.error(f"Error generating letter template prompt: {str(e)}", exc_info=True)
            return [{"role": "user", "content": f"Error: {str(e)}"}]
