/**
 * MCP Capabilities API - List available tools, resources, and prompts
 * GET /api/mcp/capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPHostInstance } from '@/lib/mcp/init';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const host = await getMCPHostInstance();

    // Verify session via Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Create MCP session
    const session = await host.createSession({
      sub: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'student',
      tenant_id: user.user_metadata?.tenant_id || 'default',
    });

    // Get capabilities
    const tools = await host.listTools(session);
    const resources = await host.listResources(session);
    const prompts = await host.listPrompts(session);

    // Get servers status
    const health = await host.healthCheck();

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
            tools: tools.map((t: unknown) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
            resources: resources.map((r: unknown) => ({
              uri: r.uri,
              name: r.name,
              description: r.description,
              mimeType: r.mimeType,
            })),
            prompts: prompts.map((p: unknown) => ({
              name: p.name,
              description: p.description,
              arguments: p.arguments,
            })),
          },
          servers: health.servers.map(s => ({
            name: s.name,
            status: s.status,
            connected: s.connected,
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
