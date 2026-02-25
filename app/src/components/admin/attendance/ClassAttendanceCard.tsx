'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import WeeklyAttendanceGrid from './WeeklyAttendanceGrid';

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

interface ClassAttendanceCardProps {
  classId: string;
  className: string;
  classCode: string | null;
  teacherName: string | null;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string[];
  weekDates: WeekDate[];
  students: StudentAttendance[];
  onSave: (
    classId: string,
    changes: { studentId: string; date: string; status: AttendanceStatus }[]
  ) => Promise<void>;
}

export default function ClassAttendanceCard({
  classId,
  className,
  classCode,
  teacherName,
  startTime,
  endTime,
  daysOfWeek,
  weekDates,
  students: initialStudents,
  onSave,
}: ClassAttendanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [students, setStudents] = useState(initialStudents);
  const [dirtyState, setDirtyState] = useState<Record<string, Record<string, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasDirtyChanges = Object.values(dirtyState).some(studentDirty =>
    Object.values(studentDirty).some(Boolean)
  );

  const scheduleDisplay = (() => {
    const days = daysOfWeek.map(d => d.slice(0, 3)).join('/');
    const time = startTime && endTime ? `${startTime}-${endTime}` : '';
    return [days, time].filter(Boolean).join(' ');
  })();

  const handleChange = (studentId: string, date: string, status: AttendanceStatus) => {
    setStudents(prev =>
      prev.map(s => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          attendance: {
            ...s.attendance,
            [date]: {
              status,
              sessionId: s.attendance[date]?.sessionId || null,
            },
          },
        };
      })
    );

    setDirtyState(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [date]: true,
      },
    }));

    setSaveError(null);
  };

  const handleSave = async () => {
    const changes: { studentId: string; date: string; status: AttendanceStatus }[] = [];

    Object.entries(dirtyState).forEach(([studentId, dates]) => {
      Object.entries(dates).forEach(([date, isDirty]) => {
        if (isDirty) {
          const student = students.find(s => s.id === studentId);
          if (student) {
            const status = (student.attendance[date]?.status || '') as AttendanceStatus;
            changes.push({ studentId, date, status });
          }
        }
      });
    });

    if (changes.length === 0) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(classId, changes);
      setDirtyState({});
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <button
            className="p-1 rounded hover:bg-gray-200"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {className}
              {classCode && <span className="text-gray-500 font-normal ml-2">({classCode})</span>}
            </h3>
            <p className="text-sm text-gray-500">
              {scheduleDisplay}
              {teacherName && <span className="ml-2">- {teacherName}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          {hasDirtyChanges && (
            <span className="text-xs text-orange-600 font-medium">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasDirtyChanges || isSaving}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              hasDirtyChanges && !isSaving
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-200">
          {saveError}
        </div>
      )}

      {isExpanded && (
        <WeeklyAttendanceGrid
          weekDates={weekDates}
          daysOfWeek={daysOfWeek}
          students={students}
          onChange={handleChange}
          dirtyState={dirtyState}
        />
      )}
    </div>
  );
}
