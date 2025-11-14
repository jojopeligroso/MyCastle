/**
 * MCP Capabilities API - List available tools, resources, and prompts
 * GET /api/mcp/capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPHostInstance } from '@/lib/mcp/init';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const host = getMCPHostInstance();

    // Verify session
    const session = await host.verifyAndCreateSession();

    // Get capabilities
    const tools = host.listTools(session);
    const resources = host.listResources(session);
    const servers = host.listServers();

    // Extract prompts from servers
    const prompts = servers.flatMap(server =>
      (server.prompts || []).filter(prompt =>
        session.scopes.some(scope => prompt.requiredScopes.includes(scope))
      )
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          session: {
            userId: session.userId,
            role: session.role,
            scopes: session.scopes,
          },
          capabilities: {
            tools: tools.map(t => ({
              name: t.name,
              description: t.description,
              requiredScopes: t.requiredScopes,
            })),
            resources: resources.map(r => ({
              uri: r.uri,
              name: r.name,
              description: r.description,
              requiredScopes: r.requiredScopes,
              mimeType: r.mimeType,
            })),
            prompts: prompts.map(p => ({
              name: p.name,
              description: p.description,
              variables: p.variables,
              requiredScopes: p.requiredScopes,
            })),
          },
          servers: servers.map(s => ({
            name: s.name,
            version: s.version,
            scopePrefix: s.scopePrefix,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[MCP Capabilities API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
