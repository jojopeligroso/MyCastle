/**
 * MCP Initialization - Register all MCP servers with the host
 */

import { getMCPHost } from './host/MCPHost';
import { teacherMCPConfig } from './servers/teacher/TeacherMCP';

/**
 * Initialize all MCP servers
 * Called on application startup
 */
export function initializeMCP(): void {
  const host = getMCPHost();

  console.log('[MCP] Initializing MCP servers...');

  // Register Teacher MCP Server
  host.registerServer(teacherMCPConfig);

  // Future servers can be registered here:
  // host.registerServer(adminMCPConfig);
  // host.registerServer(studentMCPConfig);
  // host.registerServer(identityMCPConfig);

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
