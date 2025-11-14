"""Student MCP Server - 10 tools for student portal and learning features."""
import logging
from typing import Any, Dict, List
from datetime import datetime, timedelta
import json

from supabase import create_client

from ..base import BaseMCPServer
from ..types import AuthContext, ToolInputSchema
from ...config import settings

logger = logging.getLogger(__name__)


class StudentMCP(BaseMCPServer):
    """Student MCP Server implementing 10 tools."""

    def __init__(self):
        """Initialize Student MCP."""
        super().__init__(
            name="student-mcp",
            version="1.0.0",
            scope="student:*"
        )
        self.supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

    async def initialize(self) -> None:
        """Initialize Student MCP server."""
        await self._register_tools()
        await self._register_resources()
        await self._register_prompts()

        self._initialized = True
        logger.info(f"Student MCP initialized with {self.tool_count} tools")

    async def shutdown(self) -> None:
        """Shutdown Student MCP server."""
        self._initialized = False
        logger.info("Student MCP shutdown complete")

    async def _register_tools(self) -> None:
        """Register all 10 student tools."""

        # Tool 1: view_timetable
        self.register_tool(
            name="view_timetable",
            description="View student's weekly class timetable",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "week_offset": {"type": "integer", "default": 0},
                },
            ),
            handler=self._view_timetable,
        )

        # Tool 2: download_materials
        self.register_tool(
            name="download_materials",
            description="Download course materials for a class",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "class_id": {"type": "string", "format": "uuid"},
                },
                required=["class_id"],
            ),
            handler=self._download_materials,
        )

        # Tool 3: submit_homework
        self.register_tool(
            name="submit_homework",
            description="Submit homework assignment",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "assignment_id": {"type": "string", "format": "uuid"},
                    "submission_text": {"type": "string"},
                    "file_urls": {"type": "array", "items": {"type": "string"}},
                },
                required=["assignment_id"],
            ),
            handler=self._submit_homework,
        )

        # Tool 4: view_grades
        self.register_tool(
            name="view_grades",
            description="View grades and feedback for assignments",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "class_id": {"type": "string", "format": "uuid"},
                },
            ),
            handler=self._view_grades,
        )

        # Tool 5: ask_tutor
        self.register_tool(
            name="ask_tutor",
            description="AI tutor for explanations and practice exercises",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "question": {"type": "string"},
                    "context": {"type": "string"},
                    "cefr_level": {"type": "string", "enum": ["A1", "A2", "B1", "B2", "C1", "C2"]},
                },
                required=["question"],
            ),
            handler=self._ask_tutor,
        )

        # Tool 6: track_progress
        self.register_tool(
            name="track_progress",
            description="View learning progress and statistics",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "programme_id": {"type": "string", "format": "uuid"},
                },
            ),
            handler=self._track_progress,
        )

        # Tool 7: attendance_summary
        self.register_tool(
            name="attendance_summary",
            description="View attendance summary and percentage",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "weeks": {"type": "integer", "default": 4},
                },
            ),
            handler=self._attendance_summary,
        )

        # Tool 8: request_letter
        self.register_tool(
            name="request_letter",
            description="Request official letter (not certificates)",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "letter_type": {"type": "string", "enum": ["attendance", "enrollment", "reference"]},
                    "reason": {"type": "string"},
                },
                required=["letter_type", "reason"],
            ),
            handler=self._request_letter,
        )

        # Tool 9: raise_support_request
        self.register_tool(
            name="raise_support_request",
            description="Raise support ticket for issues or questions",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "category": {"type": "string", "enum": ["academic", "technical", "accommodation", "administrative", "other"]},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                    "subject": {"type": "string"},
                    "description": {"type": "string"},
                },
                required=["category", "subject", "description"],
            ),
            handler=self._raise_support_request,
        )

        # Tool 10: view_invoice
        self.register_tool(
            name="view_invoice",
            description="View invoice details including installments",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "invoice_id": {"type": "string", "format": "uuid"},
                },
            ),
            handler=self._view_invoice,
        )

    async def _register_resources(self) -> None:
        """Register student resources."""

        self.register_resource(
            uri="mycastle://student/timetable",
            name="My Timetable",
            description="Student's personal timetable",
            handler=self._get_timetable_resource,
        )

        self.register_resource(
            uri="mycastle://student/materials",
            name="Course Materials",
            description="Available course materials",
            handler=self._get_materials_resource,
        )

        self.register_resource(
            uri="mycastle://student/progress",
            name="Learning Progress",
            description="Student's learning progress",
            handler=self._get_progress_resource,
        )

    async def _register_prompts(self) -> None:
        """Register student prompts."""

        self.register_prompt(
            name="student:study_plan",
            description="AI prompt for generating personalized study plan",
            arguments=[
                {"name": "cefr_level", "description": "Current CEFR level", "required": True},
                {"name": "goals", "description": "Learning goals", "required": False}
            ],
            handler=self._study_plan_prompt,
        )

    # Tool Handlers

    async def _view_timetable(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """View student timetable."""
        try:
            week_offset = args.get("week_offset", 0)

            # Calculate week start and end
            today = datetime.utcnow().date()
            week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
            week_end = week_start + timedelta(days=6)

            # Fetch student's enrollments
            enrollments_response = self.supabase.table("enrollment").select(
                "*, class:class_id(*), session:session_id(*)"
            ).eq("student_id", context.user_id).eq("active", True).execute()

            enrollments = enrollments_response.data or []

            # Filter sessions for the week
            timetable = []
            for enrollment in enrollments:
                if enrollment.get("session"):
                    session_date_str = enrollment["session"].get("date", "")
                    if session_date_str:
                        session_date = datetime.fromisoformat(session_date_str).date()
                        if week_start <= session_date <= week_end:
                            timetable.append({
                                "date": session_date.isoformat(),
                                "day": session_date.strftime("%A"),
                                "class": enrollment.get("class", {}).get("name", ""),
                                "session": enrollment["session"],
                            })

            # Sort by date and time
            timetable.sort(key=lambda x: x["date"])

            return {
                "success": True,
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "session_count": len(timetable),
                "timetable": timetable,
            }

        except Exception as e:
            logger.error(f"Error viewing timetable: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _download_materials(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Download course materials."""
        try:
            class_id = args["class_id"]

            # Check student is enrolled in class
            enrollment_check = self.supabase.table("enrollment").select("id").eq(
                "student_id", context.user_id
            ).eq("class_id", class_id).eq("active", True).execute()

            if not enrollment_check.data:
                return {
                    "success": False,
                    "error": "Not enrolled in this class",
                }

            # Fetch published materials
            materials_response = self.supabase.table("class_material").select(
                "*, material:material_id(*)"
            ).eq("class_id", class_id).lte(
                "publish_date", datetime.utcnow().date().isoformat()
            ).execute()

            materials = materials_response.data or []

            return {
                "success": True,
                "class_id": class_id,
                "material_count": len(materials),
                "materials": materials,
            }

        except Exception as e:
            logger.error(f"Error downloading materials: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _submit_homework(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Submit homework assignment."""
        try:
            assignment_id = args["assignment_id"]

            # Check assignment exists and deadline
            assignment_response = self.supabase.table("assignment").select("*").eq(
                "id", assignment_id
            ).execute()

            if not assignment_response.data:
                raise Exception("Assignment not found")

            assignment = assignment_response.data[0]

            # Check deadline
            if assignment.get("due_date"):
                due_date = datetime.fromisoformat(assignment["due_date"])
                if datetime.utcnow() > due_date:
                    return {
                        "success": False,
                        "error": "Assignment deadline has passed",
                        "late": True,
                    }

            # Create submission
            submission_data = {
                "assignment_id": assignment_id,
                "student_id": context.user_id,
                "submission_text": args.get("submission_text", ""),
                "file_urls": args.get("file_urls", []),
                "submitted_at": datetime.utcnow().isoformat(),
                "status": "submitted",
                "tenant_id": context.tenant_id,
            }

            response = self.supabase.table("submission").insert(submission_data).execute()

            if not response.data:
                raise Exception("Failed to submit homework")

            return {
                "success": True,
                "submission_id": response.data[0]["id"],
                "message": "Homework submitted successfully",
                "submission": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error submitting homework: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _view_grades(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """View grades and feedback."""
        try:
            filters = {"student_id": context.user_id}

            if "class_id" in args:
                filters["class_id"] = args["class_id"]

            # Fetch graded submissions
            submissions_response = self.supabase.table("submission").select(
                "*, assignment:assignment_id(*)"
            ).eq("student_id", context.user_id).not_.is_("grade", "null").execute()

            submissions = submissions_response.data or []

            # Calculate average grade
            grades = [s.get("grade", 0) for s in submissions if s.get("grade")]
            average_grade = sum(grades) / len(grades) if grades else 0

            return {
                "success": True,
                "submission_count": len(submissions),
                "average_grade": round(average_grade, 2),
                "submissions": submissions,
            }

        except Exception as e:
            logger.error(f"Error viewing grades: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _ask_tutor(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """AI tutor for learning support."""
        try:
            question = args["question"]
            context_text = args.get("context", "")
            cefr_level = args.get("cefr_level", "B1")

            # TODO: Integrate with OpenAI API for AI tutoring
            # For now, return a placeholder response

            tutor_response = {
                "question": question,
                "answer": "AI tutor feature coming soon. Your question has been logged.",
                "cefr_level": cefr_level,
                "suggestions": [
                    "Review your course materials",
                    "Practice with exercises",
                    "Ask your teacher for clarification"
                ],
            }

            # Log tutor interaction
            interaction_data = {
                "student_id": context.user_id,
                "question": question,
                "context": context_text,
                "cefr_level": cefr_level,
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            self.supabase.table("tutor_interaction").insert(interaction_data).execute()

            return {
                "success": True,
                "tutor_response": tutor_response,
            }

        except Exception as e:
            logger.error(f"Error with AI tutor: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _track_progress(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Track learning progress."""
        try:
            # Fetch student's submissions
            submissions_response = self.supabase.table("submission").select(
                "*, assignment:assignment_id(*)"
            ).eq("student_id", context.user_id).execute()

            submissions = submissions_response.data or []

            # Fetch attendance
            attendance_response = self.supabase.table("attendance").select("*").eq(
                "student_id", context.user_id
            ).execute()

            attendance_records = attendance_response.data or []

            # Calculate metrics
            total_assignments = len(submissions)
            graded_assignments = len([s for s in submissions if s.get("grade")])
            average_grade = sum([s.get("grade", 0) for s in submissions if s.get("grade")]) / graded_assignments if graded_assignments > 0 else 0

            total_sessions = len(attendance_records)
            present_count = sum(1 for a in attendance_records if a.get("status") in ["present", "late"])
            attendance_rate = (present_count / total_sessions * 100) if total_sessions > 0 else 0

            return {
                "success": True,
                "progress": {
                    "assignments": {
                        "total": total_assignments,
                        "graded": graded_assignments,
                        "average_grade": round(average_grade, 2),
                    },
                    "attendance": {
                        "total_sessions": total_sessions,
                        "present_count": present_count,
                        "attendance_rate": round(attendance_rate, 2),
                    },
                },
            }

        except Exception as e:
            logger.error(f"Error tracking progress: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _attendance_summary(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """View attendance summary."""
        try:
            weeks = args.get("weeks", 4)
            date_from = (datetime.utcnow() - timedelta(weeks=weeks)).date().isoformat()

            # Fetch attendance records
            response = self.supabase.table("attendance").select(
                "*, register:register_id(*)"
            ).eq("student_id", context.user_id).gte("recorded_at", date_from).execute()

            records = response.data or []

            # Calculate summary
            total_sessions = len(records)
            present = sum(1 for r in records if r.get("status") == "present")
            late = sum(1 for r in records if r.get("status") == "late")
            absent = sum(1 for r in records if r.get("status") == "absent")
            excused = sum(1 for r in records if r.get("status") == "excused")

            attendance_percentage = ((present + late) / total_sessions * 100) if total_sessions > 0 else 0

            return {
                "success": True,
                "period_weeks": weeks,
                "total_sessions": total_sessions,
                "summary": {
                    "present": present,
                    "late": late,
                    "absent": absent,
                    "excused": excused,
                },
                "attendance_percentage": round(attendance_percentage, 2),
                "records": records,
            }

        except Exception as e:
            logger.error(f"Error getting attendance summary: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _request_letter(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Request official letter."""
        try:
            letter_type = args["letter_type"]
            reason = args["reason"]

            # Create letter request
            request_data = {
                "student_id": context.user_id,
                "letter_type": letter_type,
                "reason": reason,
                "status": "pending",
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("letter_request").insert(request_data).execute()

            if not response.data:
                raise Exception("Failed to create letter request")

            return {
                "success": True,
                "request_id": response.data[0]["id"],
                "letter_type": letter_type,
                "message": "Letter request submitted. You will be notified when it's ready.",
            }

        except Exception as e:
            logger.error(f"Error requesting letter: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _raise_support_request(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Raise support ticket."""
        try:
            ticket_data = {
                "user_id": context.user_id,
                "category": args["category"],
                "priority": args.get("priority", "medium"),
                "subject": args["subject"],
                "description": args["description"],
                "status": "open",
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("support_ticket").insert(ticket_data).execute()

            if not response.data:
                raise Exception("Failed to create support ticket")

            return {
                "success": True,
                "ticket_id": response.data[0]["id"],
                "message": "Support ticket created. We'll get back to you soon.",
                "ticket": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error raising support request: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _view_invoice(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """View invoice details."""
        try:
            invoice_id = args.get("invoice_id")

            if invoice_id:
                # Fetch specific invoice
                response = self.supabase.table("invoice").select(
                    "*, booking:booking_id(*)"
                ).eq("id", invoice_id).eq("student_id", context.user_id).execute()
            else:
                # Fetch all student invoices
                response = self.supabase.table("invoice").select(
                    "*, booking:booking_id(*)"
                ).eq("student_id", context.user_id).execute()

            invoices = response.data or []

            # Calculate totals
            total_amount = sum(inv.get("amount", 0) for inv in invoices)
            paid_amount = sum(inv.get("paid_amount", 0) for inv in invoices)
            outstanding = total_amount - paid_amount

            return {
                "success": True,
                "invoice_count": len(invoices),
                "totals": {
                    "total_amount": total_amount,
                    "paid_amount": paid_amount,
                    "outstanding": outstanding,
                },
                "invoices": invoices,
            }

        except Exception as e:
            logger.error(f"Error viewing invoice: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    # Resource Handlers

    async def _get_timetable_resource(self, context: AuthContext) -> str:
        """Get timetable resource."""
        try:
            result = await self._view_timetable({}, context)
            return json.dumps(result)
        except Exception as e:
            logger.error(f"Error fetching timetable resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    async def _get_materials_resource(self, context: AuthContext) -> str:
        """Get course materials resource."""
        try:
            # Fetch all materials for student's classes
            enrollments_response = self.supabase.table("enrollment").select(
                "class_id"
            ).eq("student_id", context.user_id).eq("active", True).execute()

            class_ids = [e["class_id"] for e in (enrollments_response.data or [])]

            materials_response = self.supabase.table("class_material").select(
                "*, material:material_id(*), class:class_id(name)"
            ).in_("class_id", class_ids).lte(
                "publish_date", datetime.utcnow().date().isoformat()
            ).execute()

            return json.dumps(materials_response.data or [])
        except Exception as e:
            logger.error(f"Error fetching materials resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    async def _get_progress_resource(self, context: AuthContext) -> str:
        """Get learning progress resource."""
        try:
            result = await self._track_progress({}, context)
            return json.dumps(result)
        except Exception as e:
            logger.error(f"Error fetching progress resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    # Prompt Handlers

    async def _study_plan_prompt(
        self, args: Dict[str, Any], context: AuthContext
    ) -> list:
        """Generate study plan prompt."""
        try:
            cefr_level = args["cefr_level"]
            goals = args.get("goals", "general improvement")

            # Fetch student progress
            progress_result = await self._track_progress({}, context)

            return [
                {
                    "role": "system",
                    "content": "You are an expert ESL learning advisor creating personalized study plans."
                },
                {
                    "role": "user",
                    "content": f"Create a personalized study plan for:\n"
                               f"CEFR Level: {cefr_level}\n"
                               f"Goals: {goals}\n"
                               f"Current Progress: {json.dumps(progress_result.get('progress', {}), indent=2)}\n\n"
                               f"Provide a detailed weekly study plan with specific activities and time allocations."
                }
            ]
        except Exception as e:
            logger.error(f"Error generating study plan prompt: {str(e)}", exc_info=True)
            return [{"role": "user", "content": f"Error: {str(e)}"}]
