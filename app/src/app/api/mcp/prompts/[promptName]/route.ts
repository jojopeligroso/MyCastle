/**
 * MCP Prompts API - Get prompt templates via HTTP
 * GET /api/mcp/prompts/[promptName]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPHostInstance } from '@/lib/mcp/init';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ promptName: string }> }
): Promise<NextResponse> {
  try {
    const { promptName } = await params;

    const host = getMCPHostInstance();

    // Verify session
    const session = await host.verifyAndCreateSession();

    // Get prompt
    const response = await host.getPrompt(promptName, session);

    if (response.success) {
      return NextResponse.json(response, { status: 200 });
    } else {
      const statusCode = response.error?.code === 'UNAUTHORIZED' ? 401 :
                         response.error?.code === 'FORBIDDEN' ? 403 :
                         response.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;

      return NextResponse.json(response, { status: statusCode });
    }
  } catch (error) {
    console.error('[MCP Prompts API] Error:', error);

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
