/**
 * Admin Attendance View
 * Comprehensive attendance overview with date range and filtering
 * - Single student view
 * - School-wide overview
 * - Custom date ranges
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  className: string;
  attendanceRate: number;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

interface SchoolStats {
  totalStudents: number;
  totalSessions: number;
  overallAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  visaStudentsAtRisk: number;
}

interface AttendanceRecord {
  date: string;
  className: string;
  status: string;
  notes: string | null;
}

type ViewType = 'school' | 'student';

export function AdminAttendanceView() {
  const [viewType, setViewType] = useState<ViewType>('school');
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Student search
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);

  // School stats
  const [schoolStats, setSchoolStats] = useState<SchoolStats | null>(null);
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState<Student[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch school-wide stats
  const fetchSchoolStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/attendance/admin/stats?from=${dateFrom}&to=${dateTo}`
      );
      const data = await response.json();

      if (data.success) {
        setSchoolStats(data.data.stats);
        setLowAttendanceStudents(data.data.lowAttendanceStudents || []);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  // Search students
  const searchStudents = useCallback(async () => {
    if (!searchQuery.trim()) {
      setStudents([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/attendance/admin/search-students?q=${encodeURIComponent(searchQuery)}&from=${dateFrom}&to=${dateTo}`
      );
      const data = await response.json();

      if (data.success) {
        setStudents(data.data.students || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, [searchQuery, dateFrom, dateTo]);

  // Fetch student attendance records
  const fetchStudentRecords = useCallback(async (studentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/attendance/admin/student/${studentId}?from=${dateFrom}&to=${dateTo}`
      );
      const data = await response.json();

      if (data.success) {
        setStudentRecords(data.data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch student records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (viewType === 'school') {
      fetchSchoolStats();
    }
  }, [viewType, fetchSchoolStats]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (viewType === 'student') {
        searchStudents();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, viewType, searchStudents]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentRecords(selectedStudent.id);
    }
  }, [selectedStudent, fetchStudentRecords]);

  // Quick date presets
  const setDatePreset = (preset: string) => {
    const today = new Date();
    const to = today.toISOString().split('T')[0];
    let from: string;

    switch (preset) {
      case 'today':
        from = to;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        from = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        from = monthAgo.toISOString().split('T')[0];
        break;
      case 'term':
        const termStart = new Date(today);
        termStart.setMonth(termStart.getMonth() - 3);
        from = termStart.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setDateFrom(from);
    setDateTo(to);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Type Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewType('school')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewType === 'school'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              School Overview
            </button>
            <button
              onClick={() => setViewType('student')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewType === 'student'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Individual Student
            </button>
          </div>

          <div className="h-8 border-l border-gray-200" />

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex gap-1">
            <button
              onClick={() => setDatePreset('today')}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset('week')}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDatePreset('month')}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Last Month
            </button>
            <button
              onClick={() => setDatePreset('term')}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              This Term
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* School Overview */}
      {viewType === 'school' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading statistics...</span>
            </div>
          ) : schoolStats ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {schoolStats.overallAttendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Overall Attendance</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="text-3xl font-bold text-green-600">{schoolStats.presentCount}</div>
                  <div className="text-sm text-gray-500">Present</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="text-3xl font-bold text-red-600">{schoolStats.absentCount}</div>
                  <div className="text-sm text-gray-500">Absent</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="text-3xl font-bold text-yellow-600">{schoolStats.lateCount}</div>
                  <div className="text-sm text-gray-500">Late</div>
                </div>
              </div>

              {/* Visa Students at Risk */}
              {schoolStats.visaStudentsAtRisk > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h4 className="font-medium text-orange-800">
                        {schoolStats.visaStudentsAtRisk} Visa Student(s) at Risk
                      </h4>
                      <p className="text-sm text-orange-700">
                        Attendance below 85% threshold for visa compliance
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Low Attendance Students */}
              {lowAttendanceStudents.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Students Below 85% Attendance
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {lowAttendanceStudents.map(student => (
                      <div
                        key={student.id}
                        className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedStudent(student);
                          setViewType('student');
                        }}
                      >
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.className}</div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-semibold ${
                              student.attendanceRate < 80 ? 'text-red-600' : 'text-orange-600'
                            }`}
                          >
                            {student.attendanceRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {student.presentCount}/{student.totalSessions} sessions
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              No attendance data available for the selected period
            </div>
          )}
        </div>
      )}

      {/* Student View */}
      {viewType === 'student' && (
        <div className="space-y-6">
          {/* Search */}
          {!selectedStudent && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for a student
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Enter student name or email..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />

              {/* Search Results */}
              {students.length > 0 && (
                <div className="mt-3 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {students.map(student => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setSelectedStudent(student);
                        setSearchQuery('');
                        setStudents([]);
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                      <div className="text-sm text-gray-500">{student.className}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Student Details */}
          {selectedStudent && (
            <div className="space-y-4">
              {/* Student Header */}
              <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-lg">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedStudent.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedStudent.email} • {selectedStudent.className}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentRecords([]);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Change Student
                </button>
              </div>

              {/* Student Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div
                    className={`text-2xl font-bold ${
                      selectedStudent.attendanceRate >= 85
                        ? 'text-green-600'
                        : selectedStudent.attendanceRate >= 80
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {selectedStudent.attendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Attendance Rate</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedStudent.presentCount}</div>
                  <div className="text-sm text-gray-500">Present</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{selectedStudent.absentCount}</div>
                  <div className="text-sm text-gray-500">Absent</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{selectedStudent.lateCount}</div>
                  <div className="text-sm text-gray-500">Late</div>
                </div>
              </div>

              {/* Attendance Records */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">Attendance Records</h4>
                </div>
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                ) : studentRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Class
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {studentRecords.map((record, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString('en-IE', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">{record.className}</td>
                            <td className="px-6 py-3 text-center">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  record.status === 'present'
                                    ? 'bg-green-100 text-green-800'
                                    : record.status === 'absent'
                                      ? 'bg-red-100 text-red-800'
                                      : record.status === 'late'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500">{record.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No attendance records for the selected period
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
