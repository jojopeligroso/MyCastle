/**
 * Student Timetable View Component
 * T-045: Student Timetable/Materials View
 *
 * Features:
 * - Weekly timetable view for enrolled classes
 * - Materials access with signed URLs
 * - RLS enforces enrollment check
 * - Responsive design
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
    notes: string | null;
    status: string;
  };
  class: {
    id: string;
    name: string;
    code: string | null;
    level: string | null;
    subject: string | null;
  };
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string | null;
  fileSize: string | null;
  mimeType: string | null;
  cefrLevel: string | null;
  signedUrl: string | null;
  urlExpiresAt: string | null;
}

interface TimetableData {
  weekStart: string;
  weekEnd: string;
  sessions: TimetableSession[];
  sessionsByDay: Record<string, TimetableSession[]>;
  totalSessions: number;
  enrolledClasses: number;
}

export default function StudentTimetableView() {
  const [weekStart, setWeekStart] = useState<string>(getCurrentWeekStart());
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  function getCurrentWeekStart(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  useEffect(() => {
    fetchTimetable();
  }, [weekStart]);

  async function fetchTimetable() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/student/timetable?weekStart=${weekStart}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch timetable');
      }

      setTimetable(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMaterials(sessionId: string) {
    if (materials[sessionId]) {
      setSelectedSession(selectedSession === sessionId ? null : sessionId);
      return;
    }

    try {
      const response = await fetch('/api/student/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch materials');
      }

      setMaterials(prev => ({
        ...prev,
        [sessionId]: result.data.materials,
      }));
      setSelectedSession(sessionId);
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const current = new Date(weekStart);
    const offset = direction === 'prev' ? -7 : 7;
    current.setDate(current.getDate() + offset);
    setWeekStart(current.toISOString().split('T')[0]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading your timetable...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!timetable) {
    return null;
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Timetable</h2>
          <p className="text-sm text-gray-600">
            Week of {new Date(weekStart).toLocaleDateString()} - {timetable.totalSessions} classes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Previous Week
          </button>
          <button
            onClick={() => setWeekStart(getCurrentWeekStart())}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            This Week
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Next Week →
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Enrolled Classes</div>
          <div className="text-2xl font-bold text-gray-900">{timetable.enrolledClasses}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">This Week</div>
          <div className="text-2xl font-bold text-gray-900">{timetable.totalSessions} sessions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Upcoming</div>
          <div className="text-2xl font-bold text-gray-900">
            {timetable.sessions.filter(s => s.session.status === 'scheduled').length}
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDates.map((date, index) => {
          const daySessions = timetable.sessionsByDay[date] || [];

          return (
            <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-3 border-b border-gray-200">
                <div className="font-semibold text-gray-900">{daysOfWeek[index]}</div>
                <div className="text-sm text-gray-600">{new Date(date).getDate()}</div>
              </div>

              <div className="p-2 space-y-2">
                {daySessions.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-4">No classes</div>
                ) : (
                  daySessions.map(session => (
                    <div key={session.session.id}>
                      <div
                        className="p-2 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100"
                        onClick={() => fetchMaterials(session.session.id)}
                      >
                        <div className="text-xs font-semibold text-blue-900">
                          {session.session.startTime} - {session.session.endTime}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{session.class.name}</div>
                        {session.class.code && (
                          <div className="text-xs text-gray-600">{session.class.code}</div>
                        )}
                        {session.session.topic && (
                          <div className="text-xs text-gray-700 mt-1">{session.session.topic}</div>
                        )}
                      </div>

                      {/* Materials Section */}
                      {selectedSession === session.session.id && materials[session.session.id] && (
                        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Materials</div>
                          {materials[session.session.id].length === 0 ? (
                            <div className="text-xs text-gray-500">No materials available</div>
                          ) : (
                            <div className="space-y-1">
                              {materials[session.session.id].map(material => (
                                <a
                                  key={material.id}
                                  href={material.signedUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  📄 {material.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
