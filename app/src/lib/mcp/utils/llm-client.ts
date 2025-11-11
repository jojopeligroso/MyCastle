/**
 * LLM Client with Retry Logic and Caching
 *
 * Provides robust LLM calls with:
 * - Exponential backoff retries
 * - Response caching for deduplication
 * - Performance tracking
 * - Error handling
 *
 * Ref: REQ.md §9.1 (p95 < 5s), DESIGN.md §6.3
 */

import OpenAI from 'openai';
import { createHash } from 'crypto';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface CacheConfig {
  ttlSeconds: number;
  maxSize: number;
}

export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cacheKey?: string;
  retryConfig?: Partial<RetryConfig>;
}

interface CacheEntry {
  response: string;
  timestamp: number;
  hits: number;
}

/**
 * In-memory LRU cache for LLM responses
 */
class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string, ttlSeconds: number): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > ttlSeconds) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.response;
  }

  set(key: string, response: string): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  stats() {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      totalHits: entries.reduce((sum, e) => sum + e.hits, 0),
      avgAge: entries.length > 0
        ? entries.reduce((sum, e) => sum + (Date.now() - e.timestamp), 0) / entries.length / 1000
        : 0,
    };
  }
}

/**
 * LLM Client with retry and caching
 */
export class LLMClient {
  private openai: OpenAI;
  private cache: LRUCache;
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  constructor(cacheConfig: CacheConfig = { ttlSeconds: 3600, maxSize: 1000 }) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
    });
    this.cache = new LRUCache(cacheConfig.maxSize);
  }

  /**
   * Generate cache key from messages
   */
  private generateCacheKey(messages: OpenAI.Chat.ChatCompletionMessageParam[]): string {
    const content = JSON.stringify(messages);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Sleep helper for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Call OpenAI with retry logic
   */
  async chat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: LLMCallOptions = {},
  ): Promise<{
    content: string;
    cached: boolean;
    attemptNumber: number;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    const cacheKey = options.cacheKey || this.generateCacheKey(messages);

    // Check cache first
    const cachedResponse = this.cache.get(cacheKey, 3600); // 1 hour TTL
    if (cachedResponse) {
      return {
        content: cachedResponse,
        cached: true,
        attemptNumber: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    // Merge retry config
    const retryConfig = { ...this.defaultRetryConfig, ...options.retryConfig };

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < retryConfig.maxAttempts) {
      attempt++;

      try {
        const completion = await this.openai.chat.completions.create({
          model: options.model || 'gpt-4o-mini',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2000,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content in OpenAI response');
        }

        // Cache successful response
        this.cache.set(cacheKey, content);

        return {
          content,
          cached: false,
          attemptNumber: attempt,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on validation errors
        if (lastError.message.includes('Invalid schema') ||
            lastError.message.includes('JSON')) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        if (attempt < retryConfig.maxAttempts) {
          const delay = Math.min(
            retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
            retryConfig.maxDelayMs,
          );

          console.warn(
            `LLM call failed (attempt ${attempt}/${retryConfig.maxAttempts}), retrying in ${delay}ms...`,
            lastError.message,
          );

          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `LLM call failed after ${retryConfig.maxAttempts} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.stats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = new LRUCache(1000);
  }
}

// Singleton instance
let llmClientInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClientInstance) {
    llmClientInstance = new LLMClient();
  }
  return llmClientInstance;
}
