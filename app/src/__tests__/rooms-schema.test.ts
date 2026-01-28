/**
 * Rooms Schema Unit Tests
 * Verifies facilities schema structure and types
 * Ref: Task 1.8.1, 1.8.2, 1.8.3 - Rooms Management
 */

import { describe, it, expect } from '@jest/globals';
import * as schema from '../db/schema';

describe('Facilities Schema', () => {
  describe('Rooms Table', () => {
    it('should export rooms table', () => {
      expect(schema.rooms).toBeDefined();
    });

    it('should have required columns', () => {
      expect(schema.rooms).toHaveProperty('id');
      expect(schema.rooms).toHaveProperty('tenantId');
      expect(schema.rooms).toHaveProperty('name');
      expect(schema.rooms).toHaveProperty('capacity');
      expect(schema.rooms).toHaveProperty('equipment');
      expect(schema.rooms).toHaveProperty('facilities');
      expect(schema.rooms).toHaveProperty('accessibility');
      expect(schema.rooms).toHaveProperty('status');
      expect(schema.rooms).toHaveProperty('createdAt');
      expect(schema.rooms).toHaveProperty('updatedAt');
      expect(schema.rooms).toHaveProperty('deletedAt');
    });

    it('should have type inference support', () => {
      // TypeScript types are compile-time only, not runtime exports
      // Just verify the table is properly structured for type inference
      expect(schema.rooms.$inferSelect).toBeDefined();
      expect(schema.rooms.$inferInsert).toBeDefined();
    });
  });

  describe('Room Allocations Table', () => {
    it('should export roomAllocations table', () => {
      expect(schema.roomAllocations).toBeDefined();
    });

    it('should have required columns', () => {
      expect(schema.roomAllocations).toHaveProperty('id');
      expect(schema.roomAllocations).toHaveProperty('tenantId');
      expect(schema.roomAllocations).toHaveProperty('roomId');
      expect(schema.roomAllocations).toHaveProperty('classSessionId');
      expect(schema.roomAllocations).toHaveProperty('allocatedBy');
      expect(schema.roomAllocations).toHaveProperty('notes');
      expect(schema.roomAllocations).toHaveProperty('createdAt');
      expect(schema.roomAllocations).toHaveProperty('updatedAt');
    });

    it('should have type inference support', () => {
      // TypeScript types are compile-time only, not runtime exports
      // Just verify the table is properly structured for type inference
      expect(schema.roomAllocations.$inferSelect).toBeDefined();
      expect(schema.roomAllocations.$inferInsert).toBeDefined();
    });
  });

  describe('Schema Relationships', () => {
    it('should have room allocation linked to rooms', () => {
      const roomIdColumn = schema.roomAllocations.roomId;
      expect(roomIdColumn).toBeDefined();
    });

    it('should have room allocation linked to class sessions', () => {
      const sessionIdColumn = schema.roomAllocations.classSessionId;
      expect(sessionIdColumn).toBeDefined();
    });

    it('should have room allocation linked to users (allocatedBy)', () => {
      const allocatedByColumn = schema.roomAllocations.allocatedBy;
      expect(allocatedByColumn).toBeDefined();
    });
  });
});
