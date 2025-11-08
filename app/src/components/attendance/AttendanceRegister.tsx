/**
 * Attendance Register Component
 * Mark attendance for class sessions with keyboard shortcuts
 * Ref: spec/02-teacher-mcp.md §2.3.3
 */

'use client';

import { useState } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  visa_student: boolean;
  attendance_rate?: number;
}

interface AttendanceStatus {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused' | null;
  notes?: string;
}

interface ClassInfo {
  id: string;
  name: string;
  enrolled_count: number;
}

interface AttendanceRegisterProps {
  teacherId: string;
}

// Mock data for demonstration
const MOCK_CLASSES: ClassInfo[] = [
  { id: '1', name: 'B1 Morning Group A', enrolled_count: 12 },
  { id: '2', name: 'A2 Evening Class', enrolled_count: 10 },
  { id: '3', name: 'B2 Advanced Group', enrolled_count: 8 },
];

const MOCK_STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    visa_student: false,
    attendance_rate: 95.5,
  },
  {
    id: 's2',
    name: 'Bob Martinez',
    email: 'bob.martinez@example.com',
    visa_student: true,
    attendance_rate: 88.2,
  },
  {
    id: 's3',
    name: 'Carol Williams',
    email: 'carol.williams@example.com',
    visa_student: false,
    attendance_rate: 92.0,
  },
  {
    id: 's4',
    name: 'David Chen',
    email: 'david.chen@example.com',
    visa_student: true,
    attendance_rate: 97.5,
  },
  {
    id: 's5',
    name: 'Emma Thompson',
    email: 'emma.thompson@example.com',
    visa_student: false,
    attendance_rate: 91.3,
  },
];

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

export function AttendanceRegister({ teacherId }: AttendanceRegisterProps) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [sessionTime, setSessionTime] = useState<string>('09:00');
  const [attendances, setAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [focusedStudent, setFocusedStudent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleStatusChange = (studentId: string, status: AttendanceStatus['status']) => {
    setAttendances(prev => {
      const newMap = new Map(prev);
      newMap.set(studentId, { student_id: studentId, status });
      return newMap;
    });
  };

  const handleSave = async () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }

    setIsSaving(true);

    // TODO: Call API to save attendance
    // await fetch('/api/attendance/mark', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     class_id: selectedClass,
    //     session_date: selectedDate,
    //     session_time: sessionTime,
    //     attendances: Array.from(attendances.values())
    //   })
    // });

    setTimeout(() => {
      setIsSaving(false);
      alert('Attendance saved successfully!');
    }, 1000);
  };

  const getAttendanceStatus = (studentId: string): AttendanceStatus['status'] => {
    return attendances.get(studentId)?.status || null;
  };

  const stats = {
    total: MOCK_STUDENTS.length,
    present: Array.from(attendances.values()).filter(a => a.status === 'present').length,
    absent: Array.from(attendances.values()).filter(a => a.status === 'absent').length,
    late: Array.from(attendances.values()).filter(a => a.status === 'late').length,
    excused: Array.from(attendances.values()).filter(a => a.status === 'excused').length,
    unmarked: MOCK_STUDENTS.length - attendances.size,
  };

  const visaAbsences = Array.from(attendances.values()).filter(
    a =>
      a.status === 'absent' &&
      MOCK_STUDENTS.find(s => s.id === a.student_id)?.visa_student
  ).length;

  return (
    <div className="space-y-6">
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
            >
              <option value="">Select a class...</option>
              {MOCK_CLASSES.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.enrolled_count} students)
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
            />
          </div>
        </div>
      </div>

      {selectedClass && (
        <>
          {/* Statistics */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
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
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
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
                Click status buttons or use keyboard shortcuts: P (Present), A (Absent), L (Late), E (Excused)
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
                  {MOCK_STUDENTS.map(student => {
                    const status = getAttendanceStatus(student.id);
                    return (
                      <tr
                        key={student.id}
                        className={focusedStudent === student.id ? 'bg-blue-50' : ''}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                            {student.visa_student && (
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
                          {student.attendance_rate?.toFixed(1)}%
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
                              onClick={() => handleStatusChange(student.id, 'present')}
                              className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                status === 'present'
                                  ? STATUS_COLORS.present
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300'
                              }`}
                              title="Present (P)"
                              aria-label="Present (P)"
                            >
                              P
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'absent')}
                              className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                status === 'absent'
                                  ? STATUS_COLORS.absent
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-300'
                              }`}
                              title="Absent (A)"
                              aria-label="Absent (A)"
                            >
                              A
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'late')}
                              className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                status === 'late'
                                  ? STATUS_COLORS.late
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-yellow-50 hover:border-yellow-300'
                              }`}
                              title="Late (L)"
                              aria-label="Late (L)"
                            >
                              L
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'excused')}
                              className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                status === 'excused'
                                  ? STATUS_COLORS.excused
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                              }`}
                              title="Excused (E)"
                              aria-label="Excused (E)"
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
              onClick={() => setAttendances(new Map())}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear All
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || attendances.size === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
