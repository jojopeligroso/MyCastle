"""MCP type definitions and models."""
from typing import Any, Dict, List, Literal, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class UserRole(str, Enum):
    """User roles in the system."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    ADMIN_DOS = "admin_dos"
    ADMIN_RECEPTION = "admin_reception"
    ADMIN_STUDENT_OPERATIONS = "admin_student_operations"
    ADMIN_SALES = "admin_sales"
    ADMIN_MARKETING = "admin_marketing"
    ADMIN_AGENT = "admin_agent"
    TEACHER = "teacher"
    TEACHER_DOS = "teacher_dos"
    TEACHER_ASSISTANT_DOS = "teacher_assistant_dos"
    STUDENT = "student"
    GUEST = "guest"


class Scope(str, Enum):
    """Authorization scopes."""
    IDENTITY_ALL = "identity:*"
    FINANCE_ALL = "finance:*"
    ACADEMIC_ALL = "academic:*"
    ATTENDANCE_ALL = "attendance:*"
    COMPLIANCE_ALL = "compliance:*"
    STUDENT_SERVICES_ALL = "student_services:*"
    OPS_ALL = "ops:*"
    QUALITY_ALL = "quality:*"
    TEACHER_ALL = "teacher:*"
    STUDENT_ALL = "student:*"


class AuthContext(BaseModel):
    """Authentication context for requests."""
    user_id: str
    tenant_id: str
    role: UserRole
    scopes: List[str]
    session_id: Optional[str] = None
    expires_at: Optional[datetime] = None

    def has_scope(self, scope: str) -> bool:
        """Check if user has a specific scope."""
        # Check for exact match or wildcard
        base_scope = scope.split(":")[0]
        return scope in self.scopes or f"{base_scope}:*" in self.scopes


class ToolInputSchema(BaseModel):
    """JSON Schema for tool input validation."""
    type: str = "object"
    properties: Dict[str, Any]
    required: List[str] = Field(default_factory=list)
    additionalProperties: bool = False


class Tool(BaseModel):
    """MCP Tool definition."""
    name: str
    description: str
    inputSchema: ToolInputSchema
    scope: str  # Required scope to execute this tool


class Resource(BaseModel):
    """MCP Resource definition."""
    uri: str
    name: str
    description: str
    mimeType: str = "application/json"
    scope: str  # Required scope to access this resource


class Prompt(BaseModel):
    """MCP Prompt template definition."""
    name: str
    description: str
    arguments: List[Dict[str, Any]] = Field(default_factory=list)
    scope: str  # Required scope to use this prompt


class ToolCallRequest(BaseModel):
    """Request to call a tool."""
    tool: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class ToolCallResponse(BaseModel):
    """Response from a tool call."""
    content: List[Dict[str, Any]]
    isError: bool = False


class ResourceRequest(BaseModel):
    """Request to fetch a resource."""
    uri: str


class ResourceResponse(BaseModel):
    """Response from fetching a resource."""
    contents: List[Dict[str, Any]]


class PromptRequest(BaseModel):
    """Request to get a prompt."""
    name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class PromptResponse(BaseModel):
    """Response from getting a prompt."""
    description: str
    messages: List[Dict[str, Any]]


class CapabilitiesResponse(BaseModel):
    """Response listing server capabilities."""
    tools: List[Tool]
    resources: List[Resource]
    prompts: List[Prompt]
    serverInfo: Dict[str, str]


class HealthResponse(BaseModel):
    """Health check response."""
    status: Literal["healthy", "unhealthy"]
    version: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
