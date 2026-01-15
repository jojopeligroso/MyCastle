'use client';

interface DocumentsTabProps {
  studentId: string;
}

export function DocumentsTab({ studentId }: DocumentsTabProps) {
  // TODO: Fetch documents for this student
  // const { data: documents, isLoading } = useStudentDocuments(studentId);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Documents & Files</h3>
          <button className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors">
            Upload Document
          </button>
        </div>

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
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No documents uploaded</p>
          <p className="mt-1 text-xs text-gray-500">
            This feature will display passport copies, visa documents, certificates, and letters
          </p>
        </div>
      </section>

      {/* Future: Document list with preview */}
      {/* Future: Document categories (passport, visa, certificate, letter, other) */}
      {/* Future: Upload functionality with drag-and-drop */}
      {/* Future: Download and delete options */}
      {/* Future: Document verification status */}
    </div>
  );
}
