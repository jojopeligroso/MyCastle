/**
 * Admin MCP Chat API Route
 * Orchestrates Admin MCP with LLM integration
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { mcpManager } from '@/lib/mcp-client-manager';
import { contextAggregator } from '@/lib/context-aggregator';
import { toolRouter } from '@/lib/tool-router';
import { verifyJWT, extractJWT } from '@/lib/auth';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

/**
 * POST /api/chat/admin
 * Admin chat endpoint with MCP orchestration
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = extractJWT(authHeader || '');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }

    const user = await verifyJWT(token);

    // 2. Verify user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log(`[Chat] Admin request from ${user.email}: "${message}"`);

    // 4. Get Admin MCP client
    const client = await mcpManager.getClient('admin');

    // 5. Aggregate context from Admin MCP
    const context = await contextAggregator.aggregateContext(
      client,
      user,
      message
    );

    const contextString = contextAggregator.buildContextString(context);

    // 6. Get available tools from Admin MCP
    const toolSchemas = await toolRouter.getAllToolSchemas(user);

    // 7. Build system prompt
    const systemPrompt = `You are an AI assistant for the ESL Learning Platform with access to administrative operations.

You can help with:
- User management (create, update, manage users and roles)
- Class management (create, schedule, manage classes)
- Attendance tracking and reporting
- Programme and course management
- Generating reports and exports

Current User: ${user.email} (Admin)
Tenant: ${user.tenant_id}

${contextString}

When the user requests an action:
1. Use the appropriate tool from your available tools
2. Provide clear confirmation of actions taken
3. If you need more information, ask specific questions

Be professional, helpful, and accurate.`;

    // 8. Call LLM with tools
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ],
      tools: toolSchemas.map((schema) => ({
        type: 'function',
        function: {
          name: schema.name,
          description: schema.description,
          parameters: schema.inputSchema,
        },
      })),
      tool_choice: 'auto',
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0].message;

    // 9. Handle tool calls if any
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(
        `[Chat] LLM requested ${assistantMessage.tool_calls.length} tool call(s)`
      );

      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[Chat] Executing tool: ${toolName}`);

        const result = await toolRouter.executeTool(
          { name: toolName, arguments: toolArgs },
          user
        );

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify(result),
        });
      }

      // 10. Send tool results back to LLM for final response
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
          assistantMessage,
          ...toolResults,
        ],
        temperature: 0.7,
      });

      const finalMessage = finalCompletion.choices[0].message;

      return NextResponse.json({
        message: finalMessage.content,
        toolCalls: assistantMessage.tool_calls.map((tc) => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        toolResults,
      });
    }

    // 11. Return response (no tools called)
    return NextResponse.json({
      message: assistantMessage.content,
    });
  } catch (error: any) {
    console.error('[Chat] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/admin
 * Get available tools and server status
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = extractJWT(authHeader || '');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }

    const user = await verifyJWT(token);

    // Verify user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get MCP status
    const mcpStatus = mcpManager.getStatus();

    // Get available tools
    const availableTools = await toolRouter.listAvailableTools(user);

    return NextResponse.json({
      status: 'ready',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      mcp: mcpStatus,
      tools: {
        available: availableTools,
        count: availableTools.length,
      },
    });
  } catch (error: any) {
    console.error('[Chat] Status check error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
