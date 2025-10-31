/**
 * Message Router
 *
 * Orchestrates the flow of messages between user, MCP servers, and LLM
 * Handles context gathering, tool call routing, and response formatting
 */

import {
  Session,
  LLMMessage,
  MCPTool,
  MCPResource,
  ProcessMessageOptions,
  ProcessMessageResult,
  MCPError,
  MCPErrorCode,
  Logger,
  ConversationMessage,
  ToolCall,
} from './types';
import { SessionManager } from './session-manager';
import { ServerManager } from './server-manager';
import { LLMClient, GenerateOptions } from './llm-client';

export interface MessageRouterConfig {
  sessionManager: SessionManager;
  serverManager: ServerManager;
  llmClient: LLMClient;
  maxToolCalls?: number;
  toolCallTimeout?: number;
  logger?: Logger;
}

export class MessageRouter {
  private config: Required<MessageRouterConfig>;

  constructor(config: MessageRouterConfig) {
    this.config = {
      sessionManager: config.sessionManager,
      serverManager: config.serverManager,
      llmClient: config.llmClient,
      maxToolCalls: config.maxToolCalls ?? 5,
      toolCallTimeout: config.toolCallTimeout ?? 30000,
      logger: config.logger ?? this.createDefaultLogger(),
    };
  }

  /**
   * Process a user message through the full orchestration flow
   */
  async processUserMessage(
    sessionId: string,
    message: string,
    options: ProcessMessageOptions = {}
  ): Promise<ProcessMessageResult> {
    const maxToolCalls = options.maxToolCalls ?? this.config.maxToolCalls;
    const includeSystemPrompt = options.includeSystemPrompt ?? true;

    this.config.logger.info(`Processing message for session ${sessionId}`);

    // 1. Get session
    const session = this.config.sessionManager.getSession(sessionId);
    if (!session) {
      throw new MCPError(
        `Session not found: ${sessionId}`,
        MCPErrorCode.SessionNotFound
      );
    }

    // 2. Get or create appropriate MCP server connection
    const serverConnection = await this.config.serverManager.connectToServer(
      session.role
    );

    // 3. Gather context from MCP server
    const { tools, resources, systemPrompt } = await this.gatherContext(
      serverConnection.id,
      session
    );

    // 4. Build messages for LLM
    const llmMessages = await this.buildLLMMessages(
      session,
      message,
      resources,
      systemPrompt,
      includeSystemPrompt
    );

    // 5. Add user message to conversation history
    this.config.sessionManager.addMessage(sessionId, {
      role: 'user',
      content: message,
    });

    // 6. Execute LLM conversation with tool calls
    let totalToolCalls = 0;
    let currentMessages = llmMessages;
    let finalResponse = '';
    let tokensUsed = 0;

    while (totalToolCalls < maxToolCalls) {
      // Generate LLM response
      const generateOptions: GenerateOptions = {
        tools: tools.length > 0 ? tools : undefined,
        toolChoice: 'auto',
      };

      const llmResult = await this.config.llmClient.generate(
        currentMessages,
        generateOptions
      );

      tokensUsed += llmResult.usage.totalTokens;

      // Check if LLM wants to call tools
      if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
        this.config.logger.debug(`LLM requested ${llmResult.toolCalls.length} tool calls`);

        // Execute tool calls
        const toolResults = await this.executeToolCalls(
          serverConnection.id,
          llmResult.toolCalls
        );

        totalToolCalls += llmResult.toolCalls.length;

        // Add assistant message with tool calls
        currentMessages.push({
          role: 'assistant',
          content: llmResult.content || '',
        });

        // Add tool results to messages
        for (const toolResult of toolResults) {
          currentMessages.push({
            role: 'user',
            content: `Tool result for ${toolResult.name}: ${JSON.stringify(toolResult.result)}`,
          });
        }

        // Continue loop to get final response
        continue;
      }

      // No more tool calls, we have final response
      finalResponse = llmResult.content;
      break;
    }

    if (totalToolCalls >= maxToolCalls) {
      this.config.logger.warn(
        `Maximum tool calls (${maxToolCalls}) reached for session ${sessionId}`
      );
    }

    // 7. Add assistant response to conversation history
    const conversationMessage = this.config.sessionManager.addMessage(sessionId, {
      role: 'assistant',
      content: finalResponse,
    });

    this.config.logger.info(
      `Message processed: ${totalToolCalls} tool calls, ${tokensUsed} tokens`
    );

    return {
      response: finalResponse,
      toolCallsExecuted: totalToolCalls,
      tokensUsed,
      conversationMessage,
    };
  }

  /**
   * Gather context from MCP server (tools, resources, prompts)
   */
  private async gatherContext(
    connectionId: string,
    session: Session
  ): Promise<{
    tools: MCPTool[];
    resources: MCPResource[];
    systemPrompt: string;
  }> {
    this.config.logger.debug(`Gathering context for ${session.role} session`);

    // Get available tools
    const tools = await this.config.serverManager.listTools(connectionId);
    this.config.logger.debug(`Found ${tools.length} tools`);

    // Get available resources
    const resources = await this.config.serverManager.getServerResources(connectionId);
    this.config.logger.debug(`Found ${resources.length} resources`);

    // Get system prompt
    let systemPrompt = '';
    try {
      const prompts = await this.config.serverManager.listPrompts(connectionId);
      if (prompts.length > 0) {
        // Get the default prompt (typically named 'default' or 'system')
        const defaultPrompt =
          prompts.find((p) => p.name === 'default' || p.name === 'system') ||
          prompts[0];
        const promptResult = await this.config.serverManager.getPrompt(
          connectionId,
          defaultPrompt.name
        );
        systemPrompt = promptResult.messages
          .filter((m) => m.role === 'user')
          .map((m) => m.content.text)
          .join('\n');
      }
    } catch (error) {
      this.config.logger.warn('Failed to get system prompt:', error);
    }

    return { tools, resources, systemPrompt };
  }

  /**
   * Build messages for LLM including context and history
   */
  private async buildLLMMessages(
    session: Session,
    currentMessage: string,
    resources: MCPResource[],
    systemPrompt: string,
    includeSystemPrompt: boolean
  ): Promise<LLMMessage[]> {
    const messages: LLMMessage[] = [];

    // Add system prompt with context
    if (includeSystemPrompt) {
      let systemContent = systemPrompt || this.getDefaultSystemPrompt(session.role);

      // Add resource context
      if (resources.length > 0) {
        systemContent += '\n\nAvailable Resources:\n';
        for (const resource of resources) {
          systemContent += `- ${resource.name}: ${resource.description || resource.uri}\n`;
        }
      }

      messages.push({
        role: 'system',
        content: systemContent,
      });
    }

    // Add conversation history
    const history = this.config.sessionManager.getConversationHistory(session.id, 10);
    for (const msg of history) {
      if (msg.role === 'system') continue;

      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  /**
   * Execute tool calls
   */
  private async executeToolCalls(
    connectionId: string,
    toolCalls: Array<{
      id: string;
      name: string;
      arguments: Record<string, any>;
    }>
  ): Promise<
    Array<{
      id: string;
      name: string;
      result: any;
      error?: string;
    }>
  > {
    const results = [];

    for (const toolCall of toolCalls) {
      this.config.logger.debug(`Executing tool: ${toolCall.name}`, toolCall.arguments);

      try {
        const result = await this.config.serverManager.sendToolCall(
          connectionId,
          toolCall.name,
          toolCall.arguments
        );

        // Extract text content from tool result
        const textContent = result.content
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n');

        results.push({
          id: toolCall.id,
          name: toolCall.name,
          result: textContent || result.content,
        });
      } catch (error) {
        this.config.logger.error(`Tool execution failed: ${toolCall.name}`, error);
        results.push({
          id: toolCall.id,
          name: toolCall.name,
          result: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Get default system prompt for a role
   */
  private getDefaultSystemPrompt(role: string): string {
    switch (role) {
      case 'student':
        return `You are a friendly AI tutor assisting a student. Explain concepts clearly and step-by-step.
Encourage the student and adjust your explanations to their level of understanding.
If the student is wrong, gently correct them and provide hints.`;

      case 'teacher':
        return `You are a teaching assistant AI helping an educator. Provide clear, concise information.
When asked to create content, format it clearly and align with educational standards.
Offer constructive suggestions for improving student outcomes. Be professional and supportive.`;

      case 'admin':
        return `You are an AI administrative assistant for an educational platform.
You provide analytical insights, reports, and help manage the system.
Be concise and factual in your responses. Use a formal tone.
When giving statistics or reports, format them clearly.`;

      default:
        return 'You are a helpful AI assistant.';
    }
  }

  /**
   * Create a default console logger
   */
  private createDefaultLogger(): Logger {
    return {
      debug: (message: string, meta?: any) => {
        console.debug(`[MessageRouter] ${message}`, meta || '');
      },
      info: (message: string, meta?: any) => {
        console.info(`[MessageRouter] ${message}`, meta || '');
      },
      warn: (message: string, meta?: any) => {
        console.warn(`[MessageRouter] ${message}`, meta || '');
      },
      error: (message: string, meta?: any) => {
        console.error(`[MessageRouter] ${message}`, meta || '');
      },
    };
  }
}
