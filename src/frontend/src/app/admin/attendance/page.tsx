'use client';

import { useState } from 'react';

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState('2025-01-20');
  const [attendanceRecords] = useState([
    {
      classId: 1,
      className: 'Intermediate A2',
      date: '2025-01-20',
      students: [
        { id: 1, name: 'John Smith', status: 'present' },
        { id: 2, name: 'Maria Garcia', status: 'present' },
        { id: 3, name: 'Li Wei', status: 'late' },
        { id: 4, name: 'Ahmed Hassan', status: 'absent' },
        { id: 5, name: 'Sofia Rodriguez', status: 'present' },
      ],
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'excused':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Attendance</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Track and manage student attendance
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        />
        <select className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
          <option>All Classes</option>
          <option>Intermediate A2</option>
          <option>Advanced B2</option>
          <option>Beginner A1</option>
        </select>
        <button className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Record Attendance
        </button>
      </div>

      {/* Attendance Records */}
      {attendanceRecords.map((record) => (
        <div
          key={record.classId}
          className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 mb-6"
        >
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {record.className}
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {new Date(record.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400">Present: </span>
                  <span className="font-semibold text-green-600">
                    {record.students.filter((s) => s.status === 'present').length}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400">Absent: </span>
                  <span className="font-semibold text-red-600">
                    {record.students.filter((s) => s.status === 'absent').length}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400">Late: </span>
                  <span className="font-semibold text-yellow-600">
                    {record.students.filter((s) => s.status === 'late').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {record.students.map((student) => (
                  <tr key={student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {student.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          student.status
                        )}`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
