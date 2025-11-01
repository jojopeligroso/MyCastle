/**
 * Admin MCP Tools Registry
 * Exports all available tools
 */

import { createUser } from './create-user.js';
import { assignRole } from './assign-role.js';
import { createClass } from './create-class.js';
import { enrollStudent } from './enroll-student.js';
import { markAttendance } from './mark-attendance.js';
import { listUsers } from './list-users.js';
import { listClasses } from './list-classes.js';
import { searchUsers } from './search-users.js';
import { generateExport } from './generate-export.js';
import { downloadExport } from './download-export.js';
import { getAttendanceSummary } from './get-attendance-summary.js';
import { createProgramme } from './create-programme.js';
import { createCourse } from './create-course.js';
import { assignCourseProgramme } from './assign-course-programme.js';

// Critical new tools
import { updateUser } from './update-user.js';
import { suspendUser } from './suspend-user.js';
import { assignTeacher } from './assign-teacher.js';
import { createSession } from './create-session.js';
import { correctAttendance } from './correct-attendance.js';

// Import & Data tools
import { importData } from './import-data.js';

/**
 * All available tools
 */
export const tools = {
  // Identity & Access (5 tools)
  'create-user': createUser,
  'assign-role': assignRole,
  'update-user': updateUser,
  'suspend-user': suspendUser,
  'list-users': listUsers,
  'search-users': searchUsers,

  // Academic Programs (3 tools)
  'create-programme': createProgramme,
  'create-course': createCourse,
  'assign-course-programme': assignCourseProgramme,

  // Class Management (3 tools)
  'create-class': createClass,
  'list-classes': listClasses,
  'assign-teacher': assignTeacher,

  // Scheduling (1 tool)
  'create-session': createSession,

  // Enrollment (1 tool)
  'enroll-student': enrollStudent,

  // Attendance (2 tools)
  'mark-attendance': markAttendance,
  'correct-attendance-admin': correctAttendance,

  // Reporting & Analytics (1 tool)
  'get-attendance-summary': getAttendanceSummary,

  // Export & Data (3 tools)
  'generate-export': generateExport,
  'download-export': downloadExport,
  'import-data': importData,
};

/**
 * Get all tool names
 */
export function getToolNames(): string[] {
  return Object.keys(tools);
}

/**
 * Get tool by name
 */
export function getTool(name: string) {
  return tools[name as keyof typeof tools];
}

/**
 * Get all tool definitions for MCP protocol
 */
export function getAllToolDefinitions() {
  return Object.values(tools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}
