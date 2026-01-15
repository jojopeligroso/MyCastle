'use client';

import { useState } from 'react';
import { saveAttendance, AttendanceRecord } from '../actions';
import { useRouter } from 'next/navigation';

type Student = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type Props = {
  sessionId: string;
  students: Student[];
  initialAttendance: Record<string, { status: string; notes: string | null }>;
};

export default function AttendanceSheet({ sessionId, students, initialAttendance }: Props) {
  const [records, setRecords] = useState<Record<string, { status: string; notes: string }>>(() => {
    const initial: Record<string, { status: string; notes: string }> = {};
    students.forEach(s => {
      initial[s.id] = {
        status: initialAttendance[s.id]?.status || 'present', // Default to present
        notes: initialAttendance[s.id]?.notes || '',
      };
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleStatusChange = (studentId: string, status: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: AttendanceRecord[] = Object.entries(records).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        notes: data.notes,
      }));

      await saveAttendance(sessionId, payload);
      alert('Attendance saved successfully');
      router.refresh(); // Refresh server data
    } catch (error) {
      console.error(error);
      alert('Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const statuses = ['present', 'absent', 'late', 'excused'];

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Student List</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>
      <ul className="divide-y divide-gray-200">
        {students.map(student => {
          const current = records[student.id];
          return (
            <li key={student.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center min-w-[200px]">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                    {student.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">ID: {student.id.slice(0, 8)}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {statuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(student.id, status)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors border ${
                        current.status === status
                          ? status === 'present'
                            ? 'bg-green-100 text-green-800 border-green-200 ring-2 ring-green-500'
                            : status === 'absent'
                              ? 'bg-red-100 text-red-800 border-red-200 ring-2 ring-red-500'
                              : status === 'late'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200 ring-2 ring-yellow-500'
                                : 'bg-gray-100 text-gray-800 border-gray-200 ring-2 ring-gray-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="flex-grow max-w-xs">
                  <input
                    type="text"
                    placeholder="Notes..."
                    value={current.notes || ''}
                    onChange={e => handleNotesChange(student.id, e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </li>
          );
        })}
        {students.length === 0 && (
          <li className="px-4 py-8 text-center text-gray-500">
            No students enrolled in this class.
          </li>
        )}
      </ul>
    </div>
  );
}
