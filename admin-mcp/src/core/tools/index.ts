/**
 * MCP Tools Module
 *
 * This module exports all MCP tools for the Admin MCP server.
 * Each tool provides specific administrative functionality with proper
 * scope checking, audit logging, and error handling.
 */

// Export all tool implementations
export * from './create-user.js';
export * from './update-user.js';
export * from './assign-role.js';
export * from './create-class.js';
export * from './assign-teacher.js';
export * from './plan-roster.js';
export * from './record-attendance.js';
export * from './correct-attendance.js';
export * from './adjust-enrolment.js';
export * from './gen-register-csv.js';
export * from './ar-snapshot.js';
export * from './raise-refund-req.js';
export * from './add-accommodation.js';
export * from './vendor-status.js';
export * from './compliance-pack.js';
export * from './search-directory.js';
export * from './publish-ops-report.js';

// Import metadata for registry
import { createUserMetadata } from './create-user.js';
import { updateUserMetadata } from './update-user.js';
import { assignRoleMetadata } from './assign-role.js';
import { createClassMetadata } from './create-class.js';
import { assignTeacherMetadata } from './assign-teacher.js';
import { planRosterMetadata } from './plan-roster.js';
import { recordAttendanceMetadata } from './record-attendance.js';
import { correctAttendanceMetadata } from './correct-attendance.js';
import { adjustEnrolmentMetadata } from './adjust-enrolment.js';
import { genRegisterCsvMetadata } from './gen-register-csv.js';
import { arSnapshotMetadata } from './ar-snapshot.js';
import { raiseRefundReqMetadata } from './raise-refund-req.js';
import { addAccommodationMetadata } from './add-accommodation.js';
import { vendorStatusMetadata } from './vendor-status.js';
import { compliancePackMetadata } from './compliance-pack.js';
import { searchDirectoryMetadata } from './search-directory.js';
import { publishOpsReportMetadata } from './publish-ops-report.js';

import type { MCPTool } from '../../types/index.js';

/**
 * Registry of all available MCP tools
 * This is used by the MCP server to expose tools to clients
 */
export const toolRegistry: MCPTool[] = [
  createUserMetadata,
  updateUserMetadata,
  assignRoleMetadata,
  createClassMetadata,
  assignTeacherMetadata,
  planRosterMetadata,
  recordAttendanceMetadata,
  correctAttendanceMetadata,
  adjustEnrolmentMetadata,
  genRegisterCsvMetadata,
  arSnapshotMetadata,
  raiseRefundReqMetadata,
  addAccommodationMetadata,
  vendorStatusMetadata,
  compliancePackMetadata,
  searchDirectoryMetadata,
  publishOpsReportMetadata,
];

/**
 * Get tool metadata by name
 *
 * @param name - Tool name
 * @returns Tool metadata or undefined if not found
 */
export function getToolMetadata(name: string): MCPTool | undefined {
  return toolRegistry.find(tool => tool.name === name);
}

/**
 * Get all tool names
 *
 * @returns Array of tool names
 */
export function getToolNames(): string[] {
  return toolRegistry.map(tool => tool.name);
}

/**
 * Check if a tool exists
 *
 * @param name - Tool name
 * @returns True if tool exists
 */
export function hasToolNamed(name: string): boolean {
  return toolRegistry.some(tool => tool.name === name);
}
