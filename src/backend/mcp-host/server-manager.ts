/**
 * Server Manager
 *
 * Manages connections to MCP servers (student, teacher, admin)
 * Handles server lifecycle, tool calls, and resource fetching
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import {
  ServerConnection,
  ServerConfig,
  UserRole,
  MCPServerCapabilities,
  MCPResource,
  MCPTool,
  MCPPrompt,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  MCPInitializeParams,
  MCPInitializeResult,
  ListResourcesResult,
  ReadResourceResult,
  ListToolsResult,
  CallToolParams,
  CallToolResult,
  ListPromptsResult,
  GetPromptParams,
  GetPromptResult,
  MCPError,
  MCPErrorCode,
  Logger,
} from './types';

export interface ServerManagerConfig {
  servers: Record<UserRole, ServerConfig>;
  retryAttempts?: number;
  retryBackoffMs?: number;
  logger?: Logger;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

class StdioTransport extends EventEmitter {
  private process: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<number | string, PendingRequest>();
  private buffer = '';

  constructor(
    private config: ServerConfig,
    private logger: Logger
  ) {
    super();
  }

  async start(): Promise<void> {
    this.logger.info(`Starting MCP server: ${this.config.command} ${this.config.args.join(' ')}`);

    this.process = spawn(this.config.command, this.config.args, {
      env: { ...process.env, ...this.config.env },
      cwd: this.config.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.on('error', (error) => {
      this.logger.error('Server process error:', error);
      this.emit('error', error);
    });

    this.process.on('exit', (code, signal) => {
      this.logger.info(`Server process exited with code ${code}, signal ${signal}`);
      this.emit('exit', { code, signal });
    });

    // Handle stdout (JSON-RPC messages)
    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleData(data.toString());
    });

    // Handle stderr (logging)
    this.process.stderr?.on('data', (data: Buffer) => {
      this.logger.debug(`Server stderr: ${data.toString()}`);
    });
  }

  private handleData(data: string): void {
    this.buffer += data;

    // Process complete JSON-RPC messages (newline delimited)
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        this.logger.error('Failed to parse JSON-RPC message:', error);
      }
    }
  }

  private handleMessage(message: JsonRpcResponse | JsonRpcNotification): void {
    // Check if it's a response to a request
    if ('id' in message && message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(
            new MCPError(message.error.message, message.error.code, message.error.data)
          );
        } else {
          pending.resolve(message.result);
        }
      }
    } else {
      // It's a notification
      this.emit('notification', message);
    }
  }

  async send(message: JsonRpcRequest): Promise<any> {
    const id = message.id ?? ++this.requestId;
    const request = { ...message, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new MCPError('Request timeout', MCPErrorCode.InternalError));
      }, 30000); // 30 second timeout

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const json = JSON.stringify(request) + '\n';
      this.process.stdin?.write(json, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  async close(): Promise<void> {
    // Cancel all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new MCPError('Connection closed', MCPErrorCode.InternalError));
    }
    this.pendingRequests.clear();

    if (this.process) {
      this.process.kill();
    }
  }
}

export class ServerManager {
  private connections = new Map<string, ServerConnection>();
  private transports = new Map<string, StdioTransport>();
  private config: Required<ServerManagerConfig>;

  constructor(config: ServerManagerConfig) {
    this.config = {
      servers: config.servers,
      retryAttempts: config.retryAttempts ?? 3,
      retryBackoffMs: config.retryBackoffMs ?? 1000,
      logger: config.logger ?? this.createDefaultLogger(),
    };
  }

  /**
   * Connect to an MCP server for a specific user role
   */
  async connectToServer(serverType: UserRole): Promise<ServerConnection> {
    // Check if already connected
    const existingConnection = Array.from(this.connections.values()).find(
      (conn) => conn.serverType === serverType && conn.status === 'connected'
    );

    if (existingConnection) {
      this.config.logger.info(`Reusing existing connection for ${serverType} server`);
      return existingConnection;
    }

    const serverConfig = this.config.servers[serverType];
    if (!serverConfig) {
      throw new MCPError(
        `No server configuration found for role: ${serverType}`,
        MCPErrorCode.ServerConnectionFailed
      );
    }

    const connectionId = `${serverType}-${Date.now()}`;
    const transport = new StdioTransport(serverConfig, this.config.logger);

    const connection: ServerConnection = {
      id: connectionId,
      serverType,
      status: 'connecting',
      transport: {
        send: async (message) => {
          await transport.send(message as JsonRpcRequest);
        },
        receive: async function* () {
          // Placeholder for receive
        },
        close: async () => {
          await transport.close();
        },
      },
    };

    this.connections.set(connectionId, connection);
    this.transports.set(connectionId, transport);

    try {
      // Start the transport
      await transport.start();

      // Initialize the MCP connection
      const initParams: MCPInitializeParams = {
        protocolVersion: '2024-11-05',
        capabilities: {
          sampling: { enabled: false },
          roots: { enabled: false },
        },
        clientInfo: {
          name: 'esl-learning-platform-host',
          version: '1.0.0',
        },
      };

      const initResult: MCPInitializeResult = await transport.send({
        jsonrpc: '2.0',
        method: 'initialize',
        params: initParams,
        id: 1,
      });

      connection.capabilities = initResult.capabilities;
      connection.serverInfo = initResult.serverInfo;
      connection.status = 'connected';
      connection.lastPing = new Date();

      this.config.logger.info(
        `Connected to ${serverType} server: ${initResult.serverInfo.name} v${initResult.serverInfo.version}`
      );

      // Send initialized notification
      await transport.send({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      } as any);

      return connection;
    } catch (error) {
      connection.status = 'error';
      this.config.logger.error(`Failed to connect to ${serverType} server:`, error);
      throw new MCPError(
        `Failed to connect to ${serverType} server: ${error}`,
        MCPErrorCode.ServerConnectionFailed
      );
    }
  }

  /**
   * Disconnect from a server
   */
  async disconnectServer(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new MCPError(
        `Connection not found: ${connectionId}`,
        MCPErrorCode.InvalidRequest
      );
    }

    const transport = this.transports.get(connectionId);
    if (transport) {
      await transport.close();
      this.transports.delete(connectionId);
    }

    connection.status = 'disconnected';
    this.connections.delete(connectionId);

    this.config.logger.info(`Disconnected from server: ${connectionId}`);
  }

  /**
   * Get server resources
   */
  async getServerResources(connectionId: string): Promise<MCPResource[]> {
    const transport = this.getTransport(connectionId);

    const result: ListResourcesResult = await transport.send({
      jsonrpc: '2.0',
      method: 'resources/list',
      params: {},
      id: Date.now(),
    });

    return result.resources || [];
  }

  /**
   * Read a specific resource
   */
  async readResource(connectionId: string, uri: string): Promise<ReadResourceResult> {
    const transport = this.getTransport(connectionId);

    const result: ReadResourceResult = await transport.send({
      jsonrpc: '2.0',
      method: 'resources/read',
      params: { uri },
      id: Date.now(),
    });

    return result;
  }

  /**
   * List available tools
   */
  async listTools(connectionId: string): Promise<MCPTool[]> {
    const transport = this.getTransport(connectionId);

    const result: ListToolsResult = await transport.send({
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: Date.now(),
    });

    return result.tools || [];
  }

  /**
   * Execute a tool call
   */
  async sendToolCall(
    connectionId: string,
    toolName: string,
    params: Record<string, any>
  ): Promise<CallToolResult> {
    const transport = this.getTransport(connectionId);

    const callParams: CallToolParams = {
      name: toolName,
      arguments: params,
    };

    try {
      const result: CallToolResult = await transport.send({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: callParams,
        id: Date.now(),
      });

      if (result.isError) {
        throw new MCPError(
          `Tool execution failed: ${JSON.stringify(result.content)}`,
          MCPErrorCode.ToolExecutionFailed
        );
      }

      return result;
    } catch (error) {
      this.config.logger.error(`Tool call failed: ${toolName}`, error);
      throw new MCPError(
        `Tool call failed: ${error}`,
        MCPErrorCode.ToolExecutionFailed
      );
    }
  }

  /**
   * List available prompts
   */
  async listPrompts(connectionId: string): Promise<MCPPrompt[]> {
    const transport = this.getTransport(connectionId);

    const result: ListPromptsResult = await transport.send({
      jsonrpc: '2.0',
      method: 'prompts/list',
      params: {},
      id: Date.now(),
    });

    return result.prompts || [];
  }

  /**
   * Get a specific prompt
   */
  async getPrompt(
    connectionId: string,
    name: string,
    args?: Record<string, string>
  ): Promise<GetPromptResult> {
    const transport = this.getTransport(connectionId);

    const params: GetPromptParams = {
      name,
      arguments: args,
    };

    const result: GetPromptResult = await transport.send({
      jsonrpc: '2.0',
      method: 'prompts/get',
      params,
      id: Date.now(),
    });

    return result;
  }

  /**
   * Get a connection by ID
   */
  getConnection(connectionId: string): ServerConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get all connections
   */
  getAllConnections(): ServerConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections by server type
   */
  getConnectionsByType(serverType: UserRole): ServerConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.serverType === serverType
    );
  }

  /**
   * Get the transport for a connection
   */
  private getTransport(connectionId: string): StdioTransport {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new MCPError(
        `Connection not found: ${connectionId}`,
        MCPErrorCode.InvalidRequest
      );
    }

    if (connection.status !== 'connected') {
      throw new MCPError(
        `Server not connected: ${connectionId}`,
        MCPErrorCode.ServerNotInitialized
      );
    }

    const transport = this.transports.get(connectionId);
    if (!transport) {
      throw new MCPError(
        `Transport not found: ${connectionId}`,
        MCPErrorCode.InternalError
      );
    }

    return transport;
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    this.config.logger.info('ServerManager shutting down...');

    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      try {
        await this.disconnectServer(connectionId);
      } catch (error) {
        this.config.logger.error(`Error disconnecting server ${connectionId}:`, error);
      }
    }

    this.connections.clear();
    this.transports.clear();

    this.config.logger.info('ServerManager shutdown complete');
  }

  /**
   * Create a default console logger
   */
  private createDefaultLogger(): Logger {
    return {
      debug: (message: string, meta?: any) => {
        console.debug(`[ServerManager] ${message}`, meta || '');
      },
      info: (message: string, meta?: any) => {
        console.info(`[ServerManager] ${message}`, meta || '');
      },
      warn: (message: string, meta?: any) => {
        console.warn(`[ServerManager] ${message}`, meta || '');
      },
      error: (message: string, meta?: any) => {
        console.error(`[ServerManager] ${message}`, meta || '');
      },
    };
  }
}
