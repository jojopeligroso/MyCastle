/**
 * Hash-Chain Tests
 * T-052: Test hash chain integrity
 */

import {
  computeAttendanceHash,
  validateAttendanceHash,
  validateHashChain,
  getLastHash,
  isWithinEditWindow,
  AttendanceHashPayload,
} from '@/lib/hash-chain';

describe('Hash-Chain', () => {
  describe('computeAttendanceHash', () => {
    it('should compute consistent hash for same payload', () => {
      const payload: AttendanceHashPayload = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        classSessionId: '123e4567-e89b-12d3-a456-426614174001',
        studentId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'present',
        recordedBy: '123e4567-e89b-12d3-a456-426614174003',
        recordedAt: '2025-01-01T10:00:00.000Z',
        notes: 'Test note',
      };

      const hash1 = computeAttendanceHash(payload);
      const hash2 = computeAttendanceHash(payload);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 = 64 hex chars
    });

    it('should compute different hash for different payloads', () => {
      const payload1: AttendanceHashPayload = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        classSessionId: '123e4567-e89b-12d3-a456-426614174001',
        studentId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'present',
        recordedBy: '123e4567-e89b-12d3-a456-426614174003',
        recordedAt: '2025-01-01T10:00:00.000Z',
      };

      const payload2: AttendanceHashPayload = {
        ...payload1,
        status: 'absent', // Different status
      };

      const hash1 = computeAttendanceHash(payload1);
      const hash2 = computeAttendanceHash(payload2);

      expect(hash1).not.toBe(hash2);
    });

    it('should chain hashes correctly', () => {
      const payload: AttendanceHashPayload = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        classSessionId: '123e4567-e89b-12d3-a456-426614174001',
        studentId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'present',
        recordedBy: '123e4567-e89b-12d3-a456-426614174003',
        recordedAt: '2025-01-01T10:00:00.000Z',
      };

      const hash1 = computeAttendanceHash(payload, null); // First record
      const hash2 = computeAttendanceHash(payload, hash1); // Second record chained to first

      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash2).toHaveLength(64);
    });
  });

  describe('validateAttendanceHash', () => {
    it('should validate correct hash', () => {
      const recordedAt = new Date('2025-01-01T10:00:00.000Z');

      const payload: AttendanceHashPayload = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        classSessionId: '123e4567-e89b-12d3-a456-426614174001',
        studentId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'present',
        recordedBy: '123e4567-e89b-12d3-a456-426614174003',
        recordedAt,
      };

      const hash = computeAttendanceHash(payload);

      const record = {
        id: '123e4567-e89b-12d3-a456-426614174100',
        tenantId: payload.tenantId,
        classSessionId: payload.classSessionId,
        studentId: payload.studentId,
        status: payload.status,
        recordedBy: payload.recordedBy,
        recordedAt: recordedAt,
        hash,
        previousHash: null,
      };

      const validation = validateAttendanceHash(record, null);

      expect(validation.isValid).toBe(true);
      expect(validation.computedHash).toBe(hash);
    });

    it('should detect tampered hash', () => {
      const recordedAt = new Date('2025-01-01T10:00:00.000Z');

      const record = {
        id: '123e4567-e89b-12d3-a456-426614174100',
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        classSessionId: '123e4567-e89b-12d3-a456-426614174001',
        studentId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'present',
        recordedBy: '123e4567-e89b-12d3-a456-426614174003',
        recordedAt: recordedAt,
        hash: 'tampered_hash_0000000000000000000000000000000000000000000000000000',
        previousHash: null,
      };

      const validation = validateAttendanceHash(record, null);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('tampered');
    });
  });

  describe('validateHashChain', () => {
    it('should validate valid hash chain', () => {
      const recordedAt = new Date('2025-01-01T10:00:00.000Z');

      const payload1: AttendanceHashPayload = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        classSessionId: '123e4567-e89b-12d3-a456-426614174001',
        studentId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'present',
        recordedBy: '123e4567-e89b-12d3-a456-426614174003',
        recordedAt,
      };

      const hash1 = computeAttendanceHash(payload1, null);

      const payload2: AttendanceHashPayload = {
        ...payload1,
        studentId: '123e4567-e89b-12d3-a456-426614174004', // Different student
      };

      const hash2 = computeAttendanceHash(payload2, hash1);

      const records = [
        {
          id: '123e4567-e89b-12d3-a456-426614174100',
          tenantId: payload1.tenantId,
          classSessionId: payload1.classSessionId,
          studentId: payload1.studentId,
          status: payload1.status,
          recordedBy: payload1.recordedBy,
          recordedAt: recordedAt,
          hash: hash1,
          previousHash: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174101',
          tenantId: payload2.tenantId,
          classSessionId: payload2.classSessionId,
          studentId: payload2.studentId,
          status: payload2.status,
          recordedBy: payload2.recordedBy,
          recordedAt: recordedAt,
          hash: hash2,
          previousHash: hash1,
        },
      ];

      const validation = validateHashChain(records);

      expect(validation.isValid).toBe(true);
      expect(validation.totalRecords).toBe(2);
      expect(validation.validRecords).toBe(2);
      expect(validation.invalidRecords).toHaveLength(0);
    });

    it('should detect broken hash chain', () => {
      const recordedAt = new Date('2025-01-01T10:00:00.000Z');

      const records = [
        {
          id: '123e4567-e89b-12d3-a456-426614174100',
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          classSessionId: '123e4567-e89b-12d3-a456-426614174001',
          studentId: '123e4567-e89b-12d3-a456-426614174002',
          status: 'present',
          recordedBy: '123e4567-e89b-12d3-a456-426614174003',
          recordedAt: recordedAt,
          hash: 'hash1_0000000000000000000000000000000000000000000000000000000',
          previousHash: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174101',
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          classSessionId: '123e4567-e89b-12d3-a456-426614174001',
          studentId: '123e4567-e89b-12d3-a456-426614174004',
          status: 'present',
          recordedBy: '123e4567-e89b-12d3-a456-426614174003',
          recordedAt: recordedAt,
          hash: 'hash2_0000000000000000000000000000000000000000000000000000000',
          previousHash: 'wrong_previous_hash_00000000000000000000000000000000000', // Wrong!
        },
      ];

      const validation = validateHashChain(records);

      expect(validation.isValid).toBe(false);
      expect(validation.invalidRecords.length).toBeGreaterThan(0);
    });
  });

  describe('getLastHash', () => {
    it('should return null for empty chain', () => {
      const lastHash = getLastHash([]);
      expect(lastHash).toBeNull();
    });

    it('should return last hash in chain', () => {
      const records = [
        { hash: 'hash1', createdAt: new Date('2025-01-01T10:00:00Z') },
        { hash: 'hash2', createdAt: new Date('2025-01-01T10:01:00Z') },
        { hash: 'hash3', createdAt: new Date('2025-01-01T10:02:00Z') },
      ];

      const lastHash = getLastHash(records);
      expect(lastHash).toBe('hash3');
    });
  });

  describe('isWithinEditWindow', () => {
    it('should return true within 48 hours', () => {
      const recordedAt = new Date('2025-01-01T10:00:00Z');
      const editAttemptAt = new Date('2025-01-02T09:00:00Z'); // 23 hours later

      expect(isWithinEditWindow(recordedAt, editAttemptAt)).toBe(true);
    });

    it('should return false after 48 hours', () => {
      const recordedAt = new Date('2025-01-01T10:00:00Z');
      const editAttemptAt = new Date('2025-01-04T10:00:01Z'); // > 48 hours later

      expect(isWithinEditWindow(recordedAt, editAttemptAt)).toBe(false);
    });

    it('should return true exactly at 48 hours', () => {
      const recordedAt = new Date('2025-01-01T10:00:00Z');
      const editAttemptAt = new Date('2025-01-03T10:00:00Z'); // Exactly 48 hours

      expect(isWithinEditWindow(recordedAt, editAttemptAt)).toBe(true);
    });
  });
});
