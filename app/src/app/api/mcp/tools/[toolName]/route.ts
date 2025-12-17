/**
 * MCP Tools API - Execute tools via HTTP
 * POST /api/mcp/tools/[toolName]
 *
 * Updated to use proper MCP protocol with stdio transport
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPHostInstance } from '@/lib/mcp/init';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> }
): Promise<NextResponse> {
  try {
    const { toolName } = await params;
    const input = await request.json();

    const host = await getMCPHostInstance();

    // Verify session via Supabase
    const supabase = await createClient();
    const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();

    if (error || !supabaseSession) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        },
        { status: 401 }
      );
    }

    // Create MCP session
    const session = await host.createSession({
      sub: supabaseSession.user.id,
      email: supabaseSession.user.email,
      role: (supabaseSession.user.app_metadata?.role as string) || 'student',
      tenant_id: (supabaseSession.user.app_metadata?.tenant_id as string) || 'default',
      scopes: supabaseSession.user.app_metadata?.scopes,
    });

    // Execute tool
    const response = await host.executeTool(toolName, input, session);

    if (response.success) {
      return NextResponse.json(response, { status: 200 });
    } else {
      const statusCode = response.error?.code === 'UNAUTHORIZED' ? 401 :
        response.error?.code === 'FORBIDDEN' ? 403 :
          response.error?.code === 'TOOL_NOT_FOUND' ? 404 :
            response.error?.code === 'INVALID_INPUT' ? 400 : 500;

      return NextResponse.json(response, { status: statusCode });
    }
  } catch (error) {
    console.error('[MCP Tools API] Error:', error);

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
