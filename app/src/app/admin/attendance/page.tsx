'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import WeekNavigation from '@/components/admin/attendance/WeekNavigation';
import ClassAttendanceCard from '@/components/admin/attendance/ClassAttendanceCard';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | '';

interface WeekDate {
  date: string;
  dayName: string;
}

interface StudentAttendance {
  id: string;
  name: string;
  isVisaStudent: boolean;
  attendance: Record<string, { status: string; sessionId: string | null } | null>;
}

interface ClassData {
  id: string;
  name: string;
  code: string | null;
  teacherId: string | null;
  teacherName: string | null;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string[];
  students: StudentAttendance[];
  sessions: Record<string, string>;
}

interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  weekDates: WeekDate[];
  classes: ClassData[];
}

function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diff);
  return weekStart.toISOString().split('T')[0];
}

function addWeeks(dateStr: string, weeks: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().split('T')[0];
}

export default function AttendanceDashboard() {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart);
  const [data, setData] = useState<WeeklyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async (weekStartDate: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/attendance/weekly?weekStart=${weekStartDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(weekStart);
  }, [weekStart, fetchData]);

  const handlePrevWeek = useCallback(() => {
    setWeekStart(prev => addWeeks(prev, -1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekStart(prev => addWeeks(prev, 1));
  }, []);

  const handleToday = useCallback(() => {
    setWeekStart(getCurrentWeekStart());
  }, []);

  const handleSave = useCallback(
    async (
      classId: string,
      changes: { studentId: string; date: string; status: AttendanceStatus }[]
    ) => {
      const response = await fetch('/api/admin/attendance/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          attendance: changes,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save');
      }

      // Refresh data after save
      await fetchData(weekStart);
    },
    [fetchData, weekStart]
  );

  // Filter classes by search term
  const filteredClasses = data?.classes.filter(cls => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      cls.name.toLowerCase().includes(term) ||
      cls.code?.toLowerCase().includes(term) ||
      cls.teacherName?.toLowerCase().includes(term)
    );
  });

  // Compute summary stats
  const summaryStats = (() => {
    if (!data?.classes) return { totalClasses: 0, totalStudents: 0, visaStudents: 0 };

    const totalClasses = data.classes.length;
    const studentSet = new Set<string>();
    const visaStudentSet = new Set<string>();

    data.classes.forEach(cls => {
      cls.students.forEach(s => {
        studentSet.add(s.id);
        if (s.isVisaStudent) {
          visaStudentSet.add(s.id);
        }
      });
    });

    return {
      totalClasses,
      totalStudents: studentSet.size,
      visaStudents: visaStudentSet.size,
    };
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600">Weekly attendance grid for all active classes</p>
        </div>
        <Link
          href="/admin/classes?action=create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
        >
          Schedule New Session
        </Link>
      </div>

      {data && (
        <WeekNavigation
          weekStart={data.weekStart}
          weekEnd={data.weekEnd}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Active classes</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{summaryStats.totalClasses}</p>
          <p className="mt-1 text-xs text-gray-500">Classes running this week</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Total students</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{summaryStats.totalStudents}</p>
          <p className="mt-1 text-xs text-gray-500">Enrolled across all classes</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Visa students</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{summaryStats.visaStudents}</p>
          <p className="mt-1 text-xs text-gray-500">Require attendance monitoring</p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search" className="sr-only">
              Search classes
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search classes, teachers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium">Keyboard:</span> P = Present, A = Absent, L = Late, E =
            Excused, Arrow keys to navigate
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-500">Loading attendance data...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading attendance data</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchData(weekStart)}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="space-y-4">
          {filteredClasses?.length === 0 && (
            <div className="bg-white shadow sm:rounded-lg p-8 text-center text-gray-500">
              {searchTerm
                ? 'No classes match your search.'
                : 'No active classes found for this week.'}
            </div>
          )}

          {filteredClasses?.map(cls => (
            <ClassAttendanceCard
              key={cls.id}
              classId={cls.id}
              className={cls.name}
              classCode={cls.code}
              teacherName={cls.teacherName}
              startTime={cls.startTime}
              endTime={cls.endTime}
              daysOfWeek={cls.daysOfWeek}
              weekDates={data.weekDates}
              students={cls.students}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
