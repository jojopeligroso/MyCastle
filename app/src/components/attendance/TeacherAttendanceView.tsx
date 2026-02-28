/**
 * Teacher Attendance View
 * Simple attendance marking for teachers
 * - Day view (default): Current day's sessions
 * - Week view: Full week overview
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  visaStudent: boolean;
  attendance: {
    id: string;
    status: string;
    notes: string | null;
  } | null;
}

interface Session {
  id: string;
  classId: string;
  className: string;
  classLevel: string | null;
  startTime: string;
  endTime: string;
  status: string;
  date: string;
  roster: Student[];
}

interface TeacherAttendanceViewProps {
  userId: string;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
type ViewMode = 'day' | 'week';

const STATUS_COLORS = {
  present: 'bg-green-100 border-green-500 text-green-800',
  absent: 'bg-red-100 border-red-500 text-red-800',
  late: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  excused: 'bg-blue-100 border-blue-500 text-blue-800',
};

const STATUS_BUTTON_COLORS = {
  present: 'hover:bg-green-50 hover:border-green-400',
  absent: 'hover:bg-red-50 hover:border-red-400',
  late: 'hover:bg-yellow-50 hover:border-yellow-400',
  excused: 'hover:bg-blue-50 hover:border-blue-400',
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function TeacherAttendanceView({ userId }: TeacherAttendanceViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendances, setAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [focusedStudent, setFocusedStudent] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Get week dates
  const getWeekDates = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    return DAYS_OF_WEEK.map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date.toISOString().split('T')[0];
    });
  }, []);

  const weekDates = getWeekDates();

  const formatDate = (dateStr: string, format: 'full' | 'short' = 'full') => {
    const date = new Date(dateStr);
    if (format === 'short') {
      return date.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-IE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Fetch sessions
  const fetchSessions = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/attendance/teacher-sessions?date=${date}`);
      const data = await response.json();

      if (data.success) {
        const sessionsWithDate = (data.data.sessions || []).map((s: Session) => ({
          ...s,
          date,
        }));
        return sessionsWithDate;
      } else {
        throw new Error(data.error || 'Failed to fetch sessions');
      }
    } catch (err) {
      throw err;
    }
  }, []);

  // Load sessions based on view mode
  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (viewMode === 'day') {
          const daySessions = await fetchSessions(selectedDate);
          setSessions(daySessions);

          // Initialize attendances
          const initialAttendances = new Map<string, AttendanceStatus>();
          daySessions.forEach((session: Session) => {
            session.roster.forEach((student: Student) => {
              if (student.attendance) {
                initialAttendances.set(
                  `${session.id}-${student.id}`,
                  student.attendance.status as AttendanceStatus
                );
              }
            });
          });
          setAttendances(initialAttendances);

          if (daySessions.length > 0) {
            setActiveSession(daySessions[0].id);
          }
        } else {
          // Week view - fetch all days
          const allSessions: Session[] = [];
          const initialAttendances = new Map<string, AttendanceStatus>();

          for (const date of weekDates) {
            try {
              const daySessions = await fetchSessions(date);
              allSessions.push(...daySessions);

              daySessions.forEach((session: Session) => {
                session.roster.forEach((student: Student) => {
                  if (student.attendance) {
                    initialAttendances.set(
                      `${session.id}-${student.id}`,
                      student.attendance.status as AttendanceStatus
                    );
                  }
                });
              });
            } catch {
              // Continue with other days
            }
          }

          setSessions(allSessions);
          setAttendances(initialAttendances);

          if (allSessions.length > 0) {
            setActiveSession(allSessions[0].id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [viewMode, selectedDate, weekDates, fetchSessions]);

  const handleStatusChange = useCallback(
    (sessionId: string, studentId: string, status: AttendanceStatus) => {
      const key = `${sessionId}-${studentId}`;
      setAttendances(prev => {
        const newMap = new Map(prev);
        newMap.set(key, status);
        return newMap;
      });
    },
    []
  );

  const handleMarkAllPresent = useCallback(
    async (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Optimistic update
      session.roster.forEach(student => {
        const key = `${sessionId}-${student.id}`;
        setAttendances(prev => {
          const newMap = new Map(prev);
          newMap.set(key, 'present');
          return newMap;
        });
      });

      setIsSaving(true);
      try {
        const response = await fetch('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            attendances: session.roster.map(s => ({
              studentId: s.id,
              status: 'present',
            })),
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [sessions]
  );

  const handleSaveSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const sessionAttendances = session.roster
        .map(student => {
          const key = `${sessionId}-${student.id}`;
          const status = attendances.get(key);
          if (status) {
            return { studentId: student.id, status };
          }
          return null;
        })
        .filter(Boolean);

      if (sessionAttendances.length === 0) {
        return;
      }

      setIsSaving(true);
      try {
        const response = await fetch('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            attendances: sessionAttendances,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [sessions, attendances]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!focusedStudent || !activeSession) return;

      const key = e.key.toLowerCase();
      let status: AttendanceStatus | null = null;

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
        handleStatusChange(activeSession, focusedStudent, status);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [focusedStudent, activeSession, handleStatusChange]);

  // Group sessions by date for week view
  const sessionsByDate = sessions.reduce(
    (acc, session) => {
      const date = session.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(session);
      return acc;
    },
    {} as Record<string, Session[]>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading sessions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-lg font-medium text-red-800">Error Loading Sessions</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle and Date Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              This Week
            </button>
          </div>

          {/* Date selector for day view */}
          {viewMode === 'day' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() - 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() + 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
              >
                Today
              </button>
            </div>
          )}
        </div>

        {/* Keyboard shortcuts help */}
        <div className="text-sm text-gray-500">
          Keyboard: <kbd className="px-2 py-1 bg-gray-100 rounded">P</kbd> Present{' '}
          <kbd className="px-2 py-1 bg-gray-100 rounded">A</kbd> Absent{' '}
          <kbd className="px-2 py-1 bg-gray-100 rounded">L</kbd> Late{' '}
          <kbd className="px-2 py-1 bg-gray-100 rounded">E</kbd> Excused
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Found</h3>
          <p className="text-gray-600">
            {viewMode === 'day'
              ? `No classes scheduled for ${formatDate(selectedDate)}.`
              : 'No classes scheduled this week.'}
          </p>
        </div>
      ) : viewMode === 'day' ? (
        // Day View
        <DayView
          sessions={sessions}
          attendances={attendances}
          activeSession={activeSession}
          focusedStudent={focusedStudent}
          isSaving={isSaving}
          setActiveSession={setActiveSession}
          setFocusedStudent={setFocusedStudent}
          handleStatusChange={handleStatusChange}
          handleMarkAllPresent={handleMarkAllPresent}
          handleSaveSession={handleSaveSession}
          formatDate={formatDate}
          selectedDate={selectedDate}
        />
      ) : (
        // Week View
        <div className="space-y-6">
          {weekDates.map(date => {
            const daySessions = sessionsByDate[date] || [];
            if (daySessions.length === 0) return null;

            return (
              <div key={date} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  {formatDate(date)}
                </h3>
                <DayView
                  sessions={daySessions}
                  attendances={attendances}
                  activeSession={activeSession}
                  focusedStudent={focusedStudent}
                  isSaving={isSaving}
                  setActiveSession={setActiveSession}
                  setFocusedStudent={setFocusedStudent}
                  handleStatusChange={handleStatusChange}
                  handleMarkAllPresent={handleMarkAllPresent}
                  handleSaveSession={handleSaveSession}
                  formatDate={formatDate}
                  selectedDate={date}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Extracted Day View component for reuse
interface DayViewProps {
  sessions: Session[];
  attendances: Map<string, AttendanceStatus>;
  activeSession: string | null;
  focusedStudent: string | null;
  isSaving: boolean;
  setActiveSession: (id: string) => void;
  setFocusedStudent: (id: string | null) => void;
  handleStatusChange: (sessionId: string, studentId: string, status: AttendanceStatus) => void;
  handleMarkAllPresent: (sessionId: string) => void;
  handleSaveSession: (sessionId: string) => void;
  formatDate: (date: string, format?: 'full' | 'short') => string;
  selectedDate: string;
  compact?: boolean;
}

function DayView({
  sessions,
  attendances,
  activeSession,
  focusedStudent,
  isSaving,
  setActiveSession,
  setFocusedStudent,
  handleStatusChange,
  handleMarkAllPresent,
  handleSaveSession,
  compact = false,
}: DayViewProps) {
  return (
    <div className="space-y-4">
      {sessions.map(session => {
        const sessionStats = {
          total: session.roster.length,
          present: session.roster.filter(
            s => attendances.get(`${session.id}-${s.id}`) === 'present'
          ).length,
          absent: session.roster.filter(s => attendances.get(`${session.id}-${s.id}`) === 'absent')
            .length,
          late: session.roster.filter(s => attendances.get(`${session.id}-${s.id}`) === 'late')
            .length,
          excused: session.roster.filter(
            s => attendances.get(`${session.id}-${s.id}`) === 'excused'
          ).length,
        };
        const unmarked =
          sessionStats.total -
          sessionStats.present -
          sessionStats.absent -
          sessionStats.late -
          sessionStats.excused;
        const isActive = activeSession === session.id;

        return (
          <div
            key={session.id}
            className={`bg-white rounded-lg shadow-md overflow-hidden ${
              compact && !isActive ? 'cursor-pointer hover:shadow-lg' : ''
            }`}
            onClick={() => compact && setActiveSession(session.id)}
          >
            {/* Session Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{session.className}</h3>
                  <p className="text-sm text-gray-500">
                    {session.startTime} - {session.endTime}
                    {session.classLevel && ` • ${session.classLevel}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-3 text-sm">
                    <span className="text-green-600 font-medium">
                      {sessionStats.present} present
                    </span>
                    <span className="text-red-600 font-medium">{sessionStats.absent} absent</span>
                    {unmarked > 0 && <span className="text-gray-400">{unmarked} unmarked</span>}
                  </div>
                  {(!compact || isActive) && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMarkAllPresent(session.id);
                      }}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Mark All Present
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Student List - Only show if active or not compact */}
            {(!compact || isActive) && (
              <>
                {session.roster.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No students enrolled in this class
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {session.roster.map(student => {
                      const key = `${session.id}-${student.id}`;
                      const status = attendances.get(key);
                      const isFocused =
                        focusedStudent === student.id && activeSession === session.id;

                      return (
                        <div
                          key={student.id}
                          onClick={e => {
                            e.stopPropagation();
                            setFocusedStudent(student.id);
                            setActiveSession(session.id);
                          }}
                          className={`px-6 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isFocused
                              ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                                {student.name.charAt(0)}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{student.name}</span>
                                {student.visaStudent && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                                    Visa
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-gray-500">{student.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {status && (
                              <span
                                className={`px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[status]}`}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            )}

                            <div className="flex gap-1 ml-4">
                              {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(
                                s => (
                                  <button
                                    key={s}
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleStatusChange(session.id, student.id, s);
                                    }}
                                    className={`px-3 py-1 text-xs font-medium rounded border-2 transition-colors ${
                                      status === s
                                        ? STATUS_COLORS[s]
                                        : `bg-white border-gray-200 text-gray-600 ${STATUS_BUTTON_COLORS[s]}`
                                    }`}
                                    title={`${s.charAt(0).toUpperCase() + s.slice(1)} (${s.charAt(0).toUpperCase()})`}
                                  >
                                    {s.charAt(0).toUpperCase()}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Save Button */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleSaveSession(session.id);
                    }}
                    disabled={isSaving}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
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
      })}
    </div>
  );
}
