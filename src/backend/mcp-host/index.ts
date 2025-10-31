/**
 * MCP Host - Main Entry Point
 *
 * The core orchestration layer that manages AI sessions, coordinates with MCP servers,
 * and integrates with the LLM for the ESL Learning Platform
 */

import {
  MCPHostConfig,
  MCPHostOptions,
  Session,
  UserRole,
  ProcessMessageResult,
  ProcessMessageOptions,
  Logger,
  MCPError,
  MCPErrorCode,
} from './types';
import { SessionManager } from './session-manager';
import { ServerManager } from './server-manager';
import { LLMClient } from './llm-client';
import { MessageRouter } from './message-router';

export class MCPHost {
  private sessionManager: SessionManager;
  private serverManager: ServerManager;
  private llmClient: LLMClient;
  private messageRouter: MessageRouter;
  private config: MCPHostConfig;
  private logger: Logger;
  private isInitialized = false;

  constructor(options: MCPHostOptions) {
    this.config = options.config;
    this.logger = options.logger ?? this.createDefaultLogger();

    this.logger.info('Initializing MCP Host...');

    // Initialize components
    this.sessionManager = new SessionManager({
      maxHistoryLength: this.config.session.maxHistoryLength,
      inactivityTimeout: this.config.session.inactivityTimeout,
      logger: this.logger,
    });

    this.serverManager = new ServerManager({
      servers: this.config.servers,
      retryAttempts: this.config.retry?.maxAttempts,
      retryBackoffMs: this.config.retry?.backoffMs,
      logger: this.logger,
    });

    this.llmClient = new LLMClient({
      provider: this.config.llm.provider,
      apiKey: this.config.llm.apiKey,
      baseUrl: this.config.llm.baseUrl,
      model: this.config.llm.model,
      defaultTemperature: this.config.llm.defaultTemperature,
      defaultMaxTokens: this.config.llm.defaultMaxTokens,
      logger: this.logger,
    });

    this.messageRouter = new MessageRouter({
      sessionManager: this.sessionManager,
      serverManager: this.serverManager,
      llmClient: this.llmClient,
      logger: this.logger,
    });

    this.logger.info('MCP Host initialized successfully');
    this.isInitialized = true;
  }

  /**
   * Start a new AI chat session for a user
   *
   * @param userId - Unique identifier for the user
   * @param role - User role (student, teacher, admin)
   * @param metadata - Optional metadata for the session
   * @returns The created session
   */
  async startSession(
    userId: string,
    role: UserRole,
    metadata?: Record<string, any>
  ): Promise<Session> {
    this.ensureInitialized();

    this.logger.info(`Starting session for user ${userId} with role ${role}`);

    const session = await this.sessionManager.startSession(userId, role, metadata);

    // Pre-connect to the appropriate MCP server for this role
    try {
      await this.serverManager.connectToServer(role);
    } catch (error) {
      this.logger.error(`Failed to connect to ${role} server:`, error);
      // Don't fail session creation, connection will be retried on first message
    }

    return session;
  }

  /**
   * End a session and clean up resources
   *
   * @param sessionId - Session identifier
   */
  async endSession(sessionId: string): Promise<void> {
    this.ensureInitialized();
    await this.sessionManager.endSession(sessionId);
  }

  /**
   * Process a user message through the full orchestration flow
   *
   * Flow:
   * 1. Get session
   * 2. Connect to appropriate MCP server for user role
   * 3. Gather resources/context from server
   * 4. Call LLM with context + message
   * 5. Handle any tool calls
   * 6. Return response
   *
   * @param sessionId - Session identifier
   * @param message - User's message
   * @param options - Processing options
   * @returns Processing result with response and metadata
   */
  async processUserMessage(
    sessionId: string,
    message: string,
    options?: ProcessMessageOptions
  ): Promise<ProcessMessageResult> {
    this.ensureInitialized();

    if (!message || message.trim().length === 0) {
      throw new MCPError('Message cannot be empty', MCPErrorCode.InvalidParams);
    }

    return await this.messageRouter.processUserMessage(sessionId, message, options);
  }

  /**
   * Get a session by ID
   *
   * @param sessionId - Session identifier
   * @returns Session or null if not found
   */
  getSession(sessionId: string): Session | null {
    this.ensureInitialized();
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Get all sessions for a user
   *
   * @param userId - User identifier
   * @returns Array of sessions for the user
   */
  getUserSessions(userId: string): Session[] {
    this.ensureInitialized();
    return this.sessionManager.getUserSessions(userId);
  }

  /**
   * Clear conversation history for a session
   *
   * @param sessionId - Session identifier
   */
  clearHistory(sessionId: string): void {
    this.ensureInitialized();
    this.sessionManager.clearHistory(sessionId);
  }

  /**
   * Get host statistics
   */
  getStats() {
    this.ensureInitialized();

    return {
      sessions: this.sessionManager.getStats(),
      servers: {
        totalConnections: this.serverManager.getAllConnections().length,
        connectionsByType: {
          student: this.serverManager.getConnectionsByType('student').length,
          teacher: this.serverManager.getConnectionsByType('teacher').length,
          admin: this.serverManager.getConnectionsByType('admin').length,
        },
      },
    };
  }

  /**
   * Shutdown the MCP Host and clean up all resources
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    this.logger.info('Shutting down MCP Host...');

    try {
      // Shutdown in reverse order of initialization
      await this.sessionManager.shutdown();
      await this.serverManager.shutdown();

      this.isInitialized = false;
      this.logger.info('MCP Host shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Ensure the host is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new MCPError('MCP Host is not initialized', MCPErrorCode.InternalError);
    }
  }

  /**
   * Create a default console logger
   */
  private createDefaultLogger(): Logger {
    return {
      debug: (message: string, meta?: any) => {
        console.debug(`[MCPHost] ${message}`, meta || '');
      },
      info: (message: string, meta?: any) => {
        console.info(`[MCPHost] ${message}`, meta || '');
      },
      warn: (message: string, meta?: any) => {
        console.warn(`[MCPHost] ${message}`, meta || '');
      },
      error: (message: string, meta?: any) => {
        console.error(`[MCPHost] ${message}`, meta || '');
      },
    };
  }
}

// Export all types and classes
export * from './types';
export { SessionManager } from './session-manager';
export { ServerManager } from './server-manager';
export { LLMClient } from './llm-client';
export { MessageRouter } from './message-router';

// Export a factory function for easy instantiation
export function createMCPHost(config: MCPHostConfig, logger?: Logger): MCPHost {
  return new MCPHost({ config, logger });
}
