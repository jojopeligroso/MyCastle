/**
 * MCP Health Check API
 * GET /api/mcp/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPHostInstance } from '@/lib/mcp/init';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const host = getMCPHostInstance();

    const health = await host.healthCheck();

    return NextResponse.json(
      {
        success: true,
        data: health,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[MCP Health API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
