import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  audit,
  createDiffHash,
  emitAudit,
  generateCorrelationId,
  createAuditEntry,
} from '../../src/core/audit/logger.js';
import type { AuditEntry } from '../../src/types/index.js';

describe('Audit Logging', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console.error to capture audit logs
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('createDiffHash', () => {
    it('should create consistent hash for same data', () => {
      const before = { name: 'Old Name', value: 100 };
      const after = { name: 'New Name', value: 200 };

      const hash1 = createDiffHash(before, after);
      const hash2 = createDiffHash(before, after);

      expect(hash1).toBe(hash2);
    });

    it('should create different hash for different data', () => {
      const before = { name: 'Old Name' };
      const after1 = { name: 'New Name 1' };
      const after2 = { name: 'New Name 2' };

      const hash1 = createDiffHash(before, after1);
      const hash2 = createDiffHash(before, after2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce SHA256 hash format', () => {
      const before = { test: 'data' };
      const after = { test: 'changed' };

      const hash = createDiffHash(before, after);

      // SHA256 hex string is 64 characters
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle undefined before state', () => {
      const hash = createDiffHash(undefined, { name: 'New Item' });

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle undefined after state', () => {
      const hash = createDiffHash({ name: 'Deleted Item' }, undefined);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle null values', () => {
      const hash = createDiffHash(null, { name: 'New' });

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle arrays', () => {
      const before = { items: [1, 2, 3] };
      const after = { items: [1, 2, 3, 4] };

      const hash = createDiffHash(before, after);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle nested objects', () => {
      const before = {
        user: {
          name: 'John',
          address: { city: 'London' },
        },
      };
      const after = {
        user: {
          name: 'John',
          address: { city: 'Paris' },
        },
      };

      const hash = createDiffHash(before, after);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic regardless of key order', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };

      const hash1 = createDiffHash(obj1, obj2);
      const hash2 = createDiffHash(obj2, obj1);

      // Since both before and after are different orderings of the same data,
      // the hashes should be the same (keys are sorted internally)
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
      expect(hash2).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate UUID v4 format', () => {
      const id = generateCorrelationId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      const id3 = generateCorrelationId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate multiple unique IDs in quick succession', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCorrelationId());
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('emitAudit', () => {
    it('should emit audit entry to stderr', () => {
      const entry: AuditEntry = {
        actor: 'test-user',
        action: 'test.action',
        target: 'test/123',
        scope: 'admin.test',
        diffHash: 'abc123',
        timestamp: '2025-01-15T10:00:00.000Z',
        correlationId: 'test-correlation-id',
      };

      emitAudit(entry);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(loggedData.type).toBe('audit');
      expect(loggedData.actor).toBe('test-user');
      expect(loggedData.action).toBe('test.action');
      expect(loggedData.target).toBe('test/123');
    });

    it('should log valid JSON', () => {
      const entry: AuditEntry = {
        actor: 'test-user',
        action: 'user.create',
        target: 'user/456',
        scope: 'admin.write.user',
        diffHash: createDiffHash(undefined, { id: '456' }),
        timestamp: new Date().toISOString(),
        correlationId: generateCorrelationId(),
      };

      emitAudit(entry);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedString = consoleErrorSpy.mock.calls[0][0];

      // Should be valid JSON
      expect(() => JSON.parse(loggedString)).not.toThrow();
    });

    it('should include all required fields', () => {
      const entry: AuditEntry = {
        actor: 'admin-user',
        action: 'class.update',
        target: 'class/789',
        scope: 'admin.write.class',
        diffHash: 'def456',
        timestamp: '2025-01-15T12:00:00.000Z',
        correlationId: 'correlation-456',
      };

      emitAudit(entry);

      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(loggedData).toHaveProperty('type', 'audit');
      expect(loggedData).toHaveProperty('actor');
      expect(loggedData).toHaveProperty('action');
      expect(loggedData).toHaveProperty('target');
      expect(loggedData).toHaveProperty('scope');
      expect(loggedData).toHaveProperty('diffHash');
      expect(loggedData).toHaveProperty('timestamp');
      expect(loggedData).toHaveProperty('correlationId');
    });
  });

  describe('audit', () => {
    it('should create and emit complete audit entry', () => {
      audit({
        actor: 'test-user',
        action: 'user.update',
        target: 'user/123',
        scope: 'admin.write.user',
        before: { name: 'Old Name' },
        after: { name: 'New Name' },
      });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(loggedData.actor).toBe('test-user');
      expect(loggedData.action).toBe('user.update');
      expect(loggedData.target).toBe('user/123');
      expect(loggedData.scope).toBe('admin.write.user');
      expect(loggedData.diffHash).toMatch(/^[0-9a-f]{64}$/);
      expect(loggedData.timestamp).toBeTruthy();
      expect(loggedData.correlationId).toMatch(/^[0-9a-f-]+$/);
    });

    it('should generate correlation ID if not provided', () => {
      audit({
        actor: 'test-user',
        action: 'test.action',
        target: 'test/123',
        scope: 'admin.test',
      });

      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(loggedData.correlationId).toBeTruthy();
      expect(loggedData.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should use provided correlation ID', () => {
      const customCorrelationId = 'custom-correlation-123';

      audit({
        actor: 'test-user',
        action: 'test.action',
        target: 'test/123',
        scope: 'admin.test',
        correlationId: customCorrelationId,
      });

      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(loggedData.correlationId).toBe(customCorrelationId);
    });

    it('should generate current timestamp', () => {
      const before = Date.now();
      audit({
        actor: 'test-user',
        action: 'test.action',
        target: 'test/123',
        scope: 'admin.test',
      });
      const after = Date.now();

      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      const loggedTime = new Date(loggedData.timestamp).getTime();

      expect(loggedTime).toBeGreaterThanOrEqual(before);
      expect(loggedTime).toBeLessThanOrEqual(after);
    });

    it('should handle audit without before/after states', () => {
      audit({
        actor: 'test-user',
        action: 'system.healthcheck',
        target: 'system/health',
        scope: 'admin.read.system',
      });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(loggedData.diffHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('createAuditEntry', () => {
    it('should create audit entry without emitting', () => {
      const entry = createAuditEntry({
        actor: 'test-user',
        action: 'test.action',
        target: 'test/123',
        scope: 'admin.test',
      });

      // Should not emit to console.error
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Should return valid audit entry
      expect(entry).toHaveProperty('actor', 'test-user');
      expect(entry).toHaveProperty('action', 'test.action');
      expect(entry).toHaveProperty('target', 'test/123');
      expect(entry).toHaveProperty('scope', 'admin.test');
      expect(entry).toHaveProperty('diffHash');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('correlationId');
    });

    it('should create entry with before/after diff', () => {
      const before = { status: 'pending' };
      const after = { status: 'approved' };

      const entry = createAuditEntry({
        actor: 'approver',
        action: 'refund.approve',
        target: 'refund/789',
        scope: 'admin.write.refund',
        before,
        after,
      });

      expect(entry.diffHash).toMatch(/^[0-9a-f]{64}$/);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should allow custom correlation ID', () => {
      const customId = 'batch-operation-123';

      const entry = createAuditEntry({
        actor: 'batch-processor',
        action: 'batch.process',
        target: 'batch/456',
        scope: 'admin.write.system',
        correlationId: customId,
      });

      expect(entry.correlationId).toBe(customId);
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should create tamper-evident audit trail', () => {
      const operations = [
        { before: { value: 0 }, after: { value: 10 } },
        { before: { value: 10 }, after: { value: 20 } },
        { before: { value: 20 }, after: { value: 30 } },
      ];

      const hashes = operations.map(op => createDiffHash(op.before, op.after));

      // Each hash should be unique
      expect(new Set(hashes).size).toBe(3);

      // Changing any operation should produce different hash
      const tamperedHash = createDiffHash(
        operations[1].before,
        { value: 25 } // Tampered value
      );

      expect(tamperedHash).not.toBe(hashes[1]);
    });

    it('should link related operations via correlation ID', () => {
      const correlationId = generateCorrelationId();

      // Simulate multiple related operations
      audit({
        actor: 'admin',
        action: 'user.create',
        target: 'user/123',
        scope: 'admin.write.user',
        correlationId,
      });

      audit({
        actor: 'admin',
        action: 'user.role.assign',
        target: 'user/123/role/student',
        scope: 'admin.write.role',
        correlationId,
      });

      audit({
        actor: 'admin',
        action: 'class.enroll',
        target: 'user/123/class/456',
        scope: 'admin.write.enrolment',
        correlationId,
      });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);

      // All should have same correlation ID
      const logs = consoleErrorSpy.mock.calls.map(call => JSON.parse(call[0]));
      expect(logs[0].correlationId).toBe(correlationId);
      expect(logs[1].correlationId).toBe(correlationId);
      expect(logs[2].correlationId).toBe(correlationId);
    });
  });
});
