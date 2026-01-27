/**
 * Attendance Export Component - Task 1.4.4
 * Bulk export with date range, multi-class, and format selection (CSV/XLSX)
 * Connected to /api/attendance/export
 */

'use client';

import { useState } from 'react';

interface AttendanceExportProps {
  classes?: { id: string; name: string; code: string | null }[];
}

export function AttendanceExport({ classes }: AttendanceExportProps) {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{
    recordCount: number;
    executionTime: number;
    filename: string;
    signedUrl?: string;
  } | null>(null);

  // Get current week dates
  const getCurrentWeekDates = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handleExport = async () => {
    if (selectedClasses.length === 0 || !startDate || !endDate) {
      setError('Please select at least one class and date range');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/attendance/export?startDate=${startDate}&endDate=${endDate}&classIds=${selectedClasses.join(',')}&format=${format}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export attendance');
      }

      const contentType = response.headers.get('Content-Type');

      // Check if response is JSON (signed URL) or file
      if (contentType?.includes('application/json')) {
        const data = await response.json();

        // Update last export info
        setLastExport({
          recordCount: data.recordCount,
          executionTime: data.executionTime,
          filename: data.filename,
          signedUrl: data.signedUrl,
        });

        // Open signed URL in new tab
        if (data.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      } else {
        // Direct download (fallback)
        const executionTime = parseInt(response.headers.get('X-Execution-Time-Ms') || '0');
        const recordCount = parseInt(response.headers.get('X-Record-Count') || '0');
        const filename =
          response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
          `attendance_export.${format}`;

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setLastExport({
          recordCount,
          executionTime,
          filename,
        });
      }
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
          Download tamper-evident reports with hash verification (CSV or XLSX)
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
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isExporting}
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="flex gap-2">
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isExporting}
                />
                <button
                  onClick={() => {
                    const dates = getCurrentWeekDates();
                    setStartDate(dates.start);
                    setEndDate(dates.end);
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isExporting}
                >
                  This Week
                </button>
              </div>
            </div>
          </div>

          {/* Classes Multi-Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classes (select multiple)
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
              {classes && classes.length > 0 ? (
                <div className="space-y-2">
                  {classes.map(cls => (
                    <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(cls.id)}
                        onChange={() => handleClassToggle(cls.id)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        disabled={isExporting}
                      />
                      <span className="text-sm text-gray-700">
                        {cls.name} {cls.code && `(${cls.code})`}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No classes available</p>
              )}
            </div>
            {selectedClasses.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedClasses.length} class{selectedClasses.length !== 1 ? 'es' : ''} selected
              </p>
            )}
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="text-purple-600 focus:ring-purple-500"
                  disabled={isExporting}
                />
                <span className="text-sm text-gray-700">CSV (Comma-separated)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                  className="text-purple-600 focus:ring-purple-500"
                  disabled={isExporting}
                />
                <span className="text-sm text-gray-700">XLSX (Excel)</span>
              </label>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={isExporting || selectedClasses.length === 0 || !startDate || !endDate}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
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
                  Export {format.toUpperCase()}
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
                  {lastExport.signedUrl && (
                    <a
                      href={lastExport.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:underline mt-1 inline-block"
                    >
                      Download again (expires in 24h)
                    </a>
                  )}
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
                  Exported files include SHA256 hash columns for each attendance record. The hash
                  chain ensures any modification to the data will be detected. Each record&apos;s
                  hash is computed as:{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded">
                    SHA256(payload || previous_hash)
                  </code>
                </p>
                <div className="mt-3 text-xs text-blue-800">
                  <strong>Columns included:</strong> Student Name, Email, Date, Time, Status, Notes,
                  Recorded By, Hash (SHA256), Previous Hash, Edit Count, Last Edited
                </div>
                {lastExport?.signedUrl && (
                  <div className="mt-3 text-xs text-blue-800">
                    <strong>Signed URL:</strong> Secure download link expires in 24 hours
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
