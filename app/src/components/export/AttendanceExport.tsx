/**
 * Attendance Export Component - T-054 Integration
 * Weekly CSV export with audit hash columns for tamper detection
 * Connected to /api/attendance/export
 */

'use client';

import { useState } from 'react';

interface AttendanceExportProps {
  classes?: { id: string; name: string; code: string | null }[];
}

export function AttendanceExport({ classes }: AttendanceExportProps) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [weekStart, setWeekStart] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{
    recordCount: number;
    executionTime: number;
    filename: string;
  } | null>(null);

  // Get current week start (Monday)
  const getCurrentWeekStart = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    return monday.toISOString().split('T')[0];
  };

  const handleExport = async () => {
    if (!selectedClass || !weekStart) {
      setError('Please select a class and week');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/attendance/export?weekStart=${weekStart}&classId=${selectedClass}`
      );

      if (!response.ok) {
        throw new Error('Failed to export attendance');
      }

      // Get metadata from headers
      const executionTime = parseInt(response.headers.get('X-Execution-Time-Ms') || '0');
      const recordCount = parseInt(response.headers.get('X-Record-Count') || '0');
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        'attendance_export.csv';

      // Download the CSV
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update last export info
      setLastExport({
        recordCount,
        executionTime,
        filename,
      });
    } catch (err) {
      console.error('[AttendanceExport] Export error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Export Attendance</h2>
        <p className="text-sm text-gray-500 mt-1">
          Download tamper-evident CSV with hash verification
        </p>
      </div>

      <div className="p-6">
        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Export Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="export-class"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Class
              </label>
              <select
                id="export-class"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isExporting}
              >
                <option value="">Select a class...</option>
                {classes?.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.code && `(${cls.code})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="export-week" className="block text-sm font-medium text-gray-700 mb-2">
                Week Start (Monday)
              </label>
              <div className="flex gap-2">
                <input
                  id="export-week"
                  type="date"
                  value={weekStart}
                  onChange={e => setWeekStart(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                />
                <button
                  onClick={() => setWeekStart(getCurrentWeekStart())}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isExporting}
                >
                  This Week
                </button>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={isExporting || !selectedClass || !weekStart}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Last Export Info */}
        {lastExport && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Last Export</h3>
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-green-700 font-medium">File</div>
                  <div className="text-green-900 mt-1">{lastExport.filename}</div>
                </div>
                <div>
                  <div className="text-green-700 font-medium">Records</div>
                  <div className="text-green-900 mt-1">
                    {lastExport.recordCount} attendance records
                  </div>
                </div>
                <div>
                  <div className="text-green-700 font-medium">Performance</div>
                  <div className="text-green-900 mt-1">
                    {lastExport.executionTime}ms
                    {lastExport.executionTime > 60000 && ' (exceeds 60s target)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hash Verification Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-blue-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Tamper-Evident Export</h4>
                <p className="text-xs text-blue-800">
                  Exported CSV files include SHA256 hash columns for each attendance record. The
                  hash chain ensures any modification to the data will be detected. Each
                  record&apos;s hash is computed as:{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded">
                    SHA256(payload || previous_hash)
                  </code>
                </p>
                <div className="mt-3 text-xs text-blue-800">
                  <strong>Columns included:</strong> Student Name, Email, Date, Time, Status, Notes,
                  Recorded By, Hash (SHA256), Previous Hash, Edit Count, Last Edited
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
