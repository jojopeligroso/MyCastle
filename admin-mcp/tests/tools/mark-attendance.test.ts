/**
 * Tests for mark-attendance tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSupabaseClient, generateTestJWT, MOCK_USERS, cleanupTestData, seedTestData, TEST_ENV } from '../setup';
import { markAttendance } from '../../src/tools/mark-attendance';

describe('mark-attendance tool', () => {
  let adminJWT: string;
  let teacherJWT: string;
  let supabase: ReturnType<typeof createTestSupabaseClient>;

  beforeEach(async () => {
    adminJWT = await generateTestJWT(MOCK_USERS.admin);
    teacherJWT = await generateTestJWT(MOCK_USERS.teacher);
    supabase = createTestSupabaseClient(adminJWT);
    await seedTestData(supabase);
  });

  afterEach(async () => {
    await cleanupTestData(supabase, ['attendance', 'sessions', 'enrollments', 'classes', 'users']);
  });

  describe('Input Validation', () => {
    it('should require session_id', async () => {
      await expect(
        markAttendance.execute(
          {
            session_id: '',
            student_id: MOCK_USERS.student.id,
            status: 'present',
          } as any,
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/session_id/i);
    });

    it('should require student_id', async () => {
      await expect(
        markAttendance.execute(
          {
            session_id: 'test-session-123',
            student_id: '',
            status: 'present',
          } as any,
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/student_id/i);
    });

    it('should validate attendance status enum', async () => {
      await expect(
        markAttendance.execute(
          {
            session_id: 'test-session-123',
            student_id: MOCK_USERS.student.id,
            status: 'invalid-status' as any,
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/status/i);
    });

    it('should accept valid attendance statuses', async () => {
      const validStatuses = ['present', 'absent', 'late', 'excused'];

      for (const status of validStatuses) {
        const result = await markAttendance.execute(
          {
            session_id: 'test-session-123',
            student_id: MOCK_USERS.student.id,
            status: status as any,
          },
          MOCK_USERS.admin
        );

        expect(result.success).toBe(true);
      }
    });

    it('should accept optional notes', async () => {
      const result = await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'late',
          notes: 'Arrived 15 minutes late',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.record?.notes).toBe('Arrived 15 minutes late');
    });
  });

  describe('Authorization', () => {
    it('should allow admin to mark attendance', async () => {
      const result = await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'present',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
    });

    it('should allow teacher to mark attendance', async () => {
      const result = await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'present',
        },
        MOCK_USERS.teacher
      );

      expect(result.success).toBe(true);
    });

    it('should deny student from marking attendance', async () => {
      await expect(
        markAttendance.execute(
          {
            session_id: 'test-session-123',
            student_id: MOCK_USERS.student.id,
            status: 'present',
          },
          MOCK_USERS.student
        )
      ).rejects.toThrow(/permission/i);
    });

    it('should enforce tenant isolation', async () => {
      await expect(
        markAttendance.execute(
          {
            session_id: 'test-session-123',
            student_id: MOCK_USERS.student.id,
            status: 'present',
          },
          MOCK_USERS.unauthorized
        )
      ).rejects.toThrow(/permission|tenant/i);
    });
  });

  describe('Attendance Marking', () => {
    it('should create attendance record for present status', async () => {
      const result = await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'present',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.record?.status).toBe('present');
      expect(result.record?.student_id).toBe(MOCK_USERS.student.id);
    });

    it('should create attendance record for absent status', async () => {
      const result = await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'absent',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.record?.status).toBe('absent');
    });

    it('should update existing attendance record', async () => {
      // Mark as present first
      await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'present',
        },
        MOCK_USERS.admin
      );

      // Update to late
      const result = await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'late',
          notes: 'Actually arrived late',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.record?.status).toBe('late');
      expect(result.record?.notes).toBe('Actually arrived late');

      // Verify only one record exists
      const { data: records, count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .eq('session_id', 'test-session-123')
        .eq('student_id', MOCK_USERS.student.id);

      expect(count).toBe(1);
    });

    it('should handle bulk attendance marking', async () => {
      const students = [
        { id: 'student-1', status: 'present' },
        { id: 'student-2', status: 'absent' },
        { id: 'student-3', status: 'late' },
      ];

      for (const student of students) {
        const result = await markAttendance.execute(
          {
            session_id: 'test-session-123',
            student_id: student.id,
            status: student.status as any,
          },
          MOCK_USERS.admin
        );

        expect(result.success).toBe(true);
      }

      const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .eq('session_id', 'test-session-123');

      expect(count).toBe(students.length);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log for attendance marking', async () => {
      const result = await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'present',
        },
        MOCK_USERS.admin
      );

      const { data: auditLog } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_id', result.record?.id)
        .eq('action', 'mark-attendance')
        .single();

      expect(auditLog).toBeDefined();
      expect(auditLog?.actor_id).toBe(MOCK_USERS.admin.id);
      expect(auditLog?.resource_type).toBe('attendance');
    });

    it('should log attendance changes in audit trail', async () => {
      // Mark initial attendance
      await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'present',
        },
        MOCK_USERS.admin
      );

      // Change to absent
      await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: MOCK_USERS.student.id,
          status: 'absent',
        },
        MOCK_USERS.admin
      );

      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'mark-attendance')
        .order('created_at', { ascending: false });

      expect(auditLogs?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent session', async () => {
      await expect(
        markAttendance.execute(
          {
            session_id: 'non-existent-session',
            student_id: MOCK_USERS.student.id,
            status: 'present',
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/session/i);
    });

    it('should handle non-existent student', async () => {
      await expect(
        markAttendance.execute(
          {
            session_id: 'test-session-123',
            student_id: 'non-existent-student',
            status: 'present',
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/student/i);
    });

    it('should provide meaningful error messages', async () => {
      try {
        await markAttendance.execute(
          {
            session_id: 'test-session-123',
            student_id: MOCK_USERS.student.id,
            status: 'present',
          },
          MOCK_USERS.student
        );
      } catch (error: any) {
        expect(error.message).toContain('permission');
      }
    });
  });

  describe('Integration', () => {
    it('should correctly update attendance statistics', async () => {
      // Mark multiple students' attendance
      await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: 'student-1',
          status: 'present',
        },
        MOCK_USERS.admin
      );

      await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: 'student-2',
          status: 'absent',
        },
        MOCK_USERS.admin
      );

      await markAttendance.execute(
        {
          session_id: 'test-session-123',
          student_id: 'student-3',
          status: 'late',
        },
        MOCK_USERS.admin
      );

      // Verify statistics
      const { data: stats } = await supabase
        .from('attendance')
        .select('status')
        .eq('session_id', 'test-session-123');

      const presentCount = stats?.filter(s => s.status === 'present').length;
      const absentCount = stats?.filter(s => s.status === 'absent').length;
      const lateCount = stats?.filter(s => s.status === 'late').length;

      expect(presentCount).toBe(1);
      expect(absentCount).toBe(1);
      expect(lateCount).toBe(1);
    });
  });
});
