/**
 * Timetable Week View Component - T-044 Integration
 * Weekly calendar grid showing class sessions from optimized backend
 * Connected to /api/timetable with caching and performance optimization
 */

'use client';

import { useState, useEffect } from 'react';

interface TimetableSession {
  session: {
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    topic: string | null;
    status: string;
  };
  class: {
    id: string;
    name: string;
    code: string | null;
    level: string | null;
    subject: string | null;
    enrolledCount: number;
    capacity: number;
  };
}

interface TimetableWeekViewProps {
  teacherId: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
] as const;

export function TimetableWeekView({ teacherId: _teacherId }: TimetableWeekViewProps) {
  const [sessions, setSessions] = useState<TimetableSession[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Get week start (Monday)
  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    return start.toISOString().split('T')[0];
  };

  // Get week dates
  const getWeekDates = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    return DAYS.map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  };

  const weekDates = getWeekDates();

  // Fetch timetable data
  useEffect(() => {
    const fetchTimetable = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const weekStart = getWeekStart(selectedDate);
        const response = await fetch(`/api/timetable?weekStart=${weekStart}`);

        if (!response.ok) {
          throw new Error('Failed to fetch timetable');
        }

        const data = await response.json();

        if (data.success) {
          setSessions(data.data.sessions || []);
          setExecutionTime(data.metadata?.executionTimeMs || null);

          // Warn if query is slow
          if (data.metadata?.executionTimeMs > 200) {
            console.warn(
              `[Timetable] Slow query: ${data.metadata.executionTimeMs}ms (p95 target: 200ms)`
            );
          }
        } else {
          setError(data.error || 'Unknown error');
        }
      } catch (_err) {
        console.error('[Timetable] Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetable();
  }, [selectedDate]);

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToThisWeek = () => {
    setSelectedDate(new Date());
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  // Calculate total weekly hours
  const totalHours = sessions.reduce((total, s) => {
    const start = parseInt(s.session.startTime.split(':')[0]);
    const end = parseInt(s.session.endTime.split(':')[0]);
    return total + (end - start);
  }, 0);

  // Get day of week from date
  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  // Get sessions for a specific day
  const getSessionsForDay = (dayName: string) => {
    return sessions.filter(s => {
      const dayOfWeek = getDayOfWeek(s.session.sessionDate);
      return dayOfWeek === dayName.toLowerCase();
    });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header with stats */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Week of {weekDates[0].toLocaleDateString()}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-500">
                {sessions.length} classes • {totalHours} hours total
              </p>
              {executionTime !== null && (
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    executionTime > 200
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {executionTime}ms
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousWeek}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous Week
            </button>
            <button
              onClick={goToThisWeek}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              This Week
            </button>
            <button
              onClick={goToNextWeek}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next Week
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
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

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-2 text-sm text-gray-600">Loading timetable...</div>
        </div>
      )}

      {/* Timetable Grid */}
      {!isLoading && (
        <div className="p-6 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-6 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              {/* Header Row */}
              <div className="bg-gray-50 p-3 font-semibold text-sm text-gray-500">Time</div>
              {DAYS.map((day, index) => (
                <div key={day} className="bg-gray-50 p-3">
                  <div className="font-semibold text-sm text-gray-900">{day}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {weekDates[index].toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              ))}

              {/* Time slots */}
              {TIME_SLOTS.map(time => (
                <div key={time} className="contents">
                  <div className="bg-white p-3 text-xs text-gray-500 border-t border-gray-200">
                    {time}
                  </div>
                  {DAYS.map(day => {
                    const daySessions = getSessionsForDay(day);
                    const sessionAtTime = daySessions.find(s => s.session.startTime === time);

                    return (
                      <div
                        key={`${day}-${time}`}
                        className="bg-white border-t border-gray-200 p-2 min-h-[60px] relative"
                      >
                        {sessionAtTime && (
                          <div
                            className="absolute inset-2 bg-blue-50 border-l-4 border-blue-500 rounded p-2 overflow-hidden hover:bg-blue-100 cursor-pointer transition-colors"
                            title={sessionAtTime.session.topic || 'No topic set'}
                          >
                            <div className="text-xs font-semibold text-blue-900 mb-1 truncate">
                              {sessionAtTime.class.name}
                            </div>
                            {sessionAtTime.class.code && (
                              <div className="text-xs text-blue-700 mb-1">
                                {sessionAtTime.class.code}
                              </div>
                            )}
                            <div className="text-xs text-blue-700">
                              {sessionAtTime.session.startTime} - {sessionAtTime.session.endTime}
                            </div>
                            {sessionAtTime.session.topic && (
                              <div className="text-xs text-blue-600 mt-1 truncate">
                                {sessionAtTime.session.topic}
                              </div>
                            )}
                            <div className="text-xs text-blue-600 mt-1">
                              {sessionAtTime.class.enrolledCount}/{sessionAtTime.class.capacity}{' '}
                              students
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-500 rounded"></div>
            <span className="text-gray-600">Scheduled Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
            <span className="text-gray-600">Free Time</span>
          </div>
          {sessions.length > 0 && (
            <div className="ml-auto text-xs text-gray-500">
              Cached for 5 minutes • Click session for details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
