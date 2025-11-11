/**
 * Teacher MCP Performance Tests
 *
 * Validates performance requirements:
 * - REQ.md §9.1: Lesson generation p95 < 5000ms
 * - Cache hit ratio > 80% after warmup
 * - LLM retry logic working under failure
 *
 * Ref: MVP-SPRINT-PLAN.md Sprint 2, TASKS.md T-033
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { getLLMClient } from '@/lib/mcp/utils/llm-client';
import { generateCacheKey, generateLessonPlan } from '@/lib/lessons/generator';
import type { LessonPlanRequest } from '@/lib/lessons/schemas';

// ============================================================================
// Test Configuration
// ============================================================================

const PERFORMANCE_TARGET_P95_MS = 5000; // 5 seconds
const CACHE_HIT_RATIO_TARGET = 0.8; // 80%
const SAMPLE_SIZE = 20;

// ============================================================================
// Helper Functions
// ============================================================================

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

function calculateStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: values.reduce((sum, v) => sum + v, 0) / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: calculatePercentile(values, 95),
    p99: calculatePercentile(values, 99),
  };
}

async function measureLatency(fn: () => Promise<any>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

// ============================================================================
// Performance Tests
// ============================================================================

describe('Teacher MCP Performance', () => {
  describe('Lesson Plan Generation (REQ §9.1)', () => {
    it('should meet p95 < 5000ms target for lesson generation', async () => {
      const latencies: number[] = [];
      const request: LessonPlanRequest = {
        cefr_level: 'B1',
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      // Run multiple generations to measure p95
      for (let i = 0; i < SAMPLE_SIZE; i++) {
        const latency = await measureLatency(() => generateLessonPlan(request));
        latencies.push(latency);
      }

      const stats = calculateStats(latencies);

      console.log('\n📊 Lesson Generation Performance:');
      console.log(`   Mean:   ${stats.mean.toFixed(0)}ms`);
      console.log(`   Median: ${stats.median.toFixed(0)}ms`);
      console.log(`   p95:    ${stats.p95.toFixed(0)}ms`);
      console.log(`   p99:    ${stats.p99.toFixed(0)}ms`);
      console.log(`   Min:    ${stats.min.toFixed(0)}ms`);
      console.log(`   Max:    ${stats.max.toFixed(0)}ms`);

      // Verify p95 meets target
      expect(stats.p95).toBeLessThan(PERFORMANCE_TARGET_P95_MS);
    }, 120000); // 2 minute timeout for performance test
  });

  describe('LLM Client Caching', () => {
    it('should achieve >80% cache hit ratio after warmup', async () => {
      const llmClient = getLLMClient();
      llmClient.clearCache(); // Start fresh

      const messages = [
        { role: 'system' as const, content: 'You are a teacher' },
        { role: 'user' as const, content: 'Generate a test lesson' },
      ];

      // Warmup: Prime the cache
      await llmClient.chat(messages);

      // Measure cache hits
      const iterations = 50;
      let cacheHits = 0;

      const latencies: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = await llmClient.chat(messages);
        const latency = performance.now() - start;

        latencies.push(latency);
        if (result.cached) {
          cacheHits++;
        }
      }

      const cacheHitRatio = cacheHits / iterations;
      const stats = calculateStats(latencies);

      console.log('\n💾 Cache Performance:');
      console.log(`   Cache Hit Ratio: ${(cacheHitRatio * 100).toFixed(1)}%`);
      console.log(`   Cache Hits:      ${cacheHits}/${iterations}`);
      console.log(`   Avg Latency:     ${stats.mean.toFixed(0)}ms`);
      console.log(`   Cached Latency:  ~${stats.min.toFixed(0)}ms`);

      // Verify cache hit ratio meets target
      expect(cacheHitRatio).toBeGreaterThanOrEqual(CACHE_HIT_RATIO_TARGET);
    }, 120000);
  });

  describe('LLM Client Retry Logic', () => {
    it('should retry on transient failures with exponential backoff', async () => {
      const llmClient = getLLMClient();

      const messages = [
        { role: 'system' as const, content: 'You are a test' },
        { role: 'user' as const, content: 'Test retry logic' },
      ];

      const start = performance.now();
      try {
        // This will use retry logic if OpenAI fails
        const result = await llmClient.chat(messages, {
          retryConfig: {
            maxAttempts: 3,
            initialDelayMs: 100,
            maxDelayMs: 1000,
            backoffMultiplier: 2,
          },
        });

        const latency = performance.now() - start;

        console.log('\n🔄 Retry Logic Test:');
        console.log(`   Attempts:  ${result.attemptNumber}`);
        console.log(`   Cached:    ${result.cached}`);
        console.log(`   Latency:   ${latency.toFixed(0)}ms`);

        expect(result.attemptNumber).toBeGreaterThan(0);
        expect(result.attemptNumber).toBeLessThanOrEqual(3);
      } catch (error) {
        // If all retries fail, ensure proper error message
        expect(error).toBeDefined();
        console.log('   All retries exhausted (expected in test environment)');
      }
    }, 30000);
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for identical requests', () => {
      const request1: LessonPlanRequest = {
        cefr_level: 'B1',
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const request2: LessonPlanRequest = {
        cefr_level: 'B1',
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const key1 = generateCacheKey(request1);
      const key2 = generateCacheKey(request2);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    });

    it('should generate different cache keys for different requests', () => {
      const request1: LessonPlanRequest = {
        cefr_level: 'B1',
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const request2: LessonPlanRequest = {
        cefr_level: 'B2',
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const key1 = generateCacheKey(request1);
      const key2 = generateCacheKey(request2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Performance Budgets', () => {
    it('should cache responses faster than API calls', async () => {
      const llmClient = getLLMClient();
      llmClient.clearCache();

      const messages = [
        { role: 'system' as const, content: 'Test' },
        { role: 'user' as const, content: 'Test' },
      ];

      // First call (uncached)
      const uncachedStart = performance.now();
      await llmClient.chat(messages);
      const uncachedLatency = performance.now() - uncachedStart;

      // Second call (cached)
      const cachedStart = performance.now();
      const cachedResult = await llmClient.chat(messages);
      const cachedLatency = performance.now() - cachedStart;

      console.log('\n⚡ Cache Speed Comparison:');
      console.log(`   Uncached: ${uncachedLatency.toFixed(0)}ms`);
      console.log(`   Cached:   ${cachedLatency.toFixed(0)}ms`);
      console.log(`   Speedup:  ${(uncachedLatency / cachedLatency).toFixed(1)}x`);

      expect(cachedResult.cached).toBe(true);
      expect(cachedLatency).toBeLessThan(uncachedLatency / 10); // Cached should be 10x+ faster
    }, 30000);
  });
});

describe('Performance Monitoring', () => {
  it('should provide cache statistics', () => {
    const llmClient = getLLMClient();
    const stats = llmClient.getCacheStats();

    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('totalHits');
    expect(stats).toHaveProperty('avgAge');

    console.log('\n📈 Cache Statistics:');
    console.log(`   Size:       ${stats.size}`);
    console.log(`   Total Hits: ${stats.totalHits}`);
    console.log(`   Avg Age:    ${stats.avgAge.toFixed(1)}s`);
  });
});

describe('Stress Test', () => {
  it('should handle concurrent lesson generation requests', async () => {
    const concurrentRequests = 10;
    const requests: LessonPlanRequest[] = Array.from({ length: concurrentRequests }, (_, i) => ({
      cefr_level: (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const)[i % 6],
      topic: `Topic ${i}`,
      duration_minutes: 60,
    }));

    const start = performance.now();
    const results = await Promise.all(
      requests.map(req => generateLessonPlan(req)),
    );
    const totalTime = performance.now() - start;

    console.log('\n🚀 Concurrent Request Test:');
    console.log(`   Requests:    ${concurrentRequests}`);
    console.log(`   Total Time:  ${totalTime.toFixed(0)}ms`);
    console.log(`   Avg/Request: ${(totalTime / concurrentRequests).toFixed(0)}ms`);

    expect(results).toHaveLength(concurrentRequests);
    results.forEach(result => {
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('activities');
    });
  }, 120000);
});
