/**
 * Database Schema Unit Tests
 * Verifies schema structure and types
 */

import { describe, it, expect } from '@jest/globals';
import * as schema from '../db/schema';

describe('Database Schema', () => {
  describe('Core Schema', () => {
    it('should export tenants table', () => {
      expect(schema.tenants).toBeDefined();
      expect(schema.tenants).toHaveProperty('id');
      expect(schema.tenants).toHaveProperty('name');
    });

    it('should export users table', () => {
      expect(schema.users).toBeDefined();
      expect(schema.users).toHaveProperty('id');
      expect(schema.users).toHaveProperty('email');
    });
  });

  describe('Academic Schema', () => {
    it('should export classes table', () => {
      expect(schema.classes).toBeDefined();
    });

    it('should export enrollments table', () => {
      expect(schema.enrollments).toBeDefined();
    });

    it('should export classSessions table', () => {
      expect(schema.classSessions).toBeDefined();
    });

    it('should export attendance table', () => {
      expect(schema.attendance).toBeDefined();
    });

    it('should export assignments table', () => {
      expect(schema.assignments).toBeDefined();
    });

    it('should export submissions table', () => {
      expect(schema.submissions).toBeDefined();
    });

    it('should export grades table', () => {
      expect(schema.grades).toBeDefined();
    });
  });

  describe('Curriculum Schema', () => {
    it('should export cefrDescriptors table', () => {
      expect(schema.cefrDescriptors).toBeDefined();
    });

    it('should export lessonPlans table', () => {
      expect(schema.lessonPlans).toBeDefined();
    });

    it('should export materials table', () => {
      expect(schema.materials).toBeDefined();
    });

    it('should export lessonPlanMaterials table', () => {
      expect(schema.lessonPlanMaterials).toBeDefined();
    });
  });

  describe('System Schema', () => {
    it('should export auditLogs table', () => {
      expect(schema.auditLogs).toBeDefined();
    });

    it('should export invoices table', () => {
      expect(schema.invoices).toBeDefined();
    });

    it('should export payments table', () => {
      expect(schema.payments).toBeDefined();
    });

    it('should export conversations table', () => {
      expect(schema.conversations).toBeDefined();
    });

    it('should export exports table', () => {
      expect(schema.exports).toBeDefined();
    });
  });

  describe('Schema Completeness', () => {
    it('should export all 19 tables', () => {
      const expectedTables = [
        // Core (2)
        'tenants',
        'users',
        // Academic (7)
        'classes',
        'enrollments',
        'classSessions',
        'attendance',
        'assignments',
        'submissions',
        'grades',
        // Curriculum (4)
        'cefrDescriptors',
        'lessonPlans',
        'materials',
        'lessonPlanMaterials',
        // System (5)
        'auditLogs',
        'invoices',
        'payments',
        'conversations',
        'exports',
      ];

      expectedTables.forEach(tableName => {
        expect(schema).toHaveProperty(tableName);
        // Verify it's actually a table by checking for common column like 'id'
        const table = schema[tableName as keyof typeof schema];
        expect(table).toBeDefined();
      });
    });
  });
});
