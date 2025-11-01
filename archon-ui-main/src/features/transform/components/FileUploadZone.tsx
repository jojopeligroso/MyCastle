/**
 * File Upload Zone Component
 * Handles drag-and-drop and click-to-upload for XLSX files
 */

import { useCallback, useState } from "react";
import { FileSpreadsheet } from "lucide-react";

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
}

export const FileUploadZone = ({ onFileSelected, isUploading }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const xlsxFile = files.find((f) => f.name.toLowerCase().endsWith(".xlsx"));

      if (xlsxFile) {
        onFileSelected(xlsxFile);
      }
    },
    [onFileSelected],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        onFileSelected(files[0]);
      }
    },
    [onFileSelected],
  );

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-all
          ${isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-700"}
          ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-blue-400"}
        `}
      >
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />

        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              {isUploading ? (
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">
                {isUploading ? "Uploading..." : "Upload XLSX File"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Drag and drop or click to browse
              </p>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500">
              Supported format: .xlsx (Excel 2007+)
            </div>
          </div>
        </label>
      </div>
    </div>
  );
};
