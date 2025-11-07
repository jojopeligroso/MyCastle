/**
 * Timetable Week View Component
 * Weekly calendar grid showing class sessions
 */

'use client';

import { useState } from 'react';

interface TimetableSession {
  class_id: string;
  class_name: string;
  course: string;
  room: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  start_time: string;
  end_time: string;
  enrolled_count: number;
  capacity: number;
}

interface TimetableWeekViewProps {
  teacherId: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
] as const;

// Mock data for demonstration
const MOCK_SESSIONS: TimetableSession[] = [
  {
    class_id: '1',
    class_name: 'B1 Morning Group A',
    course: 'English B1 Intermediate',
    room: 'Room 3',
    day: 'monday',
    start_time: '09:00',
    end_time: '13:00',
    enrolled_count: 12,
    capacity: 15,
  },
  {
    class_id: '2',
    class_name: 'A2 Evening Class',
    course: 'English A2 Elementary',
    room: 'Room 1',
    day: 'monday',
    start_time: '14:00',
    end_time: '17:00',
    enrolled_count: 10,
    capacity: 12,
  },
  {
    class_id: '3',
    class_name: 'B2 Advanced Group',
    course: 'English B2 Upper-Intermediate',
    room: 'Room 5',
    day: 'wednesday',
    start_time: '10:00',
    end_time: '14:00',
    enrolled_count: 8,
    capacity: 15,
  },
  {
    class_id: '4',
    class_name: 'C1 Professional',
    course: 'English C1 Advanced',
    room: 'Room 2',
    day: 'friday',
    start_time: '09:00',
    end_time: '12:00',
    enrolled_count: 6,
    capacity: 10,
  },
];

export function TimetableWeekView({ teacherId }: TimetableWeekViewProps) {
  const [sessions] = useState<TimetableSession[]>(MOCK_SESSIONS);
  const [selectedDate] = useState(new Date());

  // Get week date range
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

  // Calculate total weekly hours
  const totalHours = sessions.reduce((total, session) => {
    const start = parseInt(session.start_time.split(':')[0]);
    const end = parseInt(session.end_time.split(':')[0]);
    return total + (end - start);
  }, 0);

  // Get sessions for a specific day
  const getSessionsForDay = (dayName: string) => {
    return sessions.filter(s => s.day === dayName.toLowerCase());
  };

  // Calculate session position in grid
  const getSessionStyle = (session: TimetableSession) => {
    const startHour = parseInt(session.start_time.split(':')[0]);
    const endHour = parseInt(session.end_time.split(':')[0]);
    const duration = endHour - startHour;

    return {
      gridRowStart: TIME_SLOTS.indexOf(session.start_time) + 2,
      gridRowEnd: TIME_SLOTS.indexOf(session.start_time) + 2 + duration,
    };
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
            <p className="text-sm text-gray-500 mt-1">
              {sessions.length} classes • {totalHours} hours total
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Previous Week
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              This Week
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Next Week
            </button>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="p-6 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {/* Header Row */}
            <div className="bg-gray-50 p-3 font-semibold text-sm text-gray-500">
              Time
            </div>
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
                <div
                  className="bg-white p-3 text-xs text-gray-500 border-t border-gray-200"
                >
                  {time}
                </div>
                {DAYS.map(day => {
                  const daySessions = getSessionsForDay(day);
                  const sessionAtTime = daySessions.find(s => s.start_time === time);

                  return (
                    <div
                      key={`${day}-${time}`}
                      className="bg-white border-t border-gray-200 p-2 min-h-[60px] relative"
                    >
                      {sessionAtTime && (
                        <div
                          className="absolute inset-2 bg-blue-50 border-l-4 border-blue-500 rounded p-2 overflow-hidden hover:bg-blue-100 cursor-pointer transition-colors"
                          style={{
                            ...getSessionStyle(sessionAtTime),
                            position: 'relative',
                          }}
                        >
                          <div className="text-xs font-semibold text-blue-900 mb-1">
                            {sessionAtTime.class_name}
                          </div>
                          <div className="text-xs text-blue-700">
                            {sessionAtTime.start_time} - {sessionAtTime.end_time}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            {sessionAtTime.room}
                          </div>
                          <div className="text-xs text-blue-600">
                            {sessionAtTime.enrolled_count}/{sessionAtTime.capacity} students
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
        </div>
      </div>
    </div>
  );
}
