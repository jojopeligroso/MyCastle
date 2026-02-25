'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

interface WeeklyAttendanceGridProps {
  weekDates: WeekDate[];
  daysOfWeek: string[];
  students: StudentAttendance[];
  onChange: (studentId: string, date: string, status: AttendanceStatus) => void;
  dirtyState: Record<string, Record<string, boolean>>;
}

const STATUS_CYCLE: AttendanceStatus[] = ['', 'present', 'absent', 'late', 'excused'];

const STATUS_DISPLAY: Record<AttendanceStatus, { label: string; bg: string; text: string }> = {
  present: { label: 'P', bg: 'bg-green-100', text: 'text-green-800' },
  absent: { label: 'A', bg: 'bg-red-100', text: 'text-red-800' },
  late: { label: 'L', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  excused: { label: 'E', bg: 'bg-blue-100', text: 'text-blue-800' },
  '': { label: '', bg: 'bg-white', text: 'text-gray-400' },
};

function AttendanceCell({
  status,
  isClassDay,
  isDirty,
  isFocused,
  onClick,
  onKeyDown,
  tabIndex,
  cellRef,
}: {
  status: AttendanceStatus;
  isClassDay: boolean;
  isDirty: boolean;
  isFocused: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tabIndex: number;
  cellRef: (el: HTMLButtonElement | null) => void;
}) {
  if (!isClassDay) {
    return (
      <td className="px-2 py-2 text-center">
        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
          -
        </div>
      </td>
    );
  }

  const display = STATUS_DISPLAY[status];

  return (
    <td className="px-2 py-2 text-center">
      <button
        ref={cellRef}
        onClick={onClick}
        onKeyDown={onKeyDown}
        tabIndex={tabIndex}
        className={`w-10 h-10 rounded flex items-center justify-center text-sm font-semibold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
          display.bg
        } ${display.text} ${isDirty ? 'border-orange-400' : 'border-transparent'} ${
          isFocused ? 'ring-2 ring-purple-500' : ''
        } ${status === '' ? 'border border-gray-300' : ''}`}
        aria-label={status || 'empty'}
      >
        {display.label || '\u00A0'}
      </button>
    </td>
  );
}

export default function WeeklyAttendanceGrid({
  weekDates,
  daysOfWeek,
  students,
  onChange,
  dirtyState,
}: WeeklyAttendanceGridProps) {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const getClassDayIndices = useCallback(() => {
    const indices: number[] = [];
    weekDates.forEach((wd, i) => {
      if (daysOfWeek.includes(wd.dayName)) {
        indices.push(i);
      }
    });
    return indices;
  }, [weekDates, daysOfWeek]);

  const classDayIndices = getClassDayIndices();

  const handleCellClick = useCallback(
    (studentId: string, date: string, currentStatus: string) => {
      console.log('[AttendanceGrid] Cell clicked:', { studentId, date, currentStatus });
      const currentIndex = STATUS_CYCLE.indexOf(currentStatus as AttendanceStatus);
      const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
      const newStatus = STATUS_CYCLE[nextIndex];
      console.log('[AttendanceGrid] Cycling status:', { from: currentStatus, to: newStatus });
      onChange(studentId, date, newStatus);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      rowIndex: number,
      colIndex: number,
      studentId: string,
      date: string,
      currentStatus: string
    ) => {
      const key = e.key.toLowerCase();

      // Status shortcuts
      if (key === 'p') {
        e.preventDefault();
        onChange(studentId, date, 'present');
        return;
      }
      if (key === 'a') {
        e.preventDefault();
        onChange(studentId, date, 'absent');
        return;
      }
      if (key === 'l') {
        e.preventDefault();
        onChange(studentId, date, 'late');
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        onChange(studentId, date, 'excused');
        return;
      }
      if (key === 'backspace' || key === 'delete') {
        e.preventDefault();
        onChange(studentId, date, '');
        return;
      }
      if (key === 'enter' || key === ' ') {
        e.preventDefault();
        handleCellClick(studentId, date, currentStatus);
        return;
      }

      // Arrow key navigation
      if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
        e.preventDefault();

        let newRow = rowIndex;
        let newCol = colIndex;

        if (key === 'arrowup' && rowIndex > 0) {
          newRow = rowIndex - 1;
        } else if (key === 'arrowdown' && rowIndex < students.length - 1) {
          newRow = rowIndex + 1;
        } else if (key === 'arrowleft') {
          const currentColIdx = classDayIndices.indexOf(colIndex);
          if (currentColIdx > 0) {
            newCol = classDayIndices[currentColIdx - 1];
          }
        } else if (key === 'arrowright') {
          const currentColIdx = classDayIndices.indexOf(colIndex);
          if (currentColIdx < classDayIndices.length - 1) {
            newCol = classDayIndices[currentColIdx + 1];
          }
        }

        if (newRow !== rowIndex || newCol !== colIndex) {
          setFocusedCell({ row: newRow, col: newCol });
        }
      }
    },
    [onChange, handleCellClick, students.length, classDayIndices]
  );

  // Focus management
  useEffect(() => {
    if (focusedCell) {
      const key = `${focusedCell.row}-${focusedCell.col}`;
      const cell = cellRefs.current.get(key);
      if (cell) {
        cell.focus();
      }
    }
  }, [focusedCell]);

  if (students.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">No students enrolled in this class.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Student
            </th>
            {weekDates.map(wd => {
              const isClassDay = daysOfWeek.includes(wd.dayName);
              const dateObj = new Date(wd.date + 'T00:00:00');
              const dayNum = dateObj.getDate();
              const dayAbbr = wd.dayName.slice(0, 3);

              return (
                <th
                  key={wd.date}
                  className={`px-2 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                    isClassDay ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  <div>{dayAbbr}</div>
                  <div className="text-sm font-normal">{dayNum}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student, rowIndex) => (
            <tr key={student.id} className={student.isVisaStudent ? 'bg-amber-50' : ''}>
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{student.name}</span>
                  {student.isVisaStudent && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      Visa
                    </span>
                  )}
                </div>
              </td>
              {weekDates.map((wd, colIndex) => {
                const isClassDay = daysOfWeek.includes(wd.dayName);
                const attendanceData = student.attendance[wd.date];
                const status = (attendanceData?.status || '') as AttendanceStatus;
                const isDirty = dirtyState[student.id]?.[wd.date] || false;
                const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;

                return (
                  <AttendanceCell
                    key={wd.date}
                    status={status}
                    isClassDay={isClassDay}
                    isDirty={isDirty}
                    isFocused={isFocused}
                    onClick={() => {
                      if (isClassDay) {
                        setFocusedCell({ row: rowIndex, col: colIndex });
                        handleCellClick(student.id, wd.date, status);
                      }
                    }}
                    onKeyDown={e => {
                      if (isClassDay) {
                        handleKeyDown(e, rowIndex, colIndex, student.id, wd.date, status);
                      }
                    }}
                    tabIndex={isClassDay ? 0 : -1}
                    cellRef={el => {
                      if (el && isClassDay) {
                        cellRefs.current.set(`${rowIndex}-${colIndex}`, el);
                      }
                    }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
