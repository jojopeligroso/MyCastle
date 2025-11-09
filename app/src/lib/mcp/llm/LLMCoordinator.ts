/**
 * LLM Coordinator - Coordinates LLM requests with MCP context
 *
 * T-020: MCP Host Service - LLM Integration
 *
 * This module handles:
 * - Converting MCP tools to OpenAI function definitions
 * - Managing conversation history
 * - Calling LLM with tool context
 * - Parsing and routing tool calls back to MCP Host
 * - Aggregating results for final response
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { MCPHost } from '../host/MCPHost';
import { MCPSession, MCPTool, MCPResource, AggregatedContext } from '../types';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Conversation message
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

/**
 * LLM Response
 */
export interface LLMResponse {
  message: string;
  toolCalls?: Array<{
    name: string;
    arguments: unknown;
    result: unknown;
  }>;
  totalTokens?: number;
  finishReason?: string;
}

/**
 * LLM Coordinator
 */
export class LLMCoordinator {
  private openai: OpenAI;
  private host: MCPHost;
  private conversationHistory: Map<string, ConversationMessage[]> = new Map();

  constructor(host: MCPHost, openaiApiKey?: string) {
    this.host = host;
    this.openai = new OpenAI({
      apiKey: openaiApiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Convert MCP tool to OpenAI function definition
   */
  private toolToOpenAIFunction(tool: MCPTool): ChatCompletionTool {
    const jsonSchema = zodToJsonSchema(tool.inputSchema, {
      name: tool.name,
      $refStrategy: 'none',
    });

    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: jsonSchema as Record<string, unknown>,
      },
    };
  }

  /**
   * Build system prompt from MCP prompts and resources
   */
  private async buildSystemPrompt(session: MCPSession, resources: MCPResource[]): Promise<string> {
    const parts: string[] = [];

    // Base system prompt based on role
    switch (session.role) {
      case 'teacher':
        parts.push(`You are an AI assistant helping a teacher with classroom management tasks.
You have access to tools for viewing timetables, marking attendance, creating lesson plans, and managing classes.
Always be professional, helpful, and prioritize student privacy and data security.`);
        break;
      case 'admin':
        parts.push(`You are an AI assistant helping an administrator with school management.
You have access to tools for user management, class creation, and administrative reporting.
Always confirm destructive actions before executing them.`);
        break;
      case 'student':
        parts.push(`You are an AI assistant helping a student with their academic journey.
You have access to your timetable, assignments, and progress information.
Focus on helping the student learn and stay organized.`);
        break;
    }

    // Add available capabilities summary
    const tools = this.host.listTools(session);
    if (tools.length > 0) {
      parts.push(`\nAvailable tools: ${tools.map(t => t.name).join(', ')}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Send a message and get LLM response with tool execution
   */
  async chat(
    message: string,
    session: MCPSession,
    conversationId?: string
  ): Promise<LLMResponse> {
    const convId = conversationId || session.sessionId;

    // Initialize conversation history if needed
    if (!this.conversationHistory.has(convId)) {
      this.conversationHistory.set(convId, []);
    }

    const history = this.conversationHistory.get(convId)!;

    // Get available tools for this session
    const mcpTools = this.host.listTools(session);
    const mcpResources = this.host.listResources(session);

    // Convert to OpenAI format
    const openaiTools = mcpTools.map(t => this.toolToOpenAIFunction(t));

    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt(session, mcpResources);

    // Prepare messages
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.toolCallId ? { tool_call_id: msg.toolCallId, name: msg.toolName } : {}),
      })) as ChatCompletionMessageParam[],
      {
        role: 'user',
        content: message,
      },
    ];

    // Add user message to history
    history.push({
      role: 'user',
      content: message,
    });

    try {
      // Call OpenAI with tools
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? 'auto' : undefined,
        max_tokens: 2000,
        temperature: 0.7,
      });

      const choice = completion.choices[0];
      const assistantMessage = choice.message;

      // Check if tool calls were made
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolResults: Array<{
          name: string;
          arguments: unknown;
          result: unknown;
        }> = [];

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          console.log(`[LLM Coordinator] Executing tool: ${toolName}`, toolArgs);

          // Execute tool via MCP Host
          const result = await this.host.executeTool(toolName, toolArgs, session);

          toolResults.push({
            name: toolName,
            arguments: toolArgs,
            result: result.data,
          });

          // Add tool call and result to history
          history.push({
            role: 'assistant',
            content: `Calling tool: ${toolName}`,
          });
          history.push({
            role: 'tool',
            content: JSON.stringify(result.data),
            toolCallId: toolCall.id,
            toolName,
          });

          // Add tool result to messages for next LLM call
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [toolCall],
          });
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.data),
          });
        }

        // Get final response from LLM after tool execution
        const finalCompletion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 1000,
          temperature: 0.7,
        });

        const finalMessage = finalCompletion.choices[0].message.content || 'Tool execution completed.';

        // Add final response to history
        history.push({
          role: 'assistant',
          content: finalMessage,
        });

        return {
          message: finalMessage,
          toolCalls: toolResults,
          totalTokens: (completion.usage?.total_tokens || 0) + (finalCompletion.usage?.total_tokens || 0),
          finishReason: finalCompletion.choices[0].finish_reason,
        };
      } else {
        // No tool calls, just return the message
        const responseMessage = assistantMessage.content || 'I apologize, I could not generate a response.';

        history.push({
          role: 'assistant',
          content: responseMessage,
        });

        return {
          message: responseMessage,
          totalTokens: completion.usage?.total_tokens,
          finishReason: choice.finish_reason,
        };
      }
    } catch (error) {
      console.error('[LLM Coordinator] Error:', error);
      throw new Error(`LLM coordination failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Get conversation history
   */
  getHistory(conversationId: string): ConversationMessage[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  /**
   * Aggregate context from resources for enhanced responses
   */
  async aggregateResourceContext(session: MCPSession, resourceUris: string[]): Promise<AggregatedContext> {
    return this.host.aggregateContext(
      session,
      resourceUris.map(uri => ({ type: 'resource', target: uri }))
    );
  }
}

/**
 * Singleton instance
 */
let llmCoordinatorInstance: LLMCoordinator | null = null;

export function getLLMCoordinator(host: MCPHost): LLMCoordinator {
  if (!llmCoordinatorInstance) {
    llmCoordinatorInstance = new LLMCoordinator(host);
  }
  return llmCoordinatorInstance;
}
