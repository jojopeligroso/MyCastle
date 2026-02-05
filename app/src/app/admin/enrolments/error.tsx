'use client';

import { useEffect } from 'react';

export default function EnrolmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Enrolments Module Error]', error);
  }, [error]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Enrolments Module Error</h3>
          <p className="text-sm text-gray-600">Failed to load enrolment information</p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
        <p className="text-sm text-red-800">{error.message || 'An unexpected error occurred.'}</p>
      </div>

      {process.env.NODE_ENV === 'development' && error.stack && (
        <details className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <summary className="text-xs font-medium text-gray-700 cursor-pointer">
            Stack Trace
          </summary>
          <pre className="mt-2 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
            {error.stack}
          </pre>
        </details>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          Try Again
        </button>
        <a
          href="/admin/enrolments"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
        >
          Reload Page
        </a>
        <a
          href="/admin"
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-sm font-medium"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
