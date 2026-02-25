'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekNavigationProps {
  weekStart: string;
  weekEnd: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekEnd + 'T00:00:00');

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const year = start.getFullYear();

  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `Week of ${startMonth} ${startDay}-${endDay}, ${year}`;
  } else {
    return `Week of ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}

function isCurrentWeek(weekStart: string): boolean {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() + diff);
  currentWeekStart.setHours(0, 0, 0, 0);

  return weekStart === currentWeekStart.toISOString().split('T')[0];
}

export default function WeekNavigation({
  weekStart,
  weekEnd,
  onPrevWeek,
  onNextWeek,
  onToday,
}: WeekNavigationProps) {
  const isCurrent = isCurrentWeek(weekStart);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-lg font-semibold text-gray-900">{formatWeekRange(weekStart, weekEnd)}</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevWeek}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={onToday}
          disabled={isCurrent}
          className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            isCurrent
              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Today
        </button>
        <button
          onClick={onNextWeek}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label="Next week"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
