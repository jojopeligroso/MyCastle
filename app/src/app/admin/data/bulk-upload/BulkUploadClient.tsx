'use client';

/**
 * Bulk Upload Client Component
 * Drag-and-drop file upload with preview and confirmation
 */

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  parseAndValidateFile,
  commitBulkUpload,
  type EntityType,
  type UploadPreview,
  type PreviewRecord,
} from './_actions';

type UploadState = 'idle' | 'uploading' | 'preview' | 'committing' | 'success' | 'error';

export default function BulkUploadClient() {
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (!entityType) {
      setError('Please select a data type first');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploadState('uploading');

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();

      // Parse and validate
      const result = await parseAndValidateFile(arrayBuffer, entityType);
      setPreview(result);

      if (result.success) {
        setUploadState('preview');
      } else {
        setUploadState('error');
        setError('File validation failed. Please check errors below.');
      }
    } catch (err) {
      setUploadState('error');
      setError(`Failed to process file: ${(err as Error).message}`);
    }
  };

  // Handle drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  // Handle commit
  const handleCommit = async () => {
    if (!preview) return;

    setUploadState('committing');
    setError(null);

    try {
      const result = await commitBulkUpload(preview);

      if (result.success) {
        setUploadState('success');
      } else {
        setUploadState('error');
        setError(`Failed to commit changes. ${result.failed} records failed.`);
      }
    } catch (err) {
      setUploadState('error');
      setError(`Failed to commit: ${(err as Error).message}`);
    }
  };

  // Reset state
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Entity Type Selection */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">1. Select Data Type</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(['students', 'classes', 'enrollments'] as EntityType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setEntityType(type);
                  handleReset();
                }}
                className={`relative rounded-lg border px-6 py-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  entityType === type
                    ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50'
                    : 'border-gray-300 bg-white hover:border-indigo-400'
                }`}
              >
                <div className="flex flex-col items-center">
                  <FileSpreadsheet className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
                  <span className="text-xs text-gray-500 mt-1">Import {type}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">2. Upload File</h3>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50'
                : file
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
            }`}
          >
            {file ? (
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            ) : (
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <div className="mt-4">
              {file ? (
                <div>
                  <p className="text-sm font-medium text-green-900">{file.name}</p>
                  <p className="text-xs text-green-600 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                  <button
                    onClick={handleReset}
                    className="mt-3 text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Choose different file
                  </button>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="file-upload"
                    className={`relative inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                      entityType
                        ? 'cursor-pointer bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'cursor-not-allowed bg-gray-300 text-gray-500'
                    }`}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {entityType ? 'Select File' : 'Select Data Type First'}
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      disabled={!entityType}
                      accept=".csv,.xlsx,.xls"
                      onChange={e => handleFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    or drag and drop CSV, XLSX, or XLS files (up to 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {uploadState === 'uploading' && (
            <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing file...
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {preview && uploadState === 'preview' && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">3. Review Changes</h3>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <StatCard label="Total Rows" value={preview.totalRows} color="blue" />
              <StatCard label="Valid" value={preview.validRows} color="green" />
              <StatCard label="Invalid" value={preview.invalidRows} color="red" />
              <StatCard label="New Records" value={preview.inserts} color="indigo" />
              <StatCard label="Updates" value={preview.updates} color="yellow" />
            </div>

            {/* Preview Table */}
            {preview.records.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Change
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {preview.records.slice(0, 50).map(record => (
                      <PreviewRow key={record.rowNumber} record={record} />
                    ))}
                  </tbody>
                </table>
                {preview.records.length > 50 && (
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    Showing first 50 of {preview.records.length} records
                  </p>
                )}
              </div>
            )}

            {/* Commit Button */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleReset}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={preview.validRows === 0 || uploadState === 'committing'}
                className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {uploadState === 'committing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Import {preview.validRows} Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadState === 'success' && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Successful!</h3>
              <p className="text-sm text-gray-600 mb-6">
                Your data has been imported successfully.
              </p>
              <button
                onClick={handleReset}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Import More Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-900',
    green: 'bg-green-100 text-green-900',
    red: 'bg-red-100 text-red-900',
    indigo: 'bg-indigo-100 text-indigo-900',
    yellow: 'bg-yellow-100 text-yellow-900',
  };

  return (
    <div className={`rounded-lg p-4 ${colors[color as keyof typeof colors]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

// Preview Row Component
function PreviewRow({ record }: { record: PreviewRecord }) {
  const hasErrors = record.errors.length > 0;

  return (
    <tr className={hasErrors ? 'bg-red-50' : ''}>
      <td className="px-3 py-2 text-sm text-gray-900">{record.rowNumber}</td>
      <td className="px-3 py-2">
        {hasErrors ? (
          <span className="inline-flex items-center text-xs text-red-700">
            <XCircle className="mr-1 h-3 w-3" />
            Error
          </span>
        ) : (
          <span className="inline-flex items-center text-xs text-green-700">
            <CheckCircle className="mr-1 h-3 w-3" />
            Valid
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            record.changeType === 'insert'
              ? 'bg-indigo-100 text-indigo-800'
              : record.changeType === 'update'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {record.changeType}
        </span>
      </td>
      <td className="px-3 py-2">
        {hasErrors ? (
          <div className="text-xs text-red-700">
            {record.errors.map((err, i) => (
              <div key={i}>
                <strong>{err.field}:</strong> {err.message}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-600">
            {Object.entries(record.data)
              .slice(0, 3)
              .map(([key, value]) => (
                <span key={key} className="mr-2">
                  <strong>{key}:</strong> {String(value)}
                </span>
              ))}
          </div>
        )}
      </td>
    </tr>
  );
}
