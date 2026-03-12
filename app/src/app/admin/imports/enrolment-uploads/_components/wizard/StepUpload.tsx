'use client';

/**
 * StepUpload - Wizard Step 1
 * File dropzone with drag & drop, validation, and upload
 */

import { useRef, useCallback, useState } from 'react';
import { FileSpreadsheet, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import type { SheetInfo } from '../ImportWizard';

interface StepUploadProps {
  file: File | null;
  onFileSelected: (file: File) => void;
  onUploadComplete: (result: {
    batchId?: string;
    multiSheet?: boolean;
    sheets?: SheetInfo[];
  }) => void;
  onError: (error: string | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export default function StepUpload({
  file,
  onFileSelected,
  onUploadComplete,
  onError,
  isLoading,
  setLoading,
}: StepUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFile = useCallback((selectedFile: File): string | null => {
    const ext = selectedFile.name.toLowerCase().split('.').pop();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return 'Please select an Excel file (.xlsx or .xls)';
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const error = validateFile(selectedFile);
      if (error) {
        setValidationError(error);
        return;
      }
      setValidationError(null);
      onFileSelected(selectedFile);
    },
    [validateFile, onFileSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const selectedFile = e.dataTransfer.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClearFile = useCallback(() => {
    onFileSelected(null as unknown as File);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelected]);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    onError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/imports/batches', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      onUploadComplete(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }, [file, setLoading, onError, onUploadComplete]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Upload Enrolment File</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select an Excel file containing student enrolment data
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Supported columns</p>
            <p className="mt-1">
              Name, Start Date, End Date, Class Name, Course, Weeks, Visa, Nationality, and more.
              Multi-sheet files are supported.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleInputChange}
        className="hidden"
        disabled={isLoading}
      />

      {/* Dropzone or Selected File */}
      {file ? (
        <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">{file.name}</p>
                <p className="text-sm text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={handleClearFile}
              disabled={isLoading}
              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isLoading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`p-12 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        >
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-700">
              {isDragOver ? 'Drop file here' : 'Click to select or drag and drop'}
            </p>
            <p className="mt-2 text-sm text-gray-500">.xlsx or .xls files up to 10MB</p>
          </div>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleUpload}
          disabled={!file || isLoading}
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Continue
            </>
          )}
        </button>
      </div>
    </div>
  );
}
