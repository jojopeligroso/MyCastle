/**
 * Admin MCP Server - Core Protocol Implementation
 *
 * Implements the Model Context Protocol (MCP) for exposing administrative
 * tools and resources to AI assistants. Handles JSON-RPC 2.0 message routing,
 * authentication, and response formatting.
 */

import { toolRegistry, getToolMetadata } from './tools/index.js';
import { resourceRegistry, getResourceByUri } from './resources/index.js';
import { generateCorrelationId } from './audit/index.js';
import type { AdminContext, MCPTool, MCPResource } from '../types/index.js';
import { AuthenticationError, AuthorizationError, ValidationError } from '../types/index.js';

/**
 * MCP JSON-RPC 2.0 Request
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number | null;
  meta?: {
    authorization?: string;
    correlationId?: string;
  };
}

/**
 * MCP JSON-RPC 2.0 Response
 */
export interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

/**
 * MCP Error Codes (JSON-RPC 2.0 standard + custom)
 */
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  AUTHENTICATION_ERROR: -32001,
  AUTHORIZATION_ERROR: -32002,
  VALIDATION_ERROR: -32003,
  TIMEOUT_ERROR: -32004,
} as const;

/**
 * Admin MCP Server
 *
 * Core server class that implements the MCP protocol. Transport-agnostic -
 * can be used with STDIO, HTTP, or any other transport mechanism.
 */
export class AdminMCPServer {
  private requestTimeout: number;

  constructor(options?: { requestTimeout?: number }) {
    this.requestTimeout = options?.requestTimeout || 30000; // 30s default
  }

  /**
   * Handle incoming MCP request
   *
   * Routes requests to appropriate handlers based on method name.
   * Implements JSON-RPC 2.0 error handling and response formatting.
   *
   * @param request - MCP request object
   * @param context - Admin context with authentication info
   * @returns MCP response object
   */
  async handleRequest(request: MCPRequest, context: AdminContext): Promise<MCPResponse> {
    const correlationId = request.meta?.correlationId || generateCorrelationId();

    try {
      // Validate JSON-RPC version
      if (request.jsonrpc !== '2.0') {
        return this.createErrorResponse(
          request.id,
          MCP_ERROR_CODES.INVALID_REQUEST,
          'Invalid JSON-RPC version. Must be "2.0"'
        );
      }

      // Add timeout wrapper
      const result = await this.withTimeout(
        this.routeRequest(request, context, correlationId),
        this.requestTimeout
      );

      return this.createSuccessResponse(request.id, result);
    } catch (error) {
      return this.handleError(error, request.id);
    }
  }

  /**
   * Route request to appropriate handler based on method
   */
  private async routeRequest(
    request: MCPRequest,
    context: AdminContext,
    correlationId: string
  ): Promise<any> {
    const { method, params } = request;

    switch (method) {
      case 'tools/list':
        return this.listTools();

      case 'tools/call':
        return this.executeTool(params?.name, params?.arguments, context, correlationId);

      case 'resources/list':
        return this.listResources();

      case 'resources/read':
        return this.readResource(params?.uri, context, correlationId);

      case 'resources/subscribe':
        // Optional: implement resource subscriptions
        throw new Error('resources/subscribe not implemented');

      case 'prompts/list':
        // Optional: implement prompt templates
        return { prompts: [] };

      case 'completion/complete':
        // Optional: implement text completion
        throw new Error('completion/complete not implemented');

      case 'ping':
        return { pong: true, timestamp: new Date().toISOString() };

      default:
        throw new Error(`Method not found: ${method}`);
    }
  }

  /**
   * List all available tools
   *
   * Returns tool metadata including name, description, and input schema
   * for discovery by MCP clients.
   *
   * @returns List of tool definitions
   */
  async listTools(): Promise<{ tools: MCPTool[] }> {
    return { tools: toolRegistry };
  }

  /**
   * Execute a tool by name
   *
   * Looks up the tool executor function and invokes it with provided arguments.
   * Dynamically imports the tool module to call the execute function.
   *
   * @param name - Tool name
   * @param args - Tool arguments
   * @param context - Admin context
   * @param correlationId - Request correlation ID
   * @returns Tool execution result
   */
  async executeTool(
    name: string,
    args: any,
    context: AdminContext,
    correlationId: string
  ): Promise<any> {
    if (!name) {
      throw new ValidationError('Tool name is required');
    }

    const toolMeta = getToolMetadata(name);
    if (!toolMeta) {
      throw new ValidationError(`Unknown tool: ${name}`);
    }

    // Dynamically import and execute the tool
    // Each tool exports an execute{ToolName} function
    try {
      const toolModule = await this.importTool(name);
      const executeFunctionName = this.getExecuteFunctionName(name);

      if (!toolModule[executeFunctionName]) {
        throw new Error(`Tool ${name} missing execute function: ${executeFunctionName}`);
      }

      const result = await toolModule[executeFunctionName](context, args || {});

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // Re-throw known error types
      if (
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      // Wrap other errors
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all available resources
   *
   * Returns resource metadata including URI, name, description, and MIME type
   * for discovery by MCP clients.
   *
   * @returns List of resource definitions
   */
  async listResources(): Promise<{ resources: MCPResource[] }> {
    return { resources: resourceRegistry };
  }

  /**
   * Read a resource by URI
   *
   * Looks up the resource getter function and invokes it with URI parameters.
   * Supports ETags for caching and conditional requests.
   *
   * @param uri - Resource URI (e.g., res://admin/reports/weekly-ops)
   * @param context - Admin context
   * @param correlationId - Request correlation ID
   * @returns Resource data with metadata
   */
  async readResource(uri: string, context: AdminContext, correlationId: string): Promise<any> {
    if (!uri) {
      throw new ValidationError('Resource URI is required');
    }

    const resourceMeta = getResourceByUri(uri);
    if (!resourceMeta) {
      throw new ValidationError(`Unknown resource URI: ${uri}`);
    }

    // Extract parameters from URI if it has path parameters
    const params = this.extractUriParams(resourceMeta.uri, uri);

    // Dynamically import and execute the resource getter
    try {
      const resourceModule = await this.importResource(resourceMeta);
      const getterFunctionName = this.getResourceGetterName(resourceMeta.name);

      if (!resourceModule[getterFunctionName]) {
        throw new Error(`Resource ${resourceMeta.name} missing getter function: ${getterFunctionName}`);
      }

      const result = await resourceModule[getterFunctionName](context, params);

      return {
        contents: [
          {
            uri,
            mimeType: resourceMeta.mimeType || 'application/json',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
        meta: {
          etag: result.etag,
          cacheHint: result.cacheHint,
        },
      };
    } catch (error) {
      // Re-throw known error types
      if (
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      // Wrap other errors
      throw new Error(`Resource read failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import tool module dynamically
   */
  private async importTool(toolName: string): Promise<any> {
    // Convert tool name to file name (e.g., create-user -> ./tools/create-user.js)
    return import(`./tools/${toolName}.js`);
  }

  /**
   * Import resource module dynamically
   */
  private async importResource(resource: MCPResource): Promise<any> {
    // Extract resource file name from URI
    // e.g., res://admin/reports/weekly-ops -> ./resources/weekly-ops.js
    const pathParts = resource.uri.replace('res://admin/', '').split('/');
    const fileName = pathParts[pathParts.length - 1].replace(/\{[^}]+\}/g, '');

    // Handle special cases where file names don't match URI
    const fileMap: Record<string, string> = {
      'weekly-ops': 'weekly-ops',
      'ar-aging': 'ar-aging',
      'users': 'users-directory',
      'class-load': 'class-load',
      'visa-expiries': 'compliance',
      'accommodation-occupancy': 'accommodation',
      'registers': 'registers',
      'audit-rollup': 'audit-rollup',
    };

    const actualFileName = fileMap[fileName] || fileName;
    return import(`./resources/${actualFileName}.js`);
  }

  /**
   * Get execute function name for a tool
   * e.g., create-user -> executeCreateUser
   */
  private getExecuteFunctionName(toolName: string): string {
    const camelCase = toolName
      .split('-')
      .map((part, index) =>
        index === 0
          ? part.charAt(0).toUpperCase() + part.slice(1)
          : part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join('');
    return `execute${camelCase}`;
  }

  /**
   * Get resource getter function name
   * e.g., Weekly Operations Snapshot -> getWeeklyOpsResource
   */
  private getResourceGetterName(resourceName: string): string {
    // Extract key words and convert to camelCase
    const words = resourceName.split(' ').filter(w => w.length > 0);
    const camelCase = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    return `get${camelCase}Resource`;
  }

  /**
   * Extract parameters from URI path
   * e.g., res://admin/registers/class-123/2025-W01 -> { class_id: 'class-123', iso_week: '2025-W01' }
   */
  private extractUriParams(template: string, actual: string): Record<string, string> {
    const templateParts = template.split('/');
    const actualParts = actual.split('/');
    const params: Record<string, string> = {};

    for (let i = 0; i < templateParts.length; i++) {
      const templatePart = templateParts[i];
      if (templatePart.startsWith('{') && templatePart.endsWith('}')) {
        const paramName = templatePart.slice(1, -1);
        params[paramName] = actualParts[i];
      }
    }

    return params;
  }

  /**
   * Wrap async operation with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Create success response
   */
  private createSuccessResponse(id: string | number | null, result: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      result,
      id,
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): MCPResponse {
    return {
      jsonrpc: '2.0',
      error: { code, message, data },
      id,
    };
  }

  /**
   * Handle errors and convert to appropriate error response
   */
  private handleError(error: unknown, id: string | number | null): MCPResponse {
    if (error instanceof AuthenticationError) {
      return this.createErrorResponse(
        id,
        MCP_ERROR_CODES.AUTHENTICATION_ERROR,
        error.message
      );
    }

    if (error instanceof AuthorizationError) {
      return this.createErrorResponse(
        id,
        MCP_ERROR_CODES.AUTHORIZATION_ERROR,
        error.message
      );
    }

    if (error instanceof ValidationError) {
      return this.createErrorResponse(
        id,
        MCP_ERROR_CODES.VALIDATION_ERROR,
        error.message
      );
    }

    if (error instanceof Error) {
      // Check for timeout
      if (error.message.includes('timeout')) {
        return this.createErrorResponse(
          id,
          MCP_ERROR_CODES.TIMEOUT_ERROR,
          'Request timeout exceeded'
        );
      }

      // Check for method not found
      if (error.message.includes('Method not found')) {
        return this.createErrorResponse(
          id,
          MCP_ERROR_CODES.METHOD_NOT_FOUND,
          error.message
        );
      }

      // Generic error
      return this.createErrorResponse(
        id,
        MCP_ERROR_CODES.INTERNAL_ERROR,
        error.message
      );
    }

    // Unknown error
    return this.createErrorResponse(
      id,
      MCP_ERROR_CODES.INTERNAL_ERROR,
      'An unknown error occurred'
    );
  }
}
