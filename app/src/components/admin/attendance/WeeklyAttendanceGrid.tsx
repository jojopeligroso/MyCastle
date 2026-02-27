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
  attendance: Record<
    string,
    { status: string; sessionId: string | null; minutesLate: number | null } | null
  >;
}

interface WeeklyAttendanceGridProps {
  weekDates: WeekDate[];
  daysOfWeek: string[];
  students: StudentAttendance[];
  onChange: (
    studentId: string,
    date: string,
    status: AttendanceStatus,
    minutesLate?: number
  ) => void;
  dirtyState: Record<string, Record<string, boolean>>;
  lateThresholdMinutes: number;
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
  minutesLate,
  isClassDay,
  isDirty,
  isFocused,
  isEditing,
  lateThresholdMinutes,
  onClick,
  onKeyDown,
  onMinutesChange,
  onMinutesBlur,
  tabIndex,
  cellRef,
  inputRef,
}: {
  status: AttendanceStatus;
  minutesLate: number | null;
  isClassDay: boolean;
  isDirty: boolean;
  isFocused: boolean;
  isEditing: boolean;
  lateThresholdMinutes: number;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onMinutesChange: (minutes: number) => void;
  onMinutesBlur: () => void;
  tabIndex: number;
  cellRef: (el: HTMLButtonElement | null) => void;
  inputRef: (el: HTMLInputElement | null) => void;
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

  // Determine if this is a late status with minutes that exceed threshold
  const isLate = status === 'late' || (minutesLate !== null && minutesLate > 0);
  const isLateAbsent = isLate && minutesLate !== null && minutesLate > lateThresholdMinutes;

  // Get display info based on status
  let display = STATUS_DISPLAY[status];
  let displayLabel = display.label;

  // For late status with minutes, show "L{n}" format
  if (isLate && minutesLate !== null && minutesLate > 0) {
    displayLabel = `L${minutesLate}`;
    // Override colors based on threshold
    if (isLateAbsent) {
      display = { ...display, bg: 'bg-red-100', text: 'text-red-800' };
    } else {
      display = { ...display, bg: 'bg-yellow-100', text: 'text-yellow-800' };
    }
  }

  // If editing (showing input), render input field
  if (isEditing) {
    return (
      <td className="px-2 py-2 text-center">
        <div className="relative">
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={89}
            defaultValue={minutesLate ?? ''}
            placeholder="min"
            className={`w-12 h-10 text-center text-sm font-semibold rounded border-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              isDirty ? 'border-orange-400' : 'border-yellow-400'
            } bg-yellow-50`}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(value) && value >= 1 && value <= 89) {
                  onMinutesChange(value);
                }
                onMinutesBlur();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onMinutesBlur();
              }
            }}
            onBlur={e => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value) && value >= 1 && value <= 89) {
                onMinutesChange(value);
              }
              onMinutesBlur();
            }}
          />
        </div>
      </td>
    );
  }

  return (
    <td className="px-2 py-2 text-center">
      <button
        ref={cellRef}
        onClick={onClick}
        onKeyDown={onKeyDown}
        tabIndex={tabIndex}
        className={`w-10 h-10 rounded flex items-center justify-center text-xs font-semibold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
          display.bg
        } ${display.text} ${isDirty ? 'border-orange-400' : 'border-transparent'} ${
          isFocused ? 'ring-2 ring-purple-500' : ''
        } ${status === '' ? 'border border-gray-300' : ''}`}
        aria-label={status || 'empty'}
        title={isLateAbsent ? 'Late (counts as absent)' : undefined}
      >
        {displayLabel || '\u00A0'}
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
  lateThresholdMinutes,
}: WeeklyAttendanceGridProps) {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

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
    (
      studentId: string,
      date: string,
      currentStatus: string,
      rowIndex: number,
      colIndex: number,
      minutesLate: number | null
    ) => {
      console.log('[AttendanceGrid] Cell clicked:', {
        studentId,
        date,
        currentStatus,
        minutesLate,
      });

      // If current status is late, start editing minutes
      if (
        currentStatus === 'late' ||
        (currentStatus !== 'late' && minutesLate && minutesLate > 0)
      ) {
        // If already late with minutes, cycle to next status
        if (minutesLate !== null && minutesLate > 0) {
          const currentIndex = STATUS_CYCLE.indexOf('late');
          const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
          const newStatus = STATUS_CYCLE[nextIndex];
          console.log('[AttendanceGrid] Cycling from late to:', newStatus);
          onChange(studentId, date, newStatus, undefined);
          return;
        }
        // Otherwise show input to enter minutes
        setEditingCell({ row: rowIndex, col: colIndex });
        return;
      }

      // Regular status cycling
      const currentIndex = STATUS_CYCLE.indexOf(currentStatus as AttendanceStatus);
      const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
      const newStatus = STATUS_CYCLE[nextIndex];
      console.log('[AttendanceGrid] Cycling status:', { from: currentStatus, to: newStatus });

      // If cycling to 'late', show input for minutes
      if (newStatus === 'late') {
        onChange(studentId, date, 'late', undefined);
        setEditingCell({ row: rowIndex, col: colIndex });
        return;
      }

      onChange(studentId, date, newStatus, undefined);
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
      currentStatus: string,
      minutesLate: number | null
    ) => {
      const key = e.key.toLowerCase();

      // Status shortcuts
      if (key === 'p') {
        e.preventDefault();
        onChange(studentId, date, 'present', undefined);
        return;
      }
      if (key === 'a') {
        e.preventDefault();
        onChange(studentId, date, 'absent', undefined);
        return;
      }
      if (key === 'l') {
        e.preventDefault();
        onChange(studentId, date, 'late', undefined);
        // Open minutes input
        setEditingCell({ row: rowIndex, col: colIndex });
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        onChange(studentId, date, 'excused', undefined);
        return;
      }
      if (key === 'backspace' || key === 'delete') {
        e.preventDefault();
        onChange(studentId, date, '', undefined);
        return;
      }
      if (key === 'enter' || key === ' ') {
        e.preventDefault();
        handleCellClick(studentId, date, currentStatus, rowIndex, colIndex, minutesLate);
        return;
      }

      // Number keys 1-9 for quick minutes entry when on late status
      if ((currentStatus === 'late' || (minutesLate && minutesLate > 0)) && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        setEditingCell({ row: rowIndex, col: colIndex });
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

  // Focus management for cells
  useEffect(() => {
    if (focusedCell && !editingCell) {
      const key = `${focusedCell.row}-${focusedCell.col}`;
      const cell = cellRefs.current.get(key);
      if (cell) {
        cell.focus();
      }
    }
  }, [focusedCell, editingCell]);

  // Focus management for inputs
  useEffect(() => {
    if (editingCell) {
      const key = `${editingCell.row}-${editingCell.col}`;
      // Small delay to ensure input is rendered
      requestAnimationFrame(() => {
        const input = inputRefs.current.get(key);
        if (input) {
          input.focus();
          input.select();
        }
      });
    }
  }, [editingCell]);

  // Debug: Log class days info
  console.log('[AttendanceGrid] Rendering:', {
    weekDates: weekDates.map(d => d.dayName),
    daysOfWeek,
    classDayIndices,
    studentCount: students.length,
  });

  if (students.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">No students enrolled in this class.</div>
    );
  }

  if (classDayIndices.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-amber-600">
        No class days configured for this week. Check class schedule settings.
        <br />
        <span className="text-sm text-gray-500">(daysOfWeek: {JSON.stringify(daysOfWeek)})</span>
      </div>
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
                const minutesLate = attendanceData?.minutesLate ?? null;
                const isDirty = dirtyState[student.id]?.[wd.date] || false;
                const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;
                const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;

                return (
                  <AttendanceCell
                    key={wd.date}
                    status={status}
                    minutesLate={minutesLate}
                    isClassDay={isClassDay}
                    isDirty={isDirty}
                    isFocused={isFocused}
                    isEditing={isEditing}
                    lateThresholdMinutes={lateThresholdMinutes}
                    onClick={() => {
                      if (isClassDay) {
                        setFocusedCell({ row: rowIndex, col: colIndex });
                        handleCellClick(
                          student.id,
                          wd.date,
                          status,
                          rowIndex,
                          colIndex,
                          minutesLate
                        );
                      }
                    }}
                    onKeyDown={e => {
                      if (isClassDay) {
                        handleKeyDown(
                          e,
                          rowIndex,
                          colIndex,
                          student.id,
                          wd.date,
                          status,
                          minutesLate
                        );
                      }
                    }}
                    onMinutesChange={minutes => {
                      onChange(student.id, wd.date, 'late', minutes);
                    }}
                    onMinutesBlur={() => {
                      setEditingCell(null);
                    }}
                    tabIndex={isClassDay ? 0 : -1}
                    cellRef={el => {
                      if (el && isClassDay) {
                        cellRefs.current.set(`${rowIndex}-${colIndex}`, el);
                      }
                    }}
                    inputRef={el => {
                      if (el) {
                        inputRefs.current.set(`${rowIndex}-${colIndex}`, el);
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
