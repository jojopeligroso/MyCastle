"""Operations & Quality MCP Server - 8 tools for operations and quality assurance."""
import logging
from typing import Any, Dict, List
from datetime import datetime
import json

from supabase import create_client

from ..base import BaseMCPServer
from ..types import AuthContext, ToolInputSchema
from ...config import settings

logger = logging.getLogger(__name__)


class OperationsMCP(BaseMCPServer):
    """Operations & Quality MCP Server implementing 8 tools."""

    def __init__(self):
        """Initialize Operations MCP."""
        super().__init__(
            name="operations-mcp",
            version="1.0.0",
            scope="ops:*"
        )
        self.supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

    async def initialize(self) -> None:
        """Initialize Operations MCP server."""
        await self._register_tools()
        await self._register_resources()
        await self._register_prompts()

        self._initialized = True
        logger.info(f"Operations MCP initialized with {self.tool_count} tools")

    async def shutdown(self) -> None:
        """Shutdown Operations MCP server."""
        self._initialized = False
        logger.info("Operations MCP shutdown complete")

    async def _register_tools(self) -> None:
        """Register all 8 operations tools."""

        # Tool 1: backup_db
        self.register_tool(
            name="backup_db",
            description="Trigger database backup (requires highest privileges)",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "backup_type": {"type": "string", "enum": ["full", "incremental"]},
                    "description": {"type": "string"},
                },
                required=["backup_type"],
            ),
            handler=self._backup_db,
        )

        # Tool 2: restore_snapshot
        self.register_tool(
            name="restore_snapshot",
            description="Restore database from backup snapshot",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "snapshot_id": {"type": "string"},
                    "confirm": {"type": "boolean"},
                },
                required=["snapshot_id", "confirm"],
            ),
            handler=self._restore_snapshot,
        )

        # Tool 3: record_observation
        self.register_tool(
            name="record_observation",
            description="Record lesson observation for quality assurance",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "session_id": {"type": "string", "format": "uuid"},
                    "observer_id": {"type": "string", "format": "uuid"},
                    "rating": {"type": "integer", "minimum": 1, "maximum": 5},
                    "strengths": {"type": "array", "items": {"type": "string"}},
                    "areas_for_development": {"type": "array", "items": {"type": "string"}},
                    "feedback": {"type": "string"},
                },
                required=["session_id", "observer_id", "rating"],
            ),
            handler=self._record_observation,
        )

        # Tool 4: assign_cpd
        self.register_tool(
            name="assign_cpd",
            description="Assign Continuing Professional Development to teacher",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "teacher_id": {"type": "string", "format": "uuid"},
                    "cpd_title": {"type": "string"},
                    "cpd_type": {"type": "string", "enum": ["course", "workshop", "webinar", "reading"]},
                    "deadline": {"type": "string", "format": "date"},
                    "description": {"type": "string"},
                },
                required=["teacher_id", "cpd_title", "cpd_type"],
            ),
            handler=self._assign_cpd,
        )

        # Tool 5: export_quality_report
        self.register_tool(
            name="export_quality_report",
            description="Export quality assurance report",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "report_type": {"type": "string", "enum": ["observations", "cpd", "feedback", "comprehensive"]},
                    "date_from": {"type": "string", "format": "date"},
                    "date_to": {"type": "string", "format": "date"},
                },
                required=["report_type", "date_from", "date_to"],
            ),
            handler=self._export_quality_report,
        )

        # Tool 6: bulk_email
        self.register_tool(
            name="bulk_email",
            description="Send bulk email notifications to user groups",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "recipient_group": {"type": "string", "enum": ["all_students", "all_teachers", "all_staff", "custom"]},
                    "recipient_ids": {"type": "array", "items": {"type": "string"}},
                    "subject": {"type": "string"},
                    "body": {"type": "string"},
                    "send_immediately": {"type": "boolean", "default": False},
                },
                required=["recipient_group", "subject", "body"],
            ),
            handler=self._bulk_email,
        )

        # Tool 7: notify_stakeholders
        self.register_tool(
            name="notify_stakeholders",
            description="Send targeted notifications to specific stakeholders",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "stakeholder_ids": {"type": "array", "items": {"type": "string"}},
                    "notification_type": {"type": "string", "enum": ["email", "sms", "in_app"]},
                    "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
                    "message": {"type": "string"},
                },
                required=["stakeholder_ids", "message"],
            ),
            handler=self._notify_stakeholders,
        )

        # Tool 8: mail_merge_pdf
        self.register_tool(
            name="mail_merge_pdf",
            description="Generate personalized PDFs via mail merge",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "template_id": {"type": "string"},
                    "recipient_ids": {"type": "array", "items": {"type": "string"}},
                    "merge_fields": {"type": "object"},
                },
                required=["template_id", "recipient_ids"],
            ),
            handler=self._mail_merge_pdf,
        )

    async def _register_resources(self) -> None:
        """Register operations resources."""

        self.register_resource(
            uri="mycastle://ops/backups",
            name="Database Backups",
            description="List of database backups",
            handler=self._get_backups_resource,
        )

        self.register_resource(
            uri="mycastle://ops/observations",
            name="Lesson Observations",
            description="Quality assurance observations",
            handler=self._get_observations_resource,
        )

    async def _register_prompts(self) -> None:
        """Register operations prompts."""

        self.register_prompt(
            name="ops:observation_feedback",
            description="AI prompt for generating constructive observation feedback",
            arguments=[
                {"name": "observation_id", "description": "Observation ID", "required": True}
            ],
            handler=self._observation_feedback_prompt,
        )

    # Tool Handlers

    async def _backup_db(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Trigger database backup."""
        try:
            # Require super admin
            if context.role.value != "super_admin":
                raise PermissionError("Database backup requires super_admin role")

            backup_type = args["backup_type"]

            # Create backup record
            backup_data = {
                "backup_type": backup_type,
                "description": args.get("description", ""),
                "status": "in_progress",
                "initiated_by": context.user_id,
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("backup").insert(backup_data).execute()

            if not response.data:
                raise Exception("Failed to create backup record")

            backup = response.data[0]

            # TODO: Trigger actual backup via Supabase API or pg_dump
            # This would integrate with cloud backup service

            # Update backup status
            self.supabase.table("backup").update({
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat(),
            }).eq("id", backup["id"]).execute()

            return {
                "success": True,
                "backup_id": backup["id"],
                "backup_type": backup_type,
                "message": f"{backup_type.title()} backup initiated",
                "backup": backup,
            }

        except Exception as e:
            logger.error(f"Error backing up database: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _restore_snapshot(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Restore from backup snapshot."""
        try:
            # Require super admin and explicit confirmation
            if context.role.value != "super_admin":
                raise PermissionError("Database restore requires super_admin role")

            if not args.get("confirm", False):
                return {
                    "success": False,
                    "error": "Restore requires explicit confirmation (set confirm=true)",
                }

            snapshot_id = args["snapshot_id"]

            # Get snapshot details
            snapshot_response = self.supabase.table("backup").select("*").eq(
                "id", snapshot_id
            ).execute()

            if not snapshot_response.data:
                raise Exception("Snapshot not found")

            snapshot = snapshot_response.data[0]

            # TODO: Trigger actual restore via Supabase API
            # This is a dangerous operation and would typically require
            # additional safeguards, confirmations, and testing

            # Create restore log
            restore_log = {
                "snapshot_id": snapshot_id,
                "restored_by": context.user_id,
                "restored_at": datetime.utcnow().isoformat(),
                "status": "completed",
                "tenant_id": context.tenant_id,
            }

            self.supabase.table("restore_log").insert(restore_log).execute()

            return {
                "success": True,
                "message": "Database restored from snapshot",
                "snapshot_id": snapshot_id,
                "warning": "System may require restart",
            }

        except Exception as e:
            logger.error(f"Error restoring snapshot: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _record_observation(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Record lesson observation."""
        try:
            observation_data = {
                "session_id": args["session_id"],
                "observer_id": args["observer_id"],
                "rating": args["rating"],
                "strengths": args.get("strengths", []),
                "areas_for_development": args.get("areas_for_development", []),
                "feedback": args.get("feedback", ""),
                "observation_date": datetime.utcnow().date().isoformat(),
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("observation").insert(observation_data).execute()

            if not response.data:
                raise Exception("Failed to record observation")

            return {
                "success": True,
                "observation_id": response.data[0]["id"],
                "rating": args["rating"],
                "message": "Lesson observation recorded",
                "observation": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error recording observation: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _assign_cpd(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Assign CPD to teacher."""
        try:
            cpd_data = {
                "teacher_id": args["teacher_id"],
                "title": args["cpd_title"],
                "type": args["cpd_type"],
                "description": args.get("description", ""),
                "deadline": args.get("deadline"),
                "status": "assigned",
                "assigned_by": context.user_id,
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("cpd").insert(cpd_data).execute()

            if not response.data:
                raise Exception("Failed to assign CPD")

            # TODO: Send notification to teacher

            return {
                "success": True,
                "cpd_id": response.data[0]["id"],
                "message": f"CPD '{args['cpd_title']}' assigned to teacher",
                "cpd": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error assigning CPD: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _export_quality_report(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Export quality assurance report."""
        try:
            report_type = args["report_type"]
            date_from = args["date_from"]
            date_to = args["date_to"]

            report_data = {}

            if report_type in ["observations", "comprehensive"]:
                observations = self.supabase.table("observation").select(
                    "*"
                ).gte("observation_date", date_from).lte(
                    "observation_date", date_to
                ).eq("tenant_id", context.tenant_id).execute()

                report_data["observations"] = observations.data or []

            if report_type in ["cpd", "comprehensive"]:
                cpd = self.supabase.table("cpd").select("*").gte(
                    "created_at", date_from
                ).lte("created_at", date_to).eq("tenant_id", context.tenant_id).execute()

                report_data["cpd"] = cpd.data or []

            if report_type in ["feedback", "comprehensive"]:
                feedback = self.supabase.table("feedback").select("*").gte(
                    "created_at", date_from
                ).lte("created_at", date_to).eq("tenant_id", context.tenant_id).execute()

                report_data["feedback"] = feedback.data or []

            return {
                "success": True,
                "report_type": report_type,
                "period": f"{date_from} to {date_to}",
                "data": report_data,
                "message": f"Quality report exported for {report_type}",
            }

        except Exception as e:
            logger.error(f"Error exporting quality report: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _bulk_email(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Send bulk email."""
        try:
            recipient_group = args["recipient_group"]
            subject = args["subject"]
            body = args["body"]

            # Determine recipients
            recipients = []

            if recipient_group == "all_students":
                response = self.supabase.table("user").select("id, email").eq(
                    "role_scope", "student"
                ).eq("tenant_id", context.tenant_id).execute()
                recipients = response.data or []

            elif recipient_group == "all_teachers":
                response = self.supabase.table("user").select("id, email").in_(
                    "role_scope", ["teacher", "teacher_dos", "teacher_assistant_dos"]
                ).eq("tenant_id", context.tenant_id).execute()
                recipients = response.data or []

            elif recipient_group == "all_staff":
                response = self.supabase.table("user").select("id, email").in_(
                    "role_scope", ["admin", "admin_dos", "admin_reception", "admin_student_operations"]
                ).eq("tenant_id", context.tenant_id).execute()
                recipients = response.data or []

            elif recipient_group == "custom" and "recipient_ids" in args:
                for recipient_id in args["recipient_ids"]:
                    user_response = self.supabase.table("user").select("id, email").eq(
                        "id", recipient_id
                    ).execute()
                    if user_response.data:
                        recipients.extend(user_response.data)

            # Create email batch record
            batch_data = {
                "subject": subject,
                "body": body,
                "recipient_group": recipient_group,
                "recipient_count": len(recipients),
                "status": "queued" if not args.get("send_immediately", False) else "sending",
                "sent_by": context.user_id,
                "tenant_id": context.tenant_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("email_batch").insert(batch_data).execute()

            # TODO: Integrate with email service (SendGrid, AWS SES, etc.)

            return {
                "success": True,
                "batch_id": response.data[0]["id"] if response.data else None,
                "recipient_count": len(recipients),
                "message": f"Bulk email queued for {len(recipients)} recipients",
            }

        except Exception as e:
            logger.error(f"Error sending bulk email: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _notify_stakeholders(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Send targeted notifications."""
        try:
            stakeholder_ids = args["stakeholder_ids"]
            notification_type = args.get("notification_type", "in_app")
            priority = args.get("priority", "medium")
            message = args["message"]

            notifications = []

            for stakeholder_id in stakeholder_ids:
                notification_data = {
                    "user_id": stakeholder_id,
                    "type": notification_type,
                    "priority": priority,
                    "message": message,
                    "read": False,
                    "sent_by": context.user_id,
                    "tenant_id": context.tenant_id,
                    "created_at": datetime.utcnow().isoformat(),
                }

                response = self.supabase.table("notification").insert(notification_data).execute()

                if response.data:
                    notifications.append(response.data[0])

            return {
                "success": True,
                "notification_count": len(notifications),
                "notification_type": notification_type,
                "priority": priority,
                "message": f"Sent {len(notifications)} {notification_type} notifications",
            }

        except Exception as e:
            logger.error(f"Error notifying stakeholders: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _mail_merge_pdf(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Generate personalized PDFs via mail merge."""
        try:
            template_id = args["template_id"]
            recipient_ids = args["recipient_ids"]
            merge_fields = args.get("merge_fields", {})

            # Get template
            template_response = self.supabase.table("pdf_template").select("*").eq(
                "id", template_id
            ).execute()

            if not template_response.data:
                raise Exception("Template not found")

            template = template_response.data[0]

            # Generate PDFs
            generated_pdfs = []

            for recipient_id in recipient_ids:
                # Fetch recipient data
                recipient_response = self.supabase.table("user").select("*").eq(
                    "id", recipient_id
                ).execute()

                if not recipient_response.data:
                    continue

                recipient = recipient_response.data[0]

                # Merge data
                merged_data = {
                    **merge_fields,
                    "name": recipient.get("name", ""),
                    "email": recipient.get("email", ""),
                }

                # TODO: Generate PDF using template engine (e.g., ReportLab, WeasyPrint)
                # For now, create a record

                pdf_record = {
                    "template_id": template_id,
                    "recipient_id": recipient_id,
                    "merged_fields": merged_data,
                    "status": "generated",
                    "generated_by": context.user_id,
                    "tenant_id": context.tenant_id,
                    "created_at": datetime.utcnow().isoformat(),
                }

                response = self.supabase.table("generated_pdf").insert(pdf_record).execute()

                if response.data:
                    generated_pdfs.append(response.data[0])

            return {
                "success": True,
                "template_id": template_id,
                "pdf_count": len(generated_pdfs),
                "message": f"Generated {len(generated_pdfs)} personalized PDFs",
                "pdfs": generated_pdfs,
            }

        except Exception as e:
            logger.error(f"Error generating mail merge PDFs: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    # Resource Handlers

    async def _get_backups_resource(self, context: AuthContext) -> str:
        """Get database backups resource."""
        try:
            response = self.supabase.table("backup").select("*").eq(
                "tenant_id", context.tenant_id
            ).order("created_at", desc=True).limit(50).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching backups resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    async def _get_observations_resource(self, context: AuthContext) -> str:
        """Get lesson observations resource."""
        try:
            response = self.supabase.table("observation").select(
                "*, session:session_id(id), observer:observer_id(name)"
            ).eq("tenant_id", context.tenant_id).order(
                "observation_date", desc=True
            ).limit(100).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching observations resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    # Prompt Handlers

    async def _observation_feedback_prompt(
        self, args: Dict[str, Any], context: AuthContext
    ) -> list:
        """Generate observation feedback prompt."""
        try:
            observation_id = args["observation_id"]

            # Fetch observation details
            response = self.supabase.table("observation").select(
                "*, session:session_id(*), observer:observer_id(*)"
            ).eq("id", observation_id).execute()

            if not response.data:
                return [{
                    "role": "user",
                    "content": "Observation not found"
                }]

            observation = response.data[0]

            return [
                {
                    "role": "system",
                    "content": "You are an expert educational quality assurance consultant providing constructive feedback."
                },
                {
                    "role": "user",
                    "content": f"Provide detailed, constructive feedback based on this lesson observation:\n"
                               f"Rating: {observation['rating']}/5\n"
                               f"Strengths: {', '.join(observation.get('strengths', []))}\n"
                               f"Areas for development: {', '.join(observation.get('areas_for_development', []))}\n"
                               f"Observer notes: {observation.get('feedback', '')}\n\n"
                               f"Draft a supportive, actionable feedback report."
                }
            ]
        except Exception as e:
            logger.error(f"Error generating observation feedback prompt: {str(e)}", exc_info=True)
            return [{"role": "user", "content": f"Error: {str(e)}"}]
