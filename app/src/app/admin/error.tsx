'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[Admin Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Something went wrong
        </h2>

        {/* Error Message */}
        <p className="text-sm text-gray-600 text-center mb-4">
          {error.message || 'An unexpected error occurred in the admin interface.'}
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <summary className="text-xs font-medium text-gray-700 cursor-pointer">
              Error Details
            </summary>
            <pre className="mt-2 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
              {error.stack}
            </pre>
            {error.digest && <p className="mt-2 text-xs text-gray-500">Error ID: {error.digest}</p>}
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Try Again
          </button>
          <a
            href="/admin"
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm text-center"
          >
            Back to Dashboard
          </a>
        </div>

        {/* Help Text */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          If this problem persists, please contact support or check the console for more details.
        </p>
      </div>
    </div>
  );
}
