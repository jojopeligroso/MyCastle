'use client';

interface CourseHistoryTabProps {
  studentId: string;
}

export function CourseHistoryTab({ studentId }: CourseHistoryTabProps) {
  // TODO: Fetch enrollment history for this student
  // const { data: enrollments, isLoading } = useEnrollments(studentId);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Enrollment History</h3>

        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No enrollment history available</p>
          <p className="mt-1 text-xs text-gray-500">This feature will display student course enrollments, progress, and amendments</p>
        </div>
      </section>

      {/* Future: Timeline of enrollments */}
      {/* Future: Active enrollments */}
      {/* Future: Completed courses */}
      {/* Future: Enrollment amendments (extensions, reductions, transfers) */}
    </div>
  );
}
