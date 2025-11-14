"""Academic Operations MCP Server - 10 tools for academic management."""
import logging
from typing import Any, Dict, List
from datetime import datetime, timedelta
import json

from supabase import create_client

from ..base import BaseMCPServer
from ..types import AuthContext, ToolInputSchema
from ...config import settings

logger = logging.getLogger(__name__)


class AcademicMCP(BaseMCPServer):
    """Academic Operations MCP Server implementing 10 academic tools."""

    def __init__(self):
        """Initialize Academic MCP."""
        super().__init__(
            name="academic-mcp",
            version="1.0.0",
            scope="academic:*"
        )
        self.supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

    async def initialize(self) -> None:
        """Initialize Academic MCP server."""
        await self._register_tools()
        await self._register_resources()
        await self._register_prompts()

        self._initialized = True
        logger.info(f"Academic MCP initialized with {self.tool_count} tools")

    async def shutdown(self) -> None:
        """Shutdown Academic MCP server."""
        self._initialized = False
        logger.info("Academic MCP shutdown complete")

    async def _register_tools(self) -> None:
        """Register all 10 academic tools."""

        # Tool 1: create_programme
        self.register_tool(
            name="create_programme",
            description="Define a new academic programme (e.g., General English, IELTS Prep)",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "duration_weeks": {"type": "integer", "minimum": 1},
                    "price_per_week": {"type": "number", "minimum": 0},
                    "cefr_level_min": {"type": "string", "enum": ["A1", "A2", "B1", "B2", "C1", "C2"]},
                    "cefr_level_max": {"type": "string", "enum": ["A1", "A2", "B1", "B2", "C1", "C2"]},
                },
                required=["name", "description", "duration_weeks", "price_per_week"],
            ),
            handler=self._create_programme,
        )

        # Tool 2: create_course
        self.register_tool(
            name="create_course",
            description="Define a course within a programme",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "programme_id": {"type": "string", "format": "uuid"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "cefr_level": {"type": "string", "enum": ["A1", "A2", "B1", "B2", "C1", "C2"]},
                    "hours_per_week": {"type": "integer", "minimum": 1},
                },
                required=["programme_id", "name", "cefr_level", "hours_per_week"],
            ),
            handler=self._create_course,
        )

        # Tool 3: map_cefr_level
        self.register_tool(
            name="map_cefr_level",
            description="Map a course to a CEFR level with descriptors",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "course_id": {"type": "string", "format": "uuid"},
                    "cefr_level": {"type": "string", "enum": ["A1", "A2", "B1", "B2", "C1", "C2"]},
                    "descriptors": {"type": "array", "items": {"type": "string"}},
                },
                required=["course_id", "cefr_level"],
            ),
            handler=self._map_cefr_level,
        )

        # Tool 4: schedule_class
        self.register_tool(
            name="schedule_class",
            description="Create a class schedule for a course",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "course_id": {"type": "string", "format": "uuid"},
                    "name": {"type": "string"},
                    "start_date": {"type": "string", "format": "date"},
                    "end_date": {"type": "string", "format": "date"},
                    "max_students": {"type": "integer", "minimum": 1},
                    "schedule": {"type": "object"},  # Days/times
                },
                required=["course_id", "name", "start_date", "end_date", "max_students"],
            ),
            handler=self._schedule_class,
        )

        # Tool 5: assign_teacher
        self.register_tool(
            name="assign_teacher",
            description="Assign a teacher to a class",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "class_id": {"type": "string", "format": "uuid"},
                    "teacher_id": {"type": "string", "format": "uuid"},
                    "role": {"type": "string", "enum": ["lead", "assistant"]},
                },
                required=["class_id", "teacher_id"],
            ),
            handler=self._assign_teacher,
        )

        # Tool 6: allocate_room
        self.register_tool(
            name="allocate_room",
            description="Assign a classroom to a session",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "session_id": {"type": "string", "format": "uuid"},
                    "room_id": {"type": "string", "format": "uuid"},
                },
                required=["session_id", "room_id"],
            ),
            handler=self._allocate_room,
        )

        # Tool 7: register_lesson_template
        self.register_tool(
            name="register_lesson_template",
            description="Save a reusable lesson template",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "name": {"type": "string"},
                    "cefr_level": {"type": "string", "enum": ["A1", "A2", "B1", "B2", "C1", "C2"]},
                    "objectives": {"type": "array", "items": {"type": "string"}},
                    "materials": {"type": "array", "items": {"type": "string"}},
                    "activities": {"type": "array", "items": {"type": "object"}},
                    "duration_minutes": {"type": "integer"},
                },
                required=["name", "cefr_level", "objectives"],
            ),
            handler=self._register_lesson_template,
        )

        # Tool 8: approve_lesson_plan
        self.register_tool(
            name="approve_lesson_plan",
            description="Admin approval workflow for lesson plans",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "lesson_plan_id": {"type": "string", "format": "uuid"},
                    "approved": {"type": "boolean"},
                    "feedback": {"type": "string"},
                },
                required=["lesson_plan_id", "approved"],
            ),
            handler=self._approve_lesson_plan,
        )

        # Tool 9: link_cefr_descriptor
        self.register_tool(
            name="link_cefr_descriptor",
            description="Link official CEFR descriptor to a course objective",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "course_id": {"type": "string", "format": "uuid"},
                    "descriptor_id": {"type": "string"},
                    "category": {"type": "string", "enum": ["listening", "reading", "writing", "speaking"]},
                },
                required=["course_id", "descriptor_id", "category"],
            ),
            handler=self._link_cefr_descriptor,
        )

        # Tool 10: publish_materials
        self.register_tool(
            name="publish_materials",
            description="Publish course materials to students",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "class_id": {"type": "string", "format": "uuid"},
                    "material_ids": {"type": "array", "items": {"type": "string", "format": "uuid"}},
                    "publish_date": {"type": "string", "format": "date"},
                },
                required=["class_id", "material_ids"],
            ),
            handler=self._publish_materials,
        )

    async def _register_resources(self) -> None:
        """Register academic resources."""

        self.register_resource(
            uri="mycastle://academic/programmes",
            name="Programmes",
            description="List of all academic programmes",
            handler=self._get_programmes_resource,
        )

        self.register_resource(
            uri="mycastle://academic/courses",
            name="Courses",
            description="List of all courses",
            handler=self._get_courses_resource,
        )

        self.register_resource(
            uri="mycastle://academic/cefr-descriptors",
            name="CEFR Descriptors",
            description="Official CEFR descriptors database",
            handler=self._get_cefr_descriptors_resource,
        )

    async def _register_prompts(self) -> None:
        """Register academic prompts."""

        self.register_prompt(
            name="academic:curriculum_design",
            description="AI prompt for designing curriculum",
            arguments=[
                {"name": "cefr_level", "description": "CEFR level", "required": True}
            ],
            handler=self._curriculum_design_prompt,
        )

    # Tool Handlers

    async def _create_programme(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Create a new academic programme."""
        try:
            programme_data = {
                "name": args["name"],
                "description": args["description"],
                "duration_weeks": args["duration_weeks"],
                "price_per_week": args["price_per_week"],
                "cefr_level_min": args.get("cefr_level_min"),
                "cefr_level_max": args.get("cefr_level_max"),
                "active": True,
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("programme").insert(programme_data).execute()

            if not response.data:
                raise Exception("Failed to create programme")

            return {
                "success": True,
                "programme_id": response.data[0]["id"],
                "message": f"Programme '{args['name']}' created successfully",
                "programme": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error creating programme: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _create_course(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Create a course within a programme."""
        try:
            course_data = {
                "programme_id": args["programme_id"],
                "name": args["name"],
                "description": args.get("description", ""),
                "cefr_level": args["cefr_level"],
                "hours_per_week": args["hours_per_week"],
                "active": True,
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("course").insert(course_data).execute()

            if not response.data:
                raise Exception("Failed to create course")

            return {
                "success": True,
                "course_id": response.data[0]["id"],
                "message": f"Course '{args['name']}' created successfully",
                "course": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error creating course: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _map_cefr_level(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Map a course to a CEFR level."""
        try:
            # Update course CEFR level
            update_data = {
                "cefr_level": args["cefr_level"],
                "cefr_descriptors": args.get("descriptors", []),
                "updated_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("course").update(update_data).eq(
                "id", args["course_id"]
            ).eq("tenant_id", context.tenant_id).execute()

            if not response.data:
                raise Exception("Course not found or update failed")

            return {
                "success": True,
                "message": f"Course mapped to CEFR level {args['cefr_level']}",
                "course": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error mapping CEFR level: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _schedule_class(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Schedule a class for a course."""
        try:
            class_data = {
                "course_id": args["course_id"],
                "name": args["name"],
                "start_date": args["start_date"],
                "end_date": args["end_date"],
                "max_students": args["max_students"],
                "schedule": args.get("schedule", {}),
                "status": "scheduled",
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("class").insert(class_data).execute()

            if not response.data:
                raise Exception("Failed to create class")

            return {
                "success": True,
                "class_id": response.data[0]["id"],
                "message": f"Class '{args['name']}' scheduled successfully",
                "class": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error scheduling class: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _assign_teacher(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Assign a teacher to a class."""
        try:
            assignment_data = {
                "class_id": args["class_id"],
                "teacher_id": args["teacher_id"],
                "role": args.get("role", "lead"),
                "tenant_id": context.tenant_id,
                "assigned_by": context.user_id,
                "assigned_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("class_teacher").insert(assignment_data).execute()

            if not response.data:
                raise Exception("Failed to assign teacher")

            return {
                "success": True,
                "message": "Teacher assigned successfully",
                "assignment": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error assigning teacher: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _allocate_room(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Allocate a room to a session."""
        try:
            # Check room availability
            conflicts_response = self.supabase.table("session").select("id").eq(
                "room_id", args["room_id"]
            ).eq("session_id", args["session_id"]).execute()

            if conflicts_response.data:
                return {
                    "success": False,
                    "error": "Room is already allocated for this time slot",
                }

            # Allocate room
            update_data = {
                "room_id": args["room_id"],
                "updated_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("session").update(update_data).eq(
                "id", args["session_id"]
            ).execute()

            if not response.data:
                raise Exception("Session not found or update failed")

            return {
                "success": True,
                "message": "Room allocated successfully",
                "session": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error allocating room: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _register_lesson_template(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Register a lesson template."""
        try:
            template_data = {
                "name": args["name"],
                "cefr_level": args["cefr_level"],
                "objectives": args["objectives"],
                "materials": args.get("materials", []),
                "activities": args.get("activities", []),
                "duration_minutes": args.get("duration_minutes", 60),
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("lesson_template").insert(template_data).execute()

            if not response.data:
                raise Exception("Failed to create lesson template")

            return {
                "success": True,
                "template_id": response.data[0]["id"],
                "message": f"Lesson template '{args['name']}' registered successfully",
                "template": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error registering lesson template: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _approve_lesson_plan(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Approve or reject a lesson plan."""
        try:
            update_data = {
                "approved": args["approved"],
                "approval_feedback": args.get("feedback", ""),
                "approved_by": context.user_id,
                "approved_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("lesson_plan").update(update_data).eq(
                "id", args["lesson_plan_id"]
            ).execute()

            if not response.data:
                raise Exception("Lesson plan not found or update failed")

            status = "approved" if args["approved"] else "rejected"

            return {
                "success": True,
                "message": f"Lesson plan {status}",
                "lesson_plan": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error approving lesson plan: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _link_cefr_descriptor(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Link a CEFR descriptor to a course."""
        try:
            link_data = {
                "course_id": args["course_id"],
                "descriptor_id": args["descriptor_id"],
                "category": args["category"],
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("course_cefr_descriptor").insert(link_data).execute()

            if not response.data:
                raise Exception("Failed to link CEFR descriptor")

            return {
                "success": True,
                "message": f"CEFR descriptor linked to course ({args['category']})",
                "link": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error linking CEFR descriptor: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _publish_materials(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Publish materials to a class."""
        try:
            publish_date = args.get("publish_date", datetime.utcnow().date().isoformat())
            published_count = 0

            for material_id in args["material_ids"]:
                publication_data = {
                    "class_id": args["class_id"],
                    "material_id": material_id,
                    "publish_date": publish_date,
                    "published_by": context.user_id,
                    "published_at": datetime.utcnow().isoformat(),
                }

                response = self.supabase.table("class_material").insert(publication_data).execute()

                if response.data:
                    published_count += 1

            return {
                "success": True,
                "published_count": published_count,
                "total_materials": len(args["material_ids"]),
                "message": f"Published {published_count} materials to class",
            }

        except Exception as e:
            logger.error(f"Error publishing materials: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    # Resource Handlers

    async def _get_programmes_resource(self, context: AuthContext) -> str:
        """Get programmes resource."""
        try:
            response = self.supabase.table("programme").select("*").eq(
                "tenant_id", context.tenant_id
            ).eq("active", True).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching programmes resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    async def _get_courses_resource(self, context: AuthContext) -> str:
        """Get courses resource."""
        try:
            response = self.supabase.table("course").select(
                "*, programme:programme_id(*)"
            ).eq("tenant_id", context.tenant_id).eq("active", True).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching courses resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    async def _get_cefr_descriptors_resource(self, context: AuthContext) -> str:
        """Get CEFR descriptors resource."""
        try:
            # Mock CEFR descriptors (in production, this would be a database table)
            descriptors = {
                "A1": {
                    "listening": ["Can understand familiar words and very basic phrases"],
                    "speaking": ["Can use simple phrases and sentences"],
                },
                "A2": {
                    "listening": ["Can understand phrases and frequent vocabulary"],
                    "speaking": ["Can communicate in simple and routine tasks"],
                },
                "B1": {
                    "listening": ["Can understand the main points of clear standard input"],
                    "speaking": ["Can describe experiences and events"],
                },
                "B2": {
                    "listening": ["Can understand extended speech and lectures"],
                    "speaking": ["Can interact with a degree of fluency"],
                },
                "C1": {
                    "listening": ["Can understand extended speech with ease"],
                    "speaking": ["Can express ideas fluently and spontaneously"],
                },
                "C2": {
                    "listening": ["Can understand virtually everything heard"],
                    "speaking": ["Can express themselves spontaneously, fluently and precisely"],
                },
            }

            return json.dumps(descriptors)
        except Exception as e:
            logger.error(f"Error fetching CEFR descriptors: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    # Prompt Handlers

    async def _curriculum_design_prompt(
        self, args: Dict[str, Any], context: AuthContext
    ) -> list:
        """Generate curriculum design prompt."""
        try:
            cefr_level = args["cefr_level"]

            return [
                {
                    "role": "system",
                    "content": "You are an expert ESL curriculum designer."
                },
                {
                    "role": "user",
                    "content": f"Design a curriculum for CEFR level {cefr_level}. "
                               f"Include learning objectives, activities, and assessment methods."
                }
            ]
        except Exception as e:
            logger.error(f"Error generating curriculum design prompt: {str(e)}", exc_info=True)
            return [{"role": "user", "content": f"Error: {str(e)}"}]
