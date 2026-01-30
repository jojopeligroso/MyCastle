/**
 * Bulk Upload Page (Placeholder) - Task 1.11.2
 *
 * Placeholder UI for bulk data imports.
 * Full ETL validation and processing deferred to Phase 2.
 */

import { requireAuth } from '@/lib/auth/utils';
import { Upload, FileSpreadsheet, AlertCircle, Info } from 'lucide-react';

export default async function BulkUploadPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Data Upload</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import students, classes, and enrollments via CSV or Excel files
        </p>
      </div>

      {/* Phase 2 Notice Banner */}
      <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Phase 2 Feature</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Full bulk upload functionality with validation, change detection, and user
                confirmation will be implemented in Phase 2. This page provides a preview of the
                interface.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Entity Type Selection */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">1. Select Data Type</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <button
                  type="button"
                  disabled
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-center">
                    <svg
                      className="h-8 w-8 text-indigo-600 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">Students</span>
                    <span className="text-xs text-gray-500 mt-1">Import student records</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-center">
                    <svg
                      className="h-8 w-8 text-indigo-600 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">Classes</span>
                    <span className="text-xs text-gray-500 mt-1">Import class schedules</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-center">
                    <svg
                      className="h-8 w-8 text-indigo-600 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">Enrollments</span>
                    <span className="text-xs text-gray-500 mt-1">Import enrollments</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">2. Upload File</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-not-allowed inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-400 shadow-sm ring-1 ring-inset ring-gray-300"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select File
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      disabled
                      accept=".csv,.xlsx,.xls"
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">CSV, XLSX, or XLS files up to 10MB</p>
              </div>

              {/* Upload Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload and Validate
                </button>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">3. Review Changes</h3>
              <div className="rounded-lg border border-gray-300 bg-gray-50 p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Upload a file to preview changes</p>
                <p className="mt-1 text-xs text-gray-400">
                  You'll see a summary of new records, updates, and potential errors
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow sm:rounded-lg sticky top-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Instructions</h3>

              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">File Format</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>CSV or Excel (.xlsx, .xls)</li>
                    <li>First row must contain headers</li>
                    <li>UTF-8 encoding recommended</li>
                    <li>Maximum 10MB file size</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Students Template</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>firstName (required)</li>
                    <li>lastName (required)</li>
                    <li>email (required, unique)</li>
                    <li>dateOfBirth (YYYY-MM-DD)</li>
                    <li>nationality</li>
                    <li>phone</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Classes Template</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>name (required, unique)</li>
                    <li>level (A1, A2, B1, B2, C1, C2)</li>
                    <li>startDate (YYYY-MM-DD)</li>
                    <li>endDate (YYYY-MM-DD)</li>
                    <li>capacity (number)</li>
                    <li>teacherEmail</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Enrollments Template</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>studentEmail (required)</li>
                    <li>className (required)</li>
                    <li>startDate (YYYY-MM-DD)</li>
                    <li>endDate (YYYY-MM-DD, optional)</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    disabled
                    className="w-full inline-flex justify-center items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
