/**
 * MCP Host Type Definitions
 *
 * Core types for the Model Context Protocol implementation
 * Based on JSON-RPC 2.0 and MCP specification
 */

// ============================================================================
// JSON-RPC 2.0 Base Types
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: JsonRpcError;
  id: string | number | null;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

// ============================================================================
// MCP Protocol Types
// ============================================================================

export type UserRole = 'student' | 'teacher' | 'admin';

export interface MCPServerCapabilities {
  resources?: {
    enabled: boolean;
    listChanged?: boolean;
  };
  tools?: {
    enabled: boolean;
  };
  prompts?: {
    enabled: boolean;
  };
}

export interface MCPClientCapabilities {
  sampling?: {
    enabled: boolean;
  };
  roots?: {
    enabled: boolean;
  };
}

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

// ============================================================================
// Resource Types
// ============================================================================

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string; // base64 encoded
}

export interface ListResourcesResult {
  resources: MCPResource[];
}

export interface ReadResourceResult {
  contents: MCPResourceContent[];
}

// ============================================================================
// Tool Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ListToolsResult {
  tools: MCPTool[];
}

export interface CallToolParams {
  name: string;
  arguments?: Record<string, any>;
}

export interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// ============================================================================
// Prompt Types
// ============================================================================

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface ListPromptsResult {
  prompts: MCPPrompt[];
}

export interface GetPromptParams {
  name: string;
  arguments?: Record<string, string>;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

export interface GetPromptResult {
  description?: string;
  messages: PromptMessage[];
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  role: UserRole;
  createdAt: Date;
  lastActivity: Date;
  conversationHistory: ConversationMessage[];
  metadata: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}

export interface ToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
}

// ============================================================================
// Server Connection Types
// ============================================================================

export interface ServerConnection {
  id: string;
  serverType: UserRole;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  capabilities?: MCPServerCapabilities;
  serverInfo?: {
    name: string;
    version: string;
  };
  transport: ServerTransport;
  lastPing?: Date;
}

export interface ServerTransport {
  send(message: JsonRpcRequest | JsonRpcNotification): Promise<void>;
  receive(): AsyncIterableIterator<JsonRpcResponse | JsonRpcNotification>;
  close(): Promise<void>;
}

export interface ServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

// ============================================================================
// LLM Integration Types
// ============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Message Router Types
// ============================================================================

export interface RouteContext {
  session: Session;
  serverConnection: ServerConnection;
  availableTools: MCPTool[];
  availableResources: MCPResource[];
}

export interface ProcessMessageOptions {
  maxToolCalls?: number;
  timeout?: number;
  includeSystemPrompt?: boolean;
}

export interface ProcessMessageResult {
  response: string;
  toolCallsExecuted: number;
  tokensUsed: number;
  conversationMessage: ConversationMessage;
}

// ============================================================================
// Error Types
// ============================================================================

export class MCPError extends Error {
  constructor(
    message: string,
    public code: number,
    public data?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerNotInitialized = -32002,
  ServerConnectionFailed = -32001,
  ToolExecutionFailed = -32000,
  ResourceNotFound = -31999,
  SessionNotFound = -31998,
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface MCPHostConfig {
  llm: {
    provider: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    baseUrl?: string;
    model: string;
    defaultTemperature?: number;
    defaultMaxTokens?: number;
  };
  servers: Record<UserRole, ServerConfig>;
  session: {
    maxHistoryLength?: number;
    inactivityTimeout?: number; // milliseconds
  };
  retry: {
    maxAttempts?: number;
    backoffMs?: number;
  };
}

export interface MCPHostOptions {
  config: MCPHostConfig;
  logger?: Logger;
}

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}
