"""MCP servers."""
from .finance import FinanceMCP
from .academic import AcademicMCP
from .attendance import AttendanceMCP
from .student_services import StudentServicesMCP
from .operations import OperationsMCP
from .student import StudentMCP

__all__ = [
    "FinanceMCP",
    "AcademicMCP",
    "AttendanceMCP",
    "StudentServicesMCP",
    "OperationsMCP",
    "StudentMCP",
]
