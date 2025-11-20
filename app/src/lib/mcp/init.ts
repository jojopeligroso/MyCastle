/**
 * MCP Initialization - Register all MCP servers with the host
 */

import { getMCPHost } from './host/MCPHost';
import { teacherMCPConfig } from './servers/teacher/TeacherMCP';
import { identityAccessMCPConfig } from './servers/identity/IdentityAccessMCP';
import { financeMCPConfig } from './servers/finance/FinanceMCP';
import { academicOperationsMCPConfig } from './servers/academic/AcademicOperationsMCP';

/**
 * Initialize all MCP servers
 * Called on application startup
 */
export function initializeMCP(): void {
  const host = getMCPHost();

  console.log('[MCP] Initializing MCP servers...');

  // Register v3.0 MCP Servers
  // Priority order: Identity first (foundation), then domain-specific MCPs
  host.registerServer(identityAccessMCPConfig);
  host.registerServer(financeMCPConfig);
  host.registerServer(academicOperationsMCPConfig);
  host.registerServer(teacherMCPConfig);

  // Future servers to be registered:
  // host.registerServer(attendanceComplianceMCPConfig);
  // host.registerServer(studentServicesMCPConfig);
  // host.registerServer(operationsQualityMCPConfig);
  // host.registerServer(studentMCPConfig);

  console.log(`[MCP] Registered ${host.listServers().length} MCP servers`);
}

/**
 * Get initialized MCP Host instance
 */
export function getMCPHostInstance() {
  const host = getMCPHost();

  // Ensure servers are registered
  if (host.listServers().length === 0) {
    initializeMCP();
  }

  return host;
}
