/**
 * LLM Client
 *
 * Handles communication with Language Model APIs (OpenAI, Anthropic, local models)
 */

import {
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMToolDefinition,
  MCPTool,
  MCPError,
  MCPErrorCode,
  Logger,
} from './types';

export interface LLMClientConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  logger?: Logger;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: MCPTool[];
  toolChoice?: 'auto' | 'none' | 'required';
  stream?: boolean;
}

export interface GenerateResult {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LLMClient {
  private config: Required<LLMClientConfig>;

  constructor(config: LLMClientConfig) {
    this.config = {
      provider: config.provider,
      apiKey: config.apiKey || '',
      baseUrl: config.baseUrl || this.getDefaultBaseUrl(config.provider),
      model: config.model,
      defaultTemperature: config.defaultTemperature ?? 0.7,
      defaultMaxTokens: config.defaultMaxTokens ?? 2048,
      logger: config.logger ?? this.createDefaultLogger(),
    };

    if (!this.config.apiKey && this.config.provider !== 'local') {
      this.config.logger.warn(
        `No API key provided for ${this.config.provider}. Calls may fail.`
      );
    }
  }

  /**
   * Generate a response from the LLM
   */
  async generate(
    messages: LLMMessage[],
    options: GenerateOptions = {}
  ): Promise<GenerateResult> {
    const temperature = options.temperature ?? this.config.defaultTemperature;
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens;

    this.config.logger.debug('Generating LLM response', {
      provider: this.config.provider,
      model: this.config.model,
      messageCount: messages.length,
    });

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.generateOpenAI(messages, temperature, maxTokens, options);
        case 'anthropic':
          return await this.generateAnthropic(messages, temperature, maxTokens, options);
        case 'local':
          return await this.generateLocal(messages, temperature, maxTokens, options);
        default:
          throw new MCPError(
            `Unsupported LLM provider: ${this.config.provider}`,
            MCPErrorCode.InvalidParams
          );
      }
    } catch (error) {
      this.config.logger.error('LLM generation failed:', error);
      throw new MCPError(
        `LLM generation failed: ${error}`,
        MCPErrorCode.InternalError
      );
    }
  }

  /**
   * Generate using OpenAI API
   */
  private async generateOpenAI(
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number,
    options: GenerateOptions
  ): Promise<GenerateResult> {
    const url = `${this.config.baseUrl}/chat/completions`;

    const request: LLMRequest = {
      model: this.config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: options.stream ?? false,
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      request.tools = this.convertMCPToolsToLLMTools(options.tools);
      if (options.toolChoice) {
        request.tool_choice = options.toolChoice;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: LLMResponse = await response.json();

    return this.parseOpenAIResponse(data);
  }

  /**
   * Generate using Anthropic API
   */
  private async generateAnthropic(
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number,
    options: GenerateOptions
  ): Promise<GenerateResult> {
    // Anthropic uses a different API format
    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const url = `${this.config.baseUrl}/messages`;

    const request: any = {
      model: this.config.model,
      max_tokens: maxTokens,
      temperature,
      messages: conversationMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
    };

    if (systemMessage) {
      request.system =
        typeof systemMessage.content === 'string'
          ? systemMessage.content
          : JSON.stringify(systemMessage.content);
    }

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      request.tools = options.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();

    return this.parseAnthropicResponse(data);
  }

  /**
   * Generate using local model
   */
  private async generateLocal(
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number,
    options: GenerateOptions
  ): Promise<GenerateResult> {
    // Placeholder for local model implementation
    // This would integrate with local LLM servers like Ollama, llama.cpp, etc.
    const url = `${this.config.baseUrl}/api/chat`;

    const request = {
      model: this.config.model,
      messages,
      options: {
        temperature,
        num_predict: maxTokens,
      },
      stream: false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local LLM error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();

    return {
      content: data.message?.content || '',
      finishReason: 'stop',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }

  /**
   * Convert MCP tools to LLM tool definitions
   */
  private convertMCPToolsToLLMTools(tools: MCPTool[]): LLMToolDefinition[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * Parse OpenAI response
   */
  private parseOpenAIResponse(response: LLMResponse): GenerateResult {
    const choice = response.choices[0];
    const message = choice.message;

    const result: GenerateResult = {
      content: message.content || '',
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };

    // Parse tool calls if present
    if (message.tool_calls && message.tool_calls.length > 0) {
      result.toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));
    }

    return result;
  }

  /**
   * Parse Anthropic response
   */
  private parseAnthropicResponse(response: any): GenerateResult {
    const result: GenerateResult = {
      content: '',
      finishReason: response.stop_reason || 'stop',
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens:
          (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };

    // Parse content blocks
    for (const block of response.content || []) {
      if (block.type === 'text') {
        result.content += block.text;
      } else if (block.type === 'tool_use') {
        if (!result.toolCalls) {
          result.toolCalls = [];
        }
        result.toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input,
        });
      }
    }

    return result;
  }

  /**
   * Get default base URL for provider
   */
  private getDefaultBaseUrl(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'local':
        return 'http://localhost:11434'; // Default Ollama port
      default:
        return '';
    }
  }

  /**
   * Create a default console logger
   */
  private createDefaultLogger(): Logger {
    return {
      debug: (message: string, meta?: any) => {
        console.debug(`[LLMClient] ${message}`, meta || '');
      },
      info: (message: string, meta?: any) => {
        console.info(`[LLMClient] ${message}`, meta || '');
      },
      warn: (message: string, meta?: any) => {
        console.warn(`[LLMClient] ${message}`, meta || '');
      },
      error: (message: string, meta?: any) => {
        console.error(`[LLMClient] ${message}`, meta || '');
      },
    };
  }
}
