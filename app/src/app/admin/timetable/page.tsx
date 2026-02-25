'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Users, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

interface ClassData {
  id: string;
  name: string;
  code: string | null;
  teacherId: string | null;
  teacherName: string | null;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string[];
  students: { id: string; name: string }[];
}

interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  classes: ClassData[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

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

function getWeekDates(weekStart: string): Date[] {
  const start = new Date(weekStart + 'T00:00:00');
  return DAYS.map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekEnd + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${start.getFullYear()}`;
}

export default function AdminTimetable() {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart);
  const [data, setData] = useState<WeeklyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (weekStartDate: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/attendance/weekly?weekStart=${weekStartDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch timetable data');
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

  const handlePrevWeek = () => setWeekStart(prev => addWeeks(prev, -1));
  const handleNextWeek = () => setWeekStart(prev => addWeeks(prev, 1));
  const handleToday = () => setWeekStart(getCurrentWeekStart());

  const weekDates = data ? getWeekDates(data.weekStart) : [];
  const isCurrentWeek = weekStart === getCurrentWeekStart();

  // Get classes for a specific day
  const getClassesForDay = (dayName: string): ClassData[] => {
    if (!data?.classes) return [];
    return data.classes.filter(cls => cls.daysOfWeek.includes(dayName));
  };

  // Calculate stats
  const stats = {
    totalClasses: data?.classes.length || 0,
    totalStudents: data?.classes.reduce((sum, cls) => sum + cls.students.length, 0) || 0,
    totalTeachers: new Set(data?.classes.map(cls => cls.teacherId).filter(Boolean)).size,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable Overview</h1>
          <p className="text-gray-600">View and manage class schedules</p>
        </div>
        <Link
          href="/admin/classes/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
        >
          Add New Class
        </Link>
      </div>

      {/* Week Navigation */}
      <div className="bg-white shadow sm:rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              disabled={isLoading}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              disabled={isLoading || isCurrentWeek}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                isCurrentWeek
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              disabled={isLoading}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          {data && (
            <div className="text-lg font-semibold text-gray-900">
              Week of {formatWeekRange(data.weekStart, data.weekEnd)}
            </div>
          )}
          <div className="flex gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {stats.totalClasses} classes
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {stats.totalStudents} students
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-500">Loading timetable...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading timetable</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchData(weekStart)}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Timetable Grid */}
      {!isLoading && !error && data && (
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day Headers */}
              <div className="grid grid-cols-5 border-b border-gray-200">
                {DAYS.map((day, index) => (
                  <div
                    key={day}
                    className="p-4 bg-gray-50 border-r border-gray-200 last:border-r-0"
                  >
                    <div className="font-semibold text-gray-900">{day}</div>
                    <div className="text-sm text-gray-500">
                      {weekDates[index]?.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {getClassesForDay(day).length} classes
                    </div>
                  </div>
                ))}
              </div>

              {/* Class Cards by Day */}
              <div className="grid grid-cols-5 min-h-[400px]">
                {DAYS.map(day => {
                  const dayClasses = getClassesForDay(day);
                  return (
                    <div
                      key={day}
                      className="p-2 border-r border-gray-200 last:border-r-0 space-y-2"
                    >
                      {dayClasses.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-8">No classes</div>
                      ) : (
                        dayClasses.map(cls => (
                          <div
                            key={cls.id}
                            className="bg-purple-50 border border-purple-200 rounded-lg p-3 hover:bg-purple-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-purple-900 text-sm truncate">
                                  {cls.name}
                                </h4>
                                {cls.code && <p className="text-xs text-purple-700">{cls.code}</p>}
                              </div>
                              <Link
                                href={`/admin/classes/${cls.id}`}
                                className="p-1 rounded hover:bg-purple-200"
                                title="Edit class"
                              >
                                <Edit className="h-3.5 w-3.5 text-purple-600" />
                              </Link>
                            </div>
                            <div className="mt-2 space-y-1">
                              {cls.startTime && cls.endTime && (
                                <p className="text-xs text-purple-700 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {cls.startTime} - {cls.endTime}
                                </p>
                              )}
                              <p className="text-xs text-purple-700 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {cls.students.length} students
                              </p>
                              {cls.teacherName && (
                                <p className="text-xs text-purple-600 truncate">
                                  {cls.teacherName}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!isLoading && !error && data && (
        <div className="bg-white shadow sm:rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/classes"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Manage All Classes
            </Link>
            <Link
              href="/admin/attendance"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Take Attendance
            </Link>
            <Link
              href="/admin/teachers"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Teacher Assignments
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
