'use client';

interface AssessmentsTabProps {
  studentId: string;
}

export function AssessmentsTab({ studentId }: AssessmentsTabProps) {
  // TODO: Fetch assessment records for this student
  // const { data: assessments, isLoading } = useAssessments(studentId);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Assessments & Test Results</h3>

        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No assessment records available</p>
          <p className="mt-1 text-xs text-gray-500">This feature will display diagnostic tests, grades, progress tests, and certificates</p>
        </div>
      </section>

      {/* Future: Diagnostic test results */}
      {/* Future: Progress test scores */}
      {/* Future: Assignment grades */}
      {/* Future: Certificates and achievements */}
    </div>
  );
}
