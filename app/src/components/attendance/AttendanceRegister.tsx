/**
 * Attendance Register Component - T-050 (8 points, Medium)
 * Mark attendance for class sessions with keyboard shortcuts
 * - Real backend integration with MCP/API
 * - Bulk "Mark All Present" operation
 * - Optimistic UI updates with error rollback
 * - Keyboard shortcuts (P/A/L/E)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  visaStudent: boolean;
  attendanceRate?: number;
  currentGrade?: string | null;
  attendance: {
    id: string;
    status: string;
    notes: string | null;
    recordedAt: Date;
    hash: string | null;
  } | null;
}

interface SessionInfo {
  id: string;
  classId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topic: string | null;
  status: string;
}

interface ClassInfo {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  subject: string | null;
}

interface AttendanceStatus {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface AttendanceRegisterProps {
  teacherId: string;
  classes?: { id: string; name: string; enrolledCount: number }[];
}

interface MCPClassResource {
  id: string;
  name: string;
  enrolledCount?: number | null;
}

interface MCPClassResponse {
  success: boolean;
  data?: {
    classes?: unknown;
  };
}

function isValidMCPClass(value: unknown): value is MCPClassResource {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

const STATUS_COLORS = {
  present: 'bg-green-100 border-green-500 text-green-900',
  absent: 'bg-red-100 border-red-500 text-red-900',
  late: 'bg-yellow-100 border-yellow-500 text-yellow-900',
  excused: 'bg-blue-100 border-blue-500 text-blue-900',
  null: 'bg-white border-gray-300 text-gray-700',
};

const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

export function AttendanceRegister({ teacherId, classes: classesProp }: AttendanceRegisterProps) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState<string>('09:00');

  // Backend data
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; enrolledCount: number }[]>(
    classesProp || []
  );

  // UI state
  const [attendances, setAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set());
  const [focusedStudent, setFocusedStudent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch classes on mount if not provided
  useEffect(() => {
    const fetchClasses = async () => {
      if (classesProp) return; // Already have classes as prop

      try {
        const response = await fetch('/api/mcp/resources?uri=mycastle://teacher/classes');

        if (!response.ok) {
          console.error('[AttendanceRegister] Failed to fetch classes');
          return;
        }

        const data = (await response.json()) as MCPClassResponse;
        const rawClasses = data.data?.classes;

        if (data.success && Array.isArray(rawClasses)) {
          const mappedClasses = rawClasses.filter(isValidMCPClass).map(resource => ({
            id: resource.id,
            name: resource.name,
            enrolledCount: resource.enrolledCount ?? 0,
          }));

          setClasses(mappedClasses);
        }
      } catch (err) {
        console.error('[AttendanceRegister] Error fetching classes:', err);
      }
    };

    fetchClasses();
  }, [teacherId, classesProp]);

  // Fetch session and roster when class/date/time changes
  const fetchSessionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/attendance/session?classId=${selectedClass}&date=${selectedDate}&startTime=${sessionTime}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }

      const data = await response.json();

      if (data.success) {
        setSession(data.data.session);
        setClassInfo(data.data.class);
        setStudents(data.data.roster);

        // Initialize attendances from existing records
        const initialAttendances = new Map<string, AttendanceStatus>();
        data.data.roster.forEach((student: Student) => {
          if (student.attendance) {
            initialAttendances.set(student.id, {
              studentId: student.id,
              status: student.attendance.status as AttendanceStatus['status'],
              notes: student.attendance.notes || undefined,
            });
          }
        });
        setAttendances(initialAttendances);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('[AttendanceRegister] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedDate, sessionTime]);

  useEffect(() => {
    if (selectedClass && selectedDate && sessionTime) {
      fetchSessionData();
    }
  }, [fetchSessionData, selectedClass, selectedDate, sessionTime]);

  const handleStatusChange = useCallback(
    (studentId: string, status: AttendanceStatus['status'], notes?: string) => {
      // Optimistic update
      setAttendances(prev => {
        const newMap = new Map(prev);
        newMap.set(studentId, { studentId, status, notes });
        return newMap;
      });

      setOptimisticUpdates(prev => new Set(prev).add(studentId));

      // Auto-save after short delay (debounced)
      // For now, just mark as changed
    },
    []
  );

  const handleMarkAllPresent = useCallback(async () => {
    if (!session || students.length === 0) {
      return;
    }

    // Optimistic update
    const bulkAttendances = students.map(student => ({
      studentId: student.id,
      status: 'present' as const,
    }));

    bulkAttendances.forEach(({ studentId, status }) => {
      setAttendances(prev => {
        const newMap = new Map(prev);
        newMap.set(studentId, { studentId, status });
        return newMap;
      });
    });

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          attendances: bulkAttendances,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to mark attendance');
      }

      // Refresh session data to get hashes
      await fetchSessionData();

      alert(`Marked ${data.data.processed} students as present`);
    } catch (err) {
      console.error('[AttendanceRegister] Bulk save error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Rollback optimistic updates
      await fetchSessionData();
    } finally {
      setIsSaving(false);
      setOptimisticUpdates(new Set());
    }
  }, [session, students, fetchSessionData]);

  const handleSave = async () => {
    if (!session || attendances.size === 0) {
      alert('No changes to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          attendances: Array.from(attendances.values()),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save attendance');
      }

      // Refresh to get updated hashes and clear optimistic state
      await fetchSessionData();
      setOptimisticUpdates(new Set());

      alert(`Saved attendance for ${data.data.processed} students`);
    } catch (err) {
      console.error('[AttendanceRegister] Save error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Rollback optimistic updates
      await fetchSessionData();
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!focusedStudent) return;

      const key = e.key.toLowerCase();
      let status: AttendanceStatus['status'] | null = null;

      switch (key) {
        case 'p':
          status = 'present';
          break;
        case 'a':
          status = 'absent';
          break;
        case 'l':
          status = 'late';
          break;
        case 'e':
          status = 'excused';
          break;
      }

      if (status) {
        e.preventDefault();
        handleStatusChange(focusedStudent, status);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [focusedStudent, handleStatusChange]);

  const getAttendanceStatus = (studentId: string): AttendanceStatus['status'] | null => {
    return attendances.get(studentId)?.status || null;
  };

  const stats = {
    total: students.length,
    present: Array.from(attendances.values()).filter(a => a.status === 'present').length,
    absent: Array.from(attendances.values()).filter(a => a.status === 'absent').length,
    late: Array.from(attendances.values()).filter(a => a.status === 'late').length,
    excused: Array.from(attendances.values()).filter(a => a.status === 'excused').length,
    unmarked: students.length - attendances.size,
  };

  const visaAbsences = Array.from(attendances.values()).filter(
    a => a.status === 'absent' && students.find(s => s.id === a.studentId)?.visaStudent
  ).length;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      )}

      {/* Session Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-2">
              Class
            </label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">Select a class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.enrolledCount} students)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="session-date" className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              id="session-date"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="session-time" className="block text-sm font-medium text-gray-700 mb-2">
              Session Time
            </label>
            <input
              id="session-time"
              type="time"
              value={sessionTime}
              onChange={e => setSessionTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {classInfo && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-sm text-blue-900">
              <strong>{classInfo.name}</strong>
              {classInfo.level && ` • ${classInfo.level}`}
              {classInfo.subject && ` • ${classInfo.subject}`}
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-2 text-sm text-gray-600">Loading session data...</div>
        </div>
      )}

      {selectedClass && session && !isLoading && (
        <>
          {/* Statistics */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
              <button
                onClick={handleMarkAllPresent}
                disabled={isSaving || students.length === 0}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {isSaving ? 'Marking...' : 'Mark All Present'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                <div className="text-xs text-gray-500">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <div className="text-xs text-gray-500">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                <div className="text-xs text-gray-500">Late</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
                <div className="text-xs text-gray-500">Excused</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">{stats.unmarked}</div>
                <div className="text-xs text-gray-500">Unmarked</div>
              </div>
            </div>
            {visaAbsences > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-center gap-2 text-orange-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">
                    {visaAbsences} visa student{visaAbsences > 1 ? 's' : ''} marked absent
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Student List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Student Register</h3>
              <p className="text-sm text-gray-500 mt-1">
                Click status buttons or use keyboard shortcuts: P (Present), A (Absent), L (Late), E
                (Excused). Click on a row to focus for keyboard shortcuts.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance Rate
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map(student => {
                    const status = getAttendanceStatus(student.id);
                    const isOptimistic = optimisticUpdates.has(student.id);
                    return (
                      <tr
                        key={student.id}
                        className={`${focusedStudent === student.id ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''} ${isOptimistic ? 'opacity-60' : ''} cursor-pointer hover:bg-gray-50 transition-colors`}
                        onClick={() => setFocusedStudent(student.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            {student.visaStudent && (
                              <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                                Visa
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {student.attendanceRate ? `${student.attendanceRate.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {status && (
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[status]}`}
                            >
                              {STATUS_LABELS[status]}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleStatusChange(student.id, 'present');
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                status === 'present'
                                  ? STATUS_COLORS.present
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300'
                              }`}
                              title="Present (P)"
                            >
                              P
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleStatusChange(student.id, 'absent');
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                status === 'absent'
                                  ? STATUS_COLORS.absent
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-300'
                              }`}
                              title="Absent (A)"
                            >
                              A
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleStatusChange(student.id, 'late');
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                status === 'late'
                                  ? STATUS_COLORS.late
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-yellow-50 hover:border-yellow-300'
                              }`}
                              title="Late (L)"
                            >
                              L
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleStatusChange(student.id, 'excused');
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                status === 'excused'
                                  ? STATUS_COLORS.excused
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                              }`}
                              title="Excused (E)"
                            >
                              E
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setAttendances(new Map());
                setOptimisticUpdates(new Set());
                fetchSessionData();
              }}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSaving}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || attendances.size === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSaving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
