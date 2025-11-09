/**
 * MCP Chat API - Main conversation endpoint
 * POST /api/mcp/chat
 *
 * T-020: MCP Host Service - Chat endpoint for full conversation flow
 *
 * This endpoint handles the complete conversation flow:
 * 1. User sends message
 * 2. Host verifies session and routes to appropriate MCP servers
 * 3. LLM Coordinator calls OpenAI with tools
 * 4. Tools are executed via MCP Host
 * 5. Final response is returned to UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPHostInstance } from '@/lib/mcp/init';
import { getLLMCoordinator } from '@/lib/mcp/llm/LLMCoordinator';
import { z } from 'zod';

/**
 * Request schema
 */
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  includeResources: z.array(z.string()).optional(),
});

/**
 * POST /api/mcp/chat
 * Send a message and get AI response with tool execution
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();
    const validation = ChatRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { message, conversationId, includeResources } = validation.data;

    // Get MCP Host and create/verify session
    const host = getMCPHostInstance();
    const session = await host.verifyAndCreateSession();

    console.log(`[MCP Chat API] User ${session.userId} (${session.role}): "${message}"`);

    // Get LLM Coordinator
    const llmCoordinator = getLLMCoordinator(host);

    // Optionally aggregate resource context
    let contextSummary: string | undefined;
    if (includeResources && includeResources.length > 0) {
      const context = await llmCoordinator.aggregateResourceContext(session, includeResources);
      contextSummary = `Loaded ${context.items.length} context items from resources`;
      console.log(`[MCP Chat API] ${contextSummary}`);
    }

    // Send message to LLM Coordinator
    const response = await llmCoordinator.chat(message, session, conversationId);

    console.log(`[MCP Chat API] Response generated with ${response.toolCalls?.length || 0} tool calls`);

    // Return response
    return NextResponse.json(
      {
        success: true,
        data: {
          message: response.message,
          toolCalls: response.toolCalls?.map(tc => ({
            tool: tc.name,
            arguments: tc.arguments,
            // Don't expose full result to client, just confirmation
            executed: true,
          })),
          contextSummary,
          metadata: {
            totalTokens: response.totalTokens,
            finishReason: response.finishReason,
            session: {
              userId: session.userId,
              role: session.role,
              conversationId: conversationId || session.sessionId,
            },
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[MCP Chat API] Error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

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

/**
 * DELETE /api/mcp/chat
 * Clear conversation history
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'conversationId query parameter required',
          },
        },
        { status: 400 }
      );
    }

    // Get MCP Host and verify session
    const host = getMCPHostInstance();
    await host.verifyAndCreateSession();

    // Clear history
    const llmCoordinator = getLLMCoordinator(host);
    llmCoordinator.clearHistory(conversationId);

    console.log(`[MCP Chat API] Cleared conversation history: ${conversationId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Conversation history cleared',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[MCP Chat API] Error:', error);

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

/**
 * GET /api/mcp/chat
 * Get conversation history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'conversationId query parameter required',
          },
        },
        { status: 400 }
      );
    }

    // Get MCP Host and verify session
    const host = getMCPHostInstance();
    await host.verifyAndCreateSession();

    // Get history
    const llmCoordinator = getLLMCoordinator(host);
    const history = llmCoordinator.getHistory(conversationId);

    return NextResponse.json(
      {
        success: true,
        data: {
          conversationId,
          messages: history,
          messageCount: history.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[MCP Chat API] Error:', error);

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
