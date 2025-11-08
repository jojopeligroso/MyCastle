/**
 * MCP Resources API - Fetch resources via HTTP
 * GET /api/mcp/resources?uri=mycastle://teacher/timetable
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPHostInstance } from '@/lib/mcp/init';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uri = searchParams.get('uri');

    if (!uri) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required parameter: uri',
          },
        },
        { status: 400 }
      );
    }

    const host = getMCPHostInstance();

    // Verify session
    const session = await host.verifyAndCreateSession();

    // Extract params from search params (excluding 'uri')
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'uri') {
        params[key] = value;
      }
    });

    // Fetch resource
    const response = await host.fetchResource(uri, session, params);

    if (response.success) {
      return NextResponse.json(response, { status: 200 });
    } else {
      const statusCode = response.error?.code === 'UNAUTHORIZED' ? 401 :
                         response.error?.code === 'FORBIDDEN' ? 403 :
                         response.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;

      return NextResponse.json(response, { status: statusCode });
    }
  } catch (error) {
    console.error('[MCP Resources API] Error:', error);

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
