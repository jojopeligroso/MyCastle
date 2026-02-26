'use client';

/**
 * UploadBatchDialog Component
 * Modal dialog for uploading new import files
 * Ref: spec/IMPORTS_UI_SPEC.md Section 7.3
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, AlertTriangle, FileSpreadsheet, Loader2 } from 'lucide-react';
import SheetSelectorDialog from './SheetSelectorDialog';

interface SheetInfo {
  name: string;
  rowCount: number;
}

export default function UploadBatchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Multi-sheet state
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [multiSheetFileName, setMultiSheetFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validate extension
    const ext = selectedFile.name.toLowerCase().split('.').pop();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setError('Please select an Excel file (.xlsx or .xls)');
      setFile(null);
      return;
    }

    // Validate size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (sheetName?: string) => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (sheetName) {
        formData.append('sheetName', sheetName);
      }

      const response = await fetch('/api/imports/batches', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Check if this is a multi-sheet response
      if (result.multiSheet) {
        setSheets(result.sheets);
        setMultiSheetFileName(result.fileName);
        setShowSheetSelector(true);
        setIsUploading(false);
        return;
      }

      // Success - navigate to batch detail
      setIsOpen(false);
      setFile(null);
      setShowSheetSelector(false);
      setSheets([]);
      router.push(`/admin/imports/enrolment-uploads/${result.batchId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSheetSelect = (sheetName: string) => {
    // Re-upload with selected sheet
    handleUpload(sheetName);
  };

  const handleSheetSelectorCancel = () => {
    setShowSheetSelector(false);
    setSheets([]);
    setMultiSheetFileName('');
    setIsUploading(false);
  };

  const handleClose = () => {
    if (isUploading) return;
    setIsOpen(false);
    setFile(null);
    setError(null);
    setShowSheetSelector(false);
    setSheets([]);
    setMultiSheetFileName('');
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload File
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleClose}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Enrolment File</h3>
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Info Banner */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Multi-sheet files supported</p>
                    <p className="mt-1">
                      If your file has multiple worksheets, you'll be able to select which one to
                      import.
                    </p>
                  </div>
                </div>
              </div>

              {/* Column Info */}
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Columns used:</span> Student Name, Start Date, Class
                  Name, End Date, XXX Register Flag
                </p>
                <p className="text-xs text-gray-500 mt-1">Extra columns will be ignored.</p>
              </div>

              {/* File Input */}
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />

                {file ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-800">{file.name}</p>
                        <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      disabled={isUploading}
                      className="text-green-600 hover:text-green-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50"
                  >
                    <div className="text-center">
                      <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">Click to select or drag and drop</p>
                      <p className="text-xs text-gray-500">.xlsx or .xls (max 10MB)</p>
                    </div>
                  </button>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpload()}
                  disabled={!file || isUploading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sheet Selector Dialog */}
      <SheetSelectorDialog
        isOpen={showSheetSelector}
        fileName={multiSheetFileName}
        sheets={sheets}
        onSelect={handleSheetSelect}
        onCancel={handleSheetSelectorCancel}
        isLoading={isUploading}
      />
    </>
  );
}
