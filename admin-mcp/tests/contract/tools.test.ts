import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { AdminContext } from '../../src/types/index.js';
import { SCOPES } from '../../src/core/auth/scopes.js';

// Import tool schemas and execution functions
import {
  CreateUserInputSchema,
  CreateUserOutputSchema,
  executeCreateUser,
  createUserMetadata,
} from '../../src/core/tools/create-user.js';

import {
  UpdateUserInputSchema,
  UpdateUserOutputSchema,
  executeUpdateUser,
  updateUserMetadata,
} from '../../src/core/tools/update-user.js';

import {
  AssignRoleInputSchema,
  AssignRoleOutputSchema,
  executeAssignRole,
  assignRoleMetadata,
} from '../../src/core/tools/assign-role.js';

import {
  CreateClassInputSchema,
  CreateClassOutputSchema,
  executeCreateClass,
  createClassMetadata,
} from '../../src/core/tools/create-class.js';

import {
  PlanRosterInputSchema,
  PlanRosterOutputSchema,
  executePlanRoster,
  planRosterMetadata,
} from '../../src/core/tools/plan-roster.js';

import {
  RecordAttendanceInputSchema,
  RecordAttendanceOutputSchema,
  executeRecordAttendance,
  recordAttendanceMetadata,
} from '../../src/core/tools/record-attendance.js';

import {
  AdjustEnrolmentInputSchema,
  AdjustEnrolmentOutputSchema,
  executeAdjustEnrolment,
  adjustEnrolmentMetadata,
} from '../../src/core/tools/adjust-enrolment.js';

import {
  GenRegisterCsvInputSchema,
  GenRegisterCsvOutputSchema,
  executeGenRegisterCsv,
  genRegisterCsvMetadata,
} from '../../src/core/tools/gen-register-csv.js';

import {
  ArSnapshotInputSchema,
  ArSnapshotOutputSchema,
  executeArSnapshot,
  arSnapshotMetadata,
} from '../../src/core/tools/ar-snapshot.js';

import {
  RaiseRefundReqInputSchema,
  RaiseRefundReqOutputSchema,
  executeRaiseRefundReq,
  raiseRefundReqMetadata,
} from '../../src/core/tools/raise-refund-req.js';

import {
  AddAccommodationInputSchema,
  AddAccommodationOutputSchema,
  executeAddAccommodation,
  addAccommodationMetadata,
} from '../../src/core/tools/add-accommodation.js';

import {
  VendorStatusInputSchema,
  VendorStatusOutputSchema,
  executeVendorStatus,
  vendorStatusMetadata,
} from '../../src/core/tools/vendor-status.js';

import {
  CompliancePackInputSchema,
  CompliancePackOutputSchema,
  executeCompliancePack,
  compliancePackMetadata,
} from '../../src/core/tools/compliance-pack.js';

import {
  SearchDirectoryInputSchema,
  SearchDirectoryOutputSchema,
  executeSearchDirectory,
  searchDirectoryMetadata,
} from '../../src/core/tools/search-directory.js';

import {
  PublishOpsReportInputSchema,
  PublishOpsReportOutputSchema,
  executePublishOpsReport,
  publishOpsReportMetadata,
} from '../../src/core/tools/publish-ops-report.js';

describe('Tool Contract Tests', () => {
  let mockContext: AdminContext;

  beforeEach(() => {
    mockContext = {
      actorId: 'test-user',
      actorRole: 'admin',
      scopes: ['admin.super'], // Super admin for testing
      supabaseToken: 'mock-token',
    };

    // Mock console.error to prevent audit log noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('CreateUser Tool', () => {
    it('should have valid metadata', () => {
      expect(createUserMetadata.name).toBe('create-user');
      expect(createUserMetadata.description).toBeTruthy();
      expect(createUserMetadata.inputSchema).toBeDefined();
      expect(createUserMetadata.inputSchema.type).toBe('object');
      expect(createUserMetadata.inputSchema.required).toEqual(['email', 'fullName', 'roles']);
    });

    it('should validate valid input', () => {
      const validInput = {
        email: 'test@example.com',
        fullName: 'Test User',
        roles: ['student'],
      };

      expect(() => CreateUserInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidInput = {
        email: 'not-an-email',
        fullName: 'Test User',
        roles: ['student'],
      };

      expect(() => CreateUserInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject empty full name', () => {
      const invalidInput = {
        email: 'test@example.com',
        fullName: '',
        roles: ['student'],
      };

      expect(() => CreateUserInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject empty roles array', () => {
      const invalidInput = {
        email: 'test@example.com',
        fullName: 'Test User',
        roles: [],
      };

      expect(() => CreateUserInputSchema.parse(invalidInput)).toThrow();
    });

    it('should require admin.write.user scope', async () => {
      const contextWithoutScope = {
        ...mockContext,
        scopes: ['admin.read.user'],
      };

      await expect(
        executeCreateUser(contextWithoutScope, {
          email: 'test@example.com',
          fullName: 'Test User',
          roles: ['student'],
        })
      ).rejects.toThrow(/Missing required scope/);
    });

    it('should validate output schema', () => {
      const output = { userId: '123e4567-e89b-12d3-a456-426614174000' };
      expect(() => CreateUserOutputSchema.parse(output)).not.toThrow();
    });
  });

  describe('UpdateUser Tool', () => {
    it('should have valid metadata', () => {
      expect(updateUserMetadata.name).toBe('update-user');
      expect(updateUserMetadata.description).toBeTruthy();
      expect(updateUserMetadata.inputSchema).toBeDefined();
    });

    it('should validate input with at least one update field', () => {
      const validInput = {
        userId: '123',
        fullName: 'Updated Name',
      };

      expect(() => UpdateUserInputSchema.parse(validInput)).not.toThrow();
    });

    it('should validate output schema', () => {
      const output = { success: true };
      expect(() => UpdateUserOutputSchema.parse(output)).not.toThrow();
    });
  });

  describe('AssignRole Tool', () => {
    it('should have valid metadata', () => {
      expect(assignRoleMetadata.name).toBe('assign-role');
      expect(assignRoleMetadata.description).toBeTruthy();
      expect(assignRoleMetadata.inputSchema.required).toContain('userId');
      expect(assignRoleMetadata.inputSchema.required).toContain('role');
    });

    it('should validate valid input', () => {
      const validInput = {
        userId: '123',
        role: 'teacher',
      };

      expect(() => AssignRoleInputSchema.parse(validInput)).not.toThrow();
    });

    it('should require admin.write.role scope', async () => {
      const contextWithoutScope = {
        ...mockContext,
        scopes: ['admin.read.user'],
      };

      await expect(
        executeAssignRole(contextWithoutScope, {
          userId: '123',
          role: 'teacher',
        })
      ).rejects.toThrow(/Missing required scope/);
    });
  });

  describe('CreateClass Tool', () => {
    it('should have valid metadata', () => {
      expect(createClassMetadata.name).toBe('create-class');
      expect(createClassMetadata.description).toBeTruthy();
      expect(createClassMetadata.inputSchema.required).toContain('name');
      expect(createClassMetadata.inputSchema.required).toContain('capacity');
    });

    it('should validate valid input', () => {
      const validInput = {
        name: 'English 101',
        capacity: 20,
        startDate: '2025-01-15',
        endDate: '2025-06-30',
      };

      expect(() => CreateClassInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject negative capacity', () => {
      const invalidInput = {
        name: 'English 101',
        capacity: -5,
        startDate: '2025-01-15',
        endDate: '2025-06-30',
      };

      expect(() => CreateClassInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('PlanRoster Tool', () => {
    it('should have valid metadata', () => {
      expect(planRosterMetadata.name).toBe('plan-roster');
      expect(planRosterMetadata.description).toBeTruthy();
      expect(planRosterMetadata.inputSchema.required).toContain('classId');
      expect(planRosterMetadata.inputSchema.required).toContain('isoWeek');
    });

    it('should validate ISO week format', () => {
      const validInput = {
        classId: '123',
        isoWeek: '2025-W01',
        sessions: [
          {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:30',
          },
        ],
      };

      expect(() => PlanRosterInputSchema.parse(validInput)).not.toThrow();
    });
  });

  describe('RecordAttendance Tool', () => {
    it('should have valid metadata', () => {
      expect(recordAttendanceMetadata.name).toBe('record-attendance');
      expect(recordAttendanceMetadata.description).toBeTruthy();
      expect(recordAttendanceMetadata.inputSchema.required).toContain('sessionId');
      expect(recordAttendanceMetadata.inputSchema.required).toContain('records');
    });

    it('should validate attendance records', () => {
      const validInput = {
        sessionId: '123',
        records: [
          {
            studentId: 'student-1',
            status: 'present',
          },
          {
            studentId: 'student-2',
            status: 'absent',
          },
        ],
      };

      expect(() => RecordAttendanceInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid status', () => {
      const invalidInput = {
        sessionId: '123',
        records: [
          {
            studentId: 'student-1',
            status: 'maybe',
          },
        ],
      };

      expect(() => RecordAttendanceInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('AdjustEnrolment Tool', () => {
    it('should have valid metadata', () => {
      expect(adjustEnrolmentMetadata.name).toBe('adjust-enrolment');
      expect(adjustEnrolmentMetadata.description).toBeTruthy();
      expect(adjustEnrolmentMetadata.inputSchema.required).toContain('userId');
      expect(adjustEnrolmentMetadata.inputSchema.required).toContain('classId');
      expect(adjustEnrolmentMetadata.inputSchema.required).toContain('action');
    });

    it('should validate enrolment actions', () => {
      const validEnroll = {
        userId: 'user-1',
        classId: 'class-1',
        action: 'enroll',
      };

      const validUnenroll = {
        userId: 'user-1',
        classId: 'class-1',
        action: 'unenroll',
      };

      expect(() => AdjustEnrolmentInputSchema.parse(validEnroll)).not.toThrow();
      expect(() => AdjustEnrolmentInputSchema.parse(validUnenroll)).not.toThrow();
    });
  });

  describe('GenRegisterCsv Tool', () => {
    it('should have valid metadata', () => {
      expect(genRegisterCsvMetadata.name).toBe('gen-register-csv');
      expect(genRegisterCsvMetadata.description).toBeTruthy();
      expect(genRegisterCsvMetadata.inputSchema.required).toContain('classId');
      expect(genRegisterCsvMetadata.inputSchema.required).toContain('isoWeek');
    });

    it('should validate input', () => {
      const validInput = {
        classId: 'class-1',
        isoWeek: '2025-W01',
      };

      expect(() => GenRegisterCsvInputSchema.parse(validInput)).not.toThrow();
    });

    it('should expect file path in output', () => {
      const output = { filePath: '/tmp/register.csv' };
      expect(() => GenRegisterCsvOutputSchema.parse(output)).not.toThrow();
    });
  });

  describe('ArSnapshot Tool', () => {
    it('should have valid metadata', () => {
      expect(arSnapshotMetadata.name).toBe('ar-snapshot');
      expect(arSnapshotMetadata.description).toBeTruthy();
    });

    it('should validate optional cutoff date', () => {
      const validWithoutDate = {};
      const validWithDate = { cutoffDate: '2025-01-15' };

      expect(() => ArSnapshotInputSchema.parse(validWithoutDate)).not.toThrow();
      expect(() => ArSnapshotInputSchema.parse(validWithDate)).not.toThrow();
    });
  });

  describe('RaiseRefundReq Tool', () => {
    it('should have valid metadata', () => {
      expect(raiseRefundReqMetadata.name).toBe('raise-refund-req');
      expect(raiseRefundReqMetadata.description).toBeTruthy();
      expect(raiseRefundReqMetadata.inputSchema.required).toContain('invoiceId');
      expect(raiseRefundReqMetadata.inputSchema.required).toContain('amount');
      expect(raiseRefundReqMetadata.inputSchema.required).toContain('reason');
    });

    it('should validate refund amount is positive', () => {
      const validInput = {
        invoiceId: 'inv-123',
        amount: 100.50,
        reason: 'Student withdrawal',
      };

      expect(() => RaiseRefundReqInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject negative amounts', () => {
      const invalidInput = {
        invoiceId: 'inv-123',
        amount: -100,
        reason: 'Test',
      };

      expect(() => RaiseRefundReqInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('AddAccommodation Tool', () => {
    it('should have valid metadata', () => {
      expect(addAccommodationMetadata.name).toBe('add-accommodation');
      expect(addAccommodationMetadata.description).toBeTruthy();
      expect(addAccommodationMetadata.inputSchema.required).toContain('studentId');
      expect(addAccommodationMetadata.inputSchema.required).toContain('accommodationType');
    });

    it('should validate accommodation input', () => {
      const validInput = {
        studentId: 'student-1',
        accommodationType: 'extra-time',
        description: 'Additional 30 minutes for exams',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      expect(() => AddAccommodationInputSchema.parse(validInput)).not.toThrow();
    });
  });

  describe('VendorStatus Tool', () => {
    it('should have valid metadata', () => {
      expect(vendorStatusMetadata.name).toBe('vendor-status');
      expect(vendorStatusMetadata.description).toBeTruthy();
      expect(vendorStatusMetadata.inputSchema.required).toContain('vendorId');
      expect(vendorStatusMetadata.inputSchema.required).toContain('status');
    });

    it('should validate vendor status values', () => {
      const validStatuses = ['active', 'suspended', 'inactive'];

      validStatuses.forEach(status => {
        const input = {
          vendorId: 'vendor-1',
          status,
        };

        expect(() => VendorStatusInputSchema.parse(input)).not.toThrow();
      });
    });
  });

  describe('CompliancePack Tool', () => {
    it('should have valid metadata', () => {
      expect(compliancePackMetadata.name).toBe('compliance-pack');
      expect(compliancePackMetadata.description).toBeTruthy();
      expect(compliancePackMetadata.inputSchema.required).toContain('studentId');
    });

    it('should validate compliance pack generation', () => {
      const validInput = {
        studentId: 'student-1',
        includeEnrolment: true,
        includeAttendance: true,
        includeVisa: true,
      };

      expect(() => CompliancePackInputSchema.parse(validInput)).not.toThrow();
    });
  });

  describe('SearchDirectory Tool', () => {
    it('should have valid metadata', () => {
      expect(searchDirectoryMetadata.name).toBe('search-directory');
      expect(searchDirectoryMetadata.description).toBeTruthy();
      expect(searchDirectoryMetadata.inputSchema.required).toContain('query');
    });

    it('should validate search query', () => {
      const validInput = {
        query: 'john',
        filters: {
          role: 'student',
          active: true,
        },
        limit: 50,
      };

      expect(() => SearchDirectoryInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject queries shorter than 2 characters', () => {
      const invalidInput = {
        query: 'a',
      };

      expect(() => SearchDirectoryInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('PublishOpsReport Tool', () => {
    it('should have valid metadata', () => {
      expect(publishOpsReportMetadata.name).toBe('publish-ops-report');
      expect(publishOpsReportMetadata.description).toBeTruthy();
      expect(publishOpsReportMetadata.inputSchema.required).toContain('week');
      expect(publishOpsReportMetadata.inputSchema.required).toContain('recipients');
    });

    it('should validate report publishing', () => {
      const validInput = {
        week: '2025-W01',
        recipients: ['admin@example.com', 'manager@example.com'],
        format: 'pdf',
      };

      expect(() => PublishOpsReportInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject empty recipients', () => {
      const invalidInput = {
        week: '2025-W01',
        recipients: [],
        format: 'pdf',
      };

      expect(() => PublishOpsReportInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Scope Requirements', () => {
    it('should enforce scope requirements for all tools', () => {
      const contextWithoutScopes = {
        ...mockContext,
        scopes: [],
      };

      // Each tool should reject when lacking proper scopes
      const toolTests = [
        () => executeCreateUser(contextWithoutScopes, {
          email: 'test@example.com',
          fullName: 'Test',
          roles: ['student'],
        }),
        () => executeUpdateUser(contextWithoutScopes, {
          userId: '123',
          fullName: 'Updated',
        }),
        () => executeAssignRole(contextWithoutScopes, {
          userId: '123',
          role: 'teacher',
        }),
      ];

      toolTests.forEach(testFn => {
        expect(testFn()).rejects.toThrow(/Missing required scope/);
      });
    });
  });
});
