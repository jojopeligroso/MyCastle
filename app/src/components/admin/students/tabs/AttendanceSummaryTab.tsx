'use client';

interface AttendanceSummaryTabProps {
  studentId: string;
}

export function AttendanceSummaryTab({ studentId }: AttendanceSummaryTabProps) {
  // TODO: Fetch attendance records for this student
  // const { data: attendance, isLoading } = useAttendance(studentId);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Attendance Summary</h3>

        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No attendance records available</p>
          <p className="mt-1 text-xs text-gray-500">
            This feature will display attendance rate, recent sessions, and patterns
          </p>
        </div>
      </section>

      {/* Future: Overall attendance rate */}
      {/* Future: Recent attendance records */}
      {/* Future: Attendance patterns (late, absent, excused) */}
      {/* Future: At-risk indicator if attendance < 80% */}
    </div>
  );
}
