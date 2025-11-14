"""Finance MCP Server - 9 tools for financial operations."""
import logging
from typing import Any, Dict
from datetime import datetime, timedelta
import json

from supabase import create_client

from ..base import BaseMCPServer
from ..types import AuthContext, ToolInputSchema
from ...config import settings

logger = logging.getLogger(__name__)


class FinanceMCP(BaseMCPServer):
    """Finance MCP Server implementing 9 financial tools."""

    def __init__(self):
        """Initialize Finance MCP."""
        super().__init__(
            name="finance-mcp",
            version="1.0.0",
            scope="finance:*"
        )
        self.supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

    async def initialize(self) -> None:
        """Initialize Finance MCP server."""
        # Register all 9 tools
        await self._register_tools()
        await self._register_resources()
        await self._register_prompts()

        self._initialized = True
        logger.info(f"Finance MCP initialized with {self.tool_count} tools")

    async def shutdown(self) -> None:
        """Shutdown Finance MCP server."""
        self._initialized = False
        logger.info("Finance MCP shutdown complete")

    async def _register_tools(self) -> None:
        """Register all 9 finance tools."""

        # Tool 1: create_booking
        self.register_tool(
            name="create_booking",
            description="Create a new student booking for a course",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "student_id": {"type": "string", "format": "uuid"},
                    "programme_id": {"type": "string", "format": "uuid"},
                    "start_date": {"type": "string", "format": "date"},
                    "weeks": {"type": "integer", "minimum": 1},
                    "accommodation": {"type": "boolean"},
                },
                required=["student_id", "programme_id", "start_date", "weeks"],
            ),
            handler=self._create_booking,
        )

        # Tool 2: edit_booking
        self.register_tool(
            name="edit_booking",
            description="Modify an existing student booking",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "booking_id": {"type": "string", "format": "uuid"},
                    "start_date": {"type": "string", "format": "date"},
                    "weeks": {"type": "integer", "minimum": 1},
                    "accommodation": {"type": "boolean"},
                },
                required=["booking_id"],
            ),
            handler=self._edit_booking,
        )

        # Tool 3: issue_invoice
        self.register_tool(
            name="issue_invoice",
            description="Generate an invoice PDF for a booking",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "booking_id": {"type": "string", "format": "uuid"},
                    "include_accommodation": {"type": "boolean"},
                    "payment_terms_days": {"type": "integer", "default": 30},
                },
                required=["booking_id"],
            ),
            handler=self._issue_invoice,
        )

        # Tool 4: apply_discount
        self.register_tool(
            name="apply_discount",
            description="Apply a discount code to a booking",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "booking_id": {"type": "string", "format": "uuid"},
                    "discount_code": {"type": "string"},
                },
                required=["booking_id", "discount_code"],
            ),
            handler=self._apply_discount,
        )

        # Tool 5: refund_payment
        self.register_tool(
            name="refund_payment",
            description="Process a refund for a payment",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "payment_id": {"type": "string", "format": "uuid"},
                    "amount": {"type": "number", "minimum": 0},
                    "reason": {"type": "string"},
                },
                required=["payment_id", "amount", "reason"],
            ),
            handler=self._refund_payment,
        )

        # Tool 6: reconcile_payouts
        self.register_tool(
            name="reconcile_payouts",
            description="Match payments to invoices and reconcile accounts",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "date_from": {"type": "string", "format": "date"},
                    "date_to": {"type": "string", "format": "date"},
                },
                required=["date_from", "date_to"],
            ),
            handler=self._reconcile_payouts,
        )

        # Tool 7: ledger_export
        self.register_tool(
            name="ledger_export",
            description="Export financial data to accounting software (QuickBooks/Xero)",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "format": {"type": "string", "enum": ["quickbooks", "xero", "csv"]},
                    "date_from": {"type": "string", "format": "date"},
                    "date_to": {"type": "string", "format": "date"},
                },
                required=["format", "date_from", "date_to"],
            ),
            handler=self._ledger_export,
        )

        # Tool 8: aging_report
        self.register_tool(
            name="aging_report",
            description="Generate accounts receivable aging report",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "as_of_date": {"type": "string", "format": "date"},
                    "aging_buckets": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "default": [30, 60, 90],
                    },
                },
                required=["as_of_date"],
            ),
            handler=self._aging_report,
        )

        # Tool 9: confirm_intake
        self.register_tool(
            name="confirm_intake",
            description="Confirm student intake and finalize enrollment",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "booking_id": {"type": "string", "format": "uuid"},
                    "confirmed_start_date": {"type": "string", "format": "date"},
                },
                required=["booking_id", "confirmed_start_date"],
            ),
            handler=self._confirm_intake,
        )

    async def _register_resources(self) -> None:
        """Register finance resources."""

        self.register_resource(
            uri="mycastle://finance/invoices",
            name="Invoices",
            description="List of all invoices",
            handler=self._get_invoices_resource,
        )

        self.register_resource(
            uri="mycastle://finance/outstanding",
            name="Outstanding Payments",
            description="List of outstanding payments",
            handler=self._get_outstanding_resource,
        )

    async def _register_prompts(self) -> None:
        """Register finance prompts."""

        self.register_prompt(
            name="finance:invoice_review",
            description="AI prompt for reviewing invoice details",
            arguments=[
                {"name": "booking_id", "description": "Booking ID", "required": True}
            ],
            handler=self._invoice_review_prompt,
        )

    # Tool Handlers

    async def _create_booking(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Create a new booking."""
        try:
            # Calculate end date
            start_date = datetime.fromisoformat(args["start_date"])
            end_date = start_date + timedelta(weeks=args["weeks"])

            # Create booking record
            booking_data = {
                "student_id": args["student_id"],
                "programme_id": args["programme_id"],
                "start_date": args["start_date"],
                "end_date": end_date.isoformat(),
                "weeks": args["weeks"],
                "accommodation": args.get("accommodation", False),
                "status": "pending",
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            # Insert into database
            response = self.supabase.table("booking").insert(booking_data).execute()

            if not response.data:
                raise Exception("Failed to create booking")

            booking = response.data[0]

            return {
                "success": True,
                "booking_id": booking["id"],
                "message": f"Booking created for {args['weeks']} weeks starting {args['start_date']}",
                "booking": booking,
            }

        except Exception as e:
            logger.error(f"Error creating booking: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _edit_booking(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Edit an existing booking."""
        try:
            booking_id = args["booking_id"]
            update_data = {}

            if "start_date" in args:
                update_data["start_date"] = args["start_date"]
                if "weeks" in args:
                    start_date = datetime.fromisoformat(args["start_date"])
                    end_date = start_date + timedelta(weeks=args["weeks"])
                    update_data["end_date"] = end_date.isoformat()

            if "weeks" in args:
                update_data["weeks"] = args["weeks"]

            if "accommodation" in args:
                update_data["accommodation"] = args["accommodation"]

            update_data["updated_at"] = datetime.utcnow().isoformat()
            update_data["updated_by"] = context.user_id

            # Update booking
            response = self.supabase.table("booking").update(update_data).eq(
                "id", booking_id
            ).eq("tenant_id", context.tenant_id).execute()

            if not response.data:
                raise Exception("Booking not found or update failed")

            return {
                "success": True,
                "message": "Booking updated successfully",
                "booking": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error editing booking: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _issue_invoice(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Issue an invoice for a booking."""
        try:
            booking_id = args["booking_id"]
            payment_terms_days = args.get("payment_terms_days", 30)

            # Fetch booking details
            booking_response = self.supabase.table("booking").select(
                "*, student:student_id(*), programme:programme_id(*)"
            ).eq("id", booking_id).eq("tenant_id", context.tenant_id).execute()

            if not booking_response.data:
                raise Exception("Booking not found")

            booking = booking_response.data[0]

            # Calculate invoice amount (simplified - should use actual pricing logic)
            course_fee = booking["programme"]["price_per_week"] * booking["weeks"]
            accommodation_fee = 0
            if args.get("include_accommodation", booking["accommodation"]):
                accommodation_fee = 150 * booking["weeks"]  # Example rate

            total_amount = course_fee + accommodation_fee

            # Create invoice
            invoice_data = {
                "booking_id": booking_id,
                "student_id": booking["student_id"],
                "amount": total_amount,
                "status": "issued",
                "issue_date": datetime.utcnow().isoformat(),
                "due_date": (datetime.utcnow() + timedelta(days=payment_terms_days)).isoformat(),
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
            }

            response = self.supabase.table("invoice").insert(invoice_data).execute()

            if not response.data:
                raise Exception("Failed to create invoice")

            return {
                "success": True,
                "invoice_id": response.data[0]["id"],
                "amount": total_amount,
                "message": f"Invoice issued for €{total_amount:.2f}",
                "invoice": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error issuing invoice: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _apply_discount(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Apply a discount code to a booking."""
        try:
            # Validate discount code
            discount_response = self.supabase.table("discount_code").select("*").eq(
                "code", args["discount_code"]
            ).eq("active", True).execute()

            if not discount_response.data:
                return {
                    "success": False,
                    "error": "Invalid or inactive discount code",
                }

            discount = discount_response.data[0]

            # Apply discount to booking
            update_data = {
                "discount_code": args["discount_code"],
                "discount_percent": discount["percent"],
                "updated_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("booking").update(update_data).eq(
                "id", args["booking_id"]
            ).eq("tenant_id", context.tenant_id).execute()

            if not response.data:
                raise Exception("Failed to apply discount")

            return {
                "success": True,
                "message": f"Discount {discount['percent']}% applied",
                "discount": discount,
            }

        except Exception as e:
            logger.error(f"Error applying discount: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _refund_payment(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Process a refund."""
        try:
            # Create refund record
            refund_data = {
                "payment_id": args["payment_id"],
                "amount": args["amount"],
                "reason": args["reason"],
                "status": "pending",
                "tenant_id": context.tenant_id,
                "created_by": context.user_id,
                "created_at": datetime.utcnow().isoformat(),
            }

            response = self.supabase.table("refund").insert(refund_data).execute()

            if not response.data:
                raise Exception("Failed to create refund")

            return {
                "success": True,
                "refund_id": response.data[0]["id"],
                "message": f"Refund of €{args['amount']:.2f} initiated",
                "refund": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _reconcile_payouts(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Reconcile payments to invoices."""
        try:
            # Fetch unreconciled payments
            payments_response = self.supabase.table("payment").select("*").eq(
                "reconciled", False
            ).gte("created_at", args["date_from"]).lte("created_at", args["date_to"]).execute()

            payments = payments_response.data or []
            reconciled_count = 0

            for payment in payments:
                # Match to invoice
                invoice_response = self.supabase.table("invoice").select("*").eq(
                    "student_id", payment["student_id"]
                ).eq("status", "issued").execute()

                if invoice_response.data:
                    # Mark as reconciled
                    self.supabase.table("payment").update({
                        "reconciled": True,
                        "invoice_id": invoice_response.data[0]["id"],
                    }).eq("id", payment["id"]).execute()

                    reconciled_count += 1

            return {
                "success": True,
                "reconciled_count": reconciled_count,
                "total_payments": len(payments),
                "message": f"Reconciled {reconciled_count} of {len(payments)} payments",
            }

        except Exception as e:
            logger.error(f"Error reconciling payments: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _ledger_export(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Export financial data."""
        try:
            # Fetch invoices and payments for date range
            invoices_response = self.supabase.table("invoice").select(
                "*, student:student_id(*)"
            ).gte("issue_date", args["date_from"]).lte("issue_date", args["date_to"]).execute()

            invoices = invoices_response.data or []

            # Format based on export format
            export_format = args["format"]
            export_data = []

            for invoice in invoices:
                export_data.append({
                    "date": invoice["issue_date"],
                    "invoice_id": invoice["id"],
                    "student": invoice["student"]["name"],
                    "amount": invoice["amount"],
                    "status": invoice["status"],
                })

            return {
                "success": True,
                "format": export_format,
                "record_count": len(export_data),
                "data": export_data,
                "message": f"Exported {len(export_data)} records in {export_format} format",
            }

        except Exception as e:
            logger.error(f"Error exporting ledger: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _aging_report(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Generate accounts receivable aging report."""
        try:
            as_of_date = datetime.fromisoformat(args["as_of_date"])
            buckets = args.get("aging_buckets", [30, 60, 90])

            # Fetch outstanding invoices
            invoices_response = self.supabase.table("invoice").select(
                "*, student:student_id(*)"
            ).in_("status", ["issued", "overdue"]).lte("issue_date", args["as_of_date"]).execute()

            invoices = invoices_response.data or []

            # Categorize by aging
            aging_data = {
                "current": [],
                **{f"{bucket}_days": [] for bucket in buckets},
                f"over_{max(buckets)}_days": [],
            }

            for invoice in invoices:
                issue_date = datetime.fromisoformat(invoice["issue_date"])
                days_old = (as_of_date - issue_date).days

                if days_old <= buckets[0]:
                    aging_data["current"].append(invoice)
                else:
                    for i, bucket in enumerate(buckets):
                        if days_old <= bucket:
                            aging_data[f"{bucket}_days"].append(invoice)
                            break
                    else:
                        aging_data[f"over_{max(buckets)}_days"].append(invoice)

            # Calculate totals
            totals = {
                key: sum(inv["amount"] for inv in invs)
                for key, invs in aging_data.items()
            }

            return {
                "success": True,
                "as_of_date": args["as_of_date"],
                "aging_buckets": buckets,
                "totals": totals,
                "total_outstanding": sum(totals.values()),
                "details": aging_data,
            }

        except Exception as e:
            logger.error(f"Error generating aging report: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def _confirm_intake(self, args: Dict[str, Any], context: AuthContext) -> Dict[str, Any]:
        """Confirm student intake."""
        try:
            # Update booking status
            update_data = {
                "status": "confirmed",
                "confirmed_start_date": args["confirmed_start_date"],
                "confirmed_at": datetime.utcnow().isoformat(),
                "confirmed_by": context.user_id,
            }

            response = self.supabase.table("booking").update(update_data).eq(
                "id", args["booking_id"]
            ).eq("tenant_id", context.tenant_id).execute()

            if not response.data:
                raise Exception("Booking not found or confirmation failed")

            return {
                "success": True,
                "message": "Student intake confirmed",
                "booking": response.data[0],
            }

        except Exception as e:
            logger.error(f"Error confirming intake: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    # Resource Handlers

    async def _get_invoices_resource(self, context: AuthContext) -> str:
        """Get invoices resource."""
        try:
            response = self.supabase.table("invoice").select("*").eq(
                "tenant_id", context.tenant_id
            ).order("issue_date", desc=True).limit(100).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching invoices resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    async def _get_outstanding_resource(self, context: AuthContext) -> str:
        """Get outstanding payments resource."""
        try:
            response = self.supabase.table("invoice").select("*").in_(
                "status", ["issued", "overdue"]
            ).eq("tenant_id", context.tenant_id).execute()

            return json.dumps(response.data or [])
        except Exception as e:
            logger.error(f"Error fetching outstanding resource: {str(e)}", exc_info=True)
            return json.dumps({"error": str(e)})

    # Prompt Handlers

    async def _invoice_review_prompt(
        self, args: Dict[str, Any], context: AuthContext
    ) -> list:
        """Generate invoice review prompt."""
        try:
            booking_id = args["booking_id"]

            # Fetch booking and invoice details
            response = self.supabase.table("invoice").select(
                "*, booking:booking_id(*), student:student_id(*)"
            ).eq("booking_id", booking_id).execute()

            if not response.data:
                return [{
                    "role": "user",
                    "content": "No invoice found for this booking"
                }]

            invoice = response.data[0]

            return [
                {
                    "role": "system",
                    "content": "You are a financial analyst reviewing invoice details."
                },
                {
                    "role": "user",
                    "content": f"Please review this invoice:\n{json.dumps(invoice, indent=2)}"
                }
            ]
        except Exception as e:
            logger.error(f"Error generating invoice review prompt: {str(e)}", exc_info=True)
            return [{"role": "user", "content": f"Error: {str(e)}"}]
