'use client';

interface NotesTabProps {
  studentId: string;
  canViewSensitiveNotes?: boolean;
}

export function NotesTab({ studentId, canViewSensitiveNotes = false }: NotesTabProps) {
  // TODO: Fetch notes for this student
  // const { data: notes, isLoading } = useStudentNotes(studentId);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Student Notes</h3>
          {canViewSensitiveNotes && (
            <button className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors">
              Add Note
            </button>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No notes available</p>
          <p className="mt-1 text-xs text-gray-500">This feature will display admin notes about the student</p>
        </div>
      </section>

      {!canViewSensitiveNotes && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> You do not have permission to view or add sensitive student notes. Only Directors of Studies and Administrators can access this information for safeguarding purposes.
          </p>
        </div>
      )}

      {/* Future: List of notes with author, date, and content */}
      {/* Future: Role-based filtering (admin-only notes, teacher-visible notes) */}
      {/* Future: Add note form */}
      {/* Future: Edit/delete notes (own notes only) */}
    </div>
  );
}
