/**
 * MCP Initialization - Register all MCP servers with the host
 */

import { getMCPHost } from './host/MCPHost';
import { teacherMCPConfig } from './servers/teacher/TeacherMCP';
import { identityAccessMCPConfig } from './servers/identity/IdentityAccessMCP';

/**
 * Initialize all MCP servers
 * Called on application startup
 */
export function initializeMCP(): void {
  const host = getMCPHost();

  console.log('[MCP] Initializing MCP servers...');

  // Register v3.0 MCP Servers
  // Priority order: Identity first (foundation), then Teacher
  host.registerServer(identityAccessMCPConfig);
  host.registerServer(teacherMCPConfig);

  // Future servers to be registered:
  // host.registerServer(academicOperationsMCPConfig);
  // host.registerServer(attendanceComplianceMCPConfig);
  // host.registerServer(financeMCPConfig);
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
