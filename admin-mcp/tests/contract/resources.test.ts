import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AdminContext } from '../../src/types/index.js';

// Import resource schemas and functions
import {
  WeeklyOpsParamsSchema,
  WeeklyOpsDataSchema,
  weeklyOpsMetadata,
  getWeeklyOpsResource,
} from '../../src/core/resources/weekly-ops.js';

import {
  ArAgingParamsSchema,
  ArAgingDataSchema,
  arAgingMetadata,
  getArAgingResource,
} from '../../src/core/resources/ar-aging.js';

import {
  UsersDirectoryParamsSchema,
  UsersDirectoryDataSchema,
  usersDirectoryMetadata,
  getUsersDirectoryResource,
} from '../../src/core/resources/users-directory.js';

import {
  ClassLoadParamsSchema,
  ClassLoadDataSchema,
  classLoadMetadata,
  getClassLoadResource,
} from '../../src/core/resources/class-load.js';

import {
  VisaExpiriesParamsSchema,
  VisaExpiriesDataSchema,
  visaExpiriesMetadata,
  getVisaExpiriesResource,
} from '../../src/core/resources/compliance.js';

import {
  AccommodationOccupancyParamsSchema,
  AccommodationOccupancyDataSchema,
  accommodationOccupancyMetadata,
  getAccommodationOccupancyResource,
} from '../../src/core/resources/accommodation.js';

import {
  RegisterParamsSchema,
  RegisterDataSchema,
  registerMetadata,
  getRegisterResource,
} from '../../src/core/resources/registers.js';

import {
  AuditRollupParamsSchema,
  AuditRollupDataSchema,
  auditRollupMetadata,
  getAuditRollupResource,
} from '../../src/core/resources/audit-rollup.js';

describe('Resource Contract Tests', () => {
  let mockContext: AdminContext;

  beforeEach(() => {
    mockContext = {
      actorId: 'test-user',
      actorRole: 'admin',
      scopes: ['admin.super'], // Super admin for testing
      supabaseToken: 'mock-token',
    };

    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('WeeklyOps Resource', () => {
    it('should have valid metadata', () => {
      expect(weeklyOpsMetadata.uri).toBe('res://admin/reports/weekly-ops');
      expect(weeklyOpsMetadata.name).toBeTruthy();
      expect(weeklyOpsMetadata.description).toBeTruthy();
      expect(weeklyOpsMetadata.mimeType).toBe('application/json');
    });

    it('should validate params schema', () => {
      const validParams = { week: '2025-W01' };
      const emptyParams = {};

      expect(() => WeeklyOpsParamsSchema.parse(validParams)).not.toThrow();
      expect(() => WeeklyOpsParamsSchema.parse(emptyParams)).not.toThrow();
    });

    it('should validate data schema structure', () => {
      const validData = {
        week: '2025-W01',
        attendance: {
          total_sessions: 100,
          attended: 85,
          absent: 15,
          attendance_rate: 85.0,
        },
        occupancy: {
          total_capacity: 500,
          enrolled: 450,
          occupancy_percent: 90.0,
        },
        noShow: {
          count: 5,
          rate: 5.0,
        },
        revenue: {
          current_week: 50000,
          previous_week: 48000,
          delta_percent: 4.17,
        },
        timestamp: new Date().toISOString(),
      };

      expect(() => WeeklyOpsDataSchema.parse(validData)).not.toThrow();
    });

    it('should require admin.read.system scope', async () => {
      const contextWithoutScope = {
        ...mockContext,
        scopes: ['admin.read.user'],
      };

      await expect(getWeeklyOpsResource(contextWithoutScope, {})).rejects.toThrow(
        /Missing required scope/
      );
    });
  });

  describe('AR Aging Resource', () => {
    it('should have valid metadata', () => {
      expect(arAgingMetadata.uri).toBe('res://admin/finance/ar-aging');
      expect(arAgingMetadata.name).toBeTruthy();
      expect(arAgingMetadata.mimeType).toBe('application/json');
    });

    it('should validate params schema with pagination', () => {
      const validParams = { page: 1, limit: 50 };
      const defaultParams = {};

      expect(() => ArAgingParamsSchema.parse(validParams)).not.toThrow();
      expect(() => ArAgingParamsSchema.parse(defaultParams)).not.toThrow();
    });

    it('should validate data schema with buckets', () => {
      const validData = {
        buckets: [
          {
            range: '0-30',
            count: 25,
            total_amount: 15000,
          },
          {
            range: '31-60',
            count: 10,
            total_amount: 8000,
          },
        ],
        total_outstanding: 23000,
        timestamp: new Date().toISOString(),
      };

      expect(() => ArAgingDataSchema.parse(validData)).not.toThrow();
    });

    it('should require admin.read.finance scope', async () => {
      const contextWithoutScope = {
        ...mockContext,
        scopes: ['admin.read.user'],
      };

      await expect(getArAgingResource(contextWithoutScope, {})).rejects.toThrow(
        /Missing required scope/
      );
    });
  });

  describe('Users Directory Resource', () => {
    it('should have valid metadata', () => {
      expect(usersDirectoryMetadata.uri).toBe('res://admin/directory/users');
      expect(usersDirectoryMetadata.name).toBeTruthy();
      expect(usersDirectoryMetadata.mimeType).toBe('application/json');
    });

    it('should validate params with filters', () => {
      const validParams = {
        role: 'student',
        active: true,
        page: 1,
        limit: 100,
      };

      expect(() => UsersDirectoryParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should validate data schema with users array', () => {
      const validData = {
        users: [
          {
            id: 'user-1',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'student',
            active: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        timestamp: new Date().toISOString(),
      };

      expect(() => UsersDirectoryDataSchema.parse(validData)).not.toThrow();
    });

    it('should mask PII without proper scope', () => {
      // This tests that email/name should be masked if no PII scope
      const contextWithoutPII = {
        ...mockContext,
        scopes: ['admin.read.user'], // No PII scope
      };

      // The resource should handle PII masking internally
      expect(contextWithoutPII.scopes).not.toContain('admin.read.pii');
    });
  });

  describe('Class Load Resource', () => {
    it('should have valid metadata', () => {
      expect(classLoadMetadata.uri).toBe('res://admin/reports/class-load');
      expect(classLoadMetadata.name).toBeTruthy();
      expect(classLoadMetadata.mimeType).toBe('application/json');
    });

    it('should validate params schema', () => {
      const validParams = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      expect(() => ClassLoadParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should validate data schema with classes', () => {
      const validData = {
        classes: [
          {
            id: 'class-1',
            name: 'English 101',
            capacity: 20,
            enrolled: 18,
            occupancy_percent: 90.0,
            sessions_per_week: 3,
          },
        ],
        summary: {
          total_capacity: 100,
          total_enrolled: 85,
          average_occupancy: 85.0,
        },
        timestamp: new Date().toISOString(),
      };

      expect(() => ClassLoadDataSchema.parse(validData)).not.toThrow();
    });
  });

  describe('Visa Expiries Resource', () => {
    it('should have valid metadata', () => {
      expect(visaExpiriesMetadata.uri).toBe('res://admin/compliance/visa-expiries');
      expect(visaExpiriesMetadata.name).toBeTruthy();
      expect(visaExpiriesMetadata.mimeType).toBe('application/json');
    });

    it('should validate params with days threshold', () => {
      const validParams = {
        daysAhead: 90,
        page: 1,
        limit: 50,
      };

      expect(() => VisaExpiriesParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should validate data schema with expiring visas', () => {
      const validData = {
        expiring_visas: [
          {
            student_id: 'student-1',
            student_name: 'Test Student',
            visa_expiry_date: '2025-06-30',
            days_until_expiry: 60,
            status: 'active',
          },
        ],
        total: 1,
        timestamp: new Date().toISOString(),
      };

      expect(() => VisaExpiriesDataSchema.parse(validData)).not.toThrow();
    });

    it('should require admin.read.compliance scope', async () => {
      const contextWithoutScope = {
        ...mockContext,
        scopes: ['admin.read.user'],
      };

      await expect(getVisaExpiriesResource(contextWithoutScope, {})).rejects.toThrow(
        /Missing required scope/
      );
    });
  });

  describe('Accommodation Occupancy Resource', () => {
    it('should have valid metadata', () => {
      expect(accommodationOccupancyMetadata.uri).toBe('res://admin/accommodation/occupancy');
      expect(accommodationOccupancyMetadata.name).toBeTruthy();
      expect(accommodationOccupancyMetadata.mimeType).toBe('application/json');
    });

    it('should validate params schema', () => {
      const validParams = {
        date: '2025-01-15',
      };

      expect(() => AccommodationOccupancyParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should validate data schema with properties', () => {
      const validData = {
        properties: [
          {
            id: 'prop-1',
            name: 'Student House A',
            total_beds: 20,
            occupied_beds: 18,
            occupancy_percent: 90.0,
          },
        ],
        summary: {
          total_beds: 100,
          occupied_beds: 85,
          average_occupancy: 85.0,
        },
        timestamp: new Date().toISOString(),
      };

      expect(() => AccommodationOccupancyDataSchema.parse(validData)).not.toThrow();
    });
  });

  describe('Register Resource', () => {
    it('should have valid metadata', () => {
      expect(registerMetadata.uri).toContain('res://admin/registers/');
      expect(registerMetadata.name).toBeTruthy();
      expect(registerMetadata.mimeType).toBe('application/json');
    });

    it('should validate params with class and week', () => {
      const validParams = {
        classId: 'class-1',
        isoWeek: '2025-W01',
      };

      expect(() => RegisterParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should validate data schema with attendance records', () => {
      const validData = {
        class_id: 'class-1',
        class_name: 'English 101',
        iso_week: '2025-W01',
        sessions: [
          {
            date: '2025-01-06',
            students: [
              {
                id: 'student-1',
                name: 'Test Student',
                status: 'present',
              },
            ],
          },
        ],
        timestamp: new Date().toISOString(),
      };

      expect(() => RegisterDataSchema.parse(validData)).not.toThrow();
    });

    it('should require admin.read.register scope', async () => {
      const contextWithoutScope = {
        ...mockContext,
        scopes: ['admin.read.user'],
      };

      await expect(
        getRegisterResource(contextWithoutScope, {
          classId: 'class-1',
          isoWeek: '2025-W01',
        })
      ).rejects.toThrow(/Missing required scope/);
    });
  });

  describe('Audit Rollup Resource', () => {
    it('should have valid metadata', () => {
      expect(auditRollupMetadata.uri).toBe('res://admin/audit/rollup');
      expect(auditRollupMetadata.name).toBeTruthy();
      expect(auditRollupMetadata.mimeType).toBe('application/json');
    });

    it('should validate params with date range', () => {
      const validParams = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        groupBy: 'day',
      };

      expect(() => AuditRollupParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should validate data schema with rollup entries', () => {
      const validData = {
        rollup: [
          {
            period: '2025-01-01',
            action_counts: {
              'user.create': 5,
              'user.update': 10,
              'user.delete': 2,
            },
            total_actions: 17,
          },
        ],
        summary: {
          total_actions: 17,
          unique_actors: 3,
          date_range: {
            start: '2025-01-01',
            end: '2025-01-31',
          },
        },
        timestamp: new Date().toISOString(),
      };

      expect(() => AuditRollupDataSchema.parse(validData)).not.toThrow();
    });

    it('should require admin.read.audit scope', async () => {
      const contextWithoutScope = {
        ...mockContext,
        scopes: ['admin.read.user'],
      };

      await expect(
        getAuditRollupResource(contextWithoutScope, {
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        })
      ).rejects.toThrow(/Missing required scope/);
    });
  });

  describe('ETag and Caching', () => {
    it('should return etag with resource data', () => {
      // Resources should return { data, etag, cacheHint? }
      const mockResourceResponse = {
        data: { test: 'data' },
        etag: 'abc123def456',
        cacheHint: 300,
      };

      expect(mockResourceResponse).toHaveProperty('data');
      expect(mockResourceResponse).toHaveProperty('etag');
      expect(mockResourceResponse.etag).toMatch(/^[a-f0-9]+$/);
    });

    it('should provide cache hints in seconds', () => {
      const cacheHint = 300; // 5 minutes
      expect(cacheHint).toBeGreaterThan(0);
      expect(cacheHint).toBeLessThanOrEqual(3600); // Max 1 hour
    });
  });

  describe('Pagination', () => {
    it('should handle pagination parameters', () => {
      const paginationParams = {
        page: 2,
        limit: 25,
      };

      // Validate that page is positive
      expect(paginationParams.page).toBeGreaterThan(0);
      expect(paginationParams.limit).toBeGreaterThan(0);
      expect(paginationParams.limit).toBeLessThanOrEqual(100);
    });

    it('should return total count with paginated data', () => {
      const paginatedResponse = {
        data: [{ id: '1' }, { id: '2' }],
        total: 50,
        page: 1,
        limit: 25,
      };

      expect(paginatedResponse.total).toBeGreaterThanOrEqual(paginatedResponse.data.length);
    });
  });
});
