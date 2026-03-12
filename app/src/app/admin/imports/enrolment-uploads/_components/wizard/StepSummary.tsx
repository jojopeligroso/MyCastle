'use client';

/**
 * StepSummary - Wizard Step 6
 * Display results of the import with counts and details
 */

import {
  CheckCircle,
  UserPlus,
  RefreshCw,
  Download,
  Plus,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import type { ApplyResult } from '../ImportWizard';

interface StepSummaryProps {
  result: ApplyResult;
  onDone: () => void;
  onStartNew: () => void;
}

export default function StepSummary({ result, onDone, onStartNew }: StepSummaryProps) {
  const hasErrors = result.errors && result.errors.length > 0;
  const totalChanges = result.insertedCount + result.updatedCount;

  const handleDownloadCSV = () => {
    // Build CSV content
    const lines: string[] = ['Type,Name,Email/Class,Details'];

    // Add inserted students
    if (result.insertedStudents) {
      for (const student of result.insertedStudents) {
        lines.push(`New Student,"${student.name}","${student.email}","Created"`);
      }
    } else if (result.insertedCount > 0) {
      lines.push(`New Students,${result.insertedCount},"","Inserted"`);
    }

    // Add updated enrollments
    if (result.updatedEnrollments) {
      for (const enrollment of result.updatedEnrollments) {
        lines.push(
          `Updated,"${enrollment.studentName}","${enrollment.className}","Enrollment updated"`
        );
      }
    } else if (result.updatedCount > 0) {
      lines.push(`Updates,${result.updatedCount},"","Updated"`);
    }

    // Add skipped
    if (result.skippedCount > 0) {
      lines.push(`Skipped,${result.skippedCount},"","No changes needed"`);
    }

    // Add errors
    for (const error of result.errors || []) {
      lines.push(`Error,"${error.replace(/"/g, '""')}","","Failed"`);
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import-summary-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Import Complete</h2>
        <p className="mt-2 text-gray-500">
          {totalChanges} {totalChanges === 1 ? 'change' : 'changes'} applied successfully
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-green-50 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <UserPlus className="h-6 w-6" />
            <span className="text-3xl font-bold">{result.insertedCount}</span>
          </div>
          <p className="text-sm font-medium text-green-700">New Students Created</p>
        </div>

        <div className="p-6 bg-blue-50 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
            <RefreshCw className="h-6 w-6" />
            <span className="text-3xl font-bold">{result.updatedCount}</span>
          </div>
          <p className="text-sm font-medium text-blue-700">Enrollments Updated</p>
        </div>

        <div className="p-6 bg-gray-50 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <ArrowRight className="h-6 w-6" />
            <span className="text-3xl font-bold">{result.skippedCount}</span>
          </div>
          <p className="text-sm font-medium text-gray-700">Skipped (No Changes)</p>
        </div>
      </div>

      {/* Inserted Students List */}
      {result.insertedStudents && result.insertedStudents.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-green-800">
              New Students ({result.insertedStudents.length})
            </h3>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.insertedStudents.map((student, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{student.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Updated Enrollments List */}
      {result.updatedEnrollments && result.updatedEnrollments.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-blue-800">
              Updated Enrollments ({result.updatedEnrollments.length})
            </h3>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.updatedEnrollments.map((enrollment, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{enrollment.studentName}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{enrollment.className}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Errors */}
      {hasErrors && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                {result.errors!.length} {result.errors!.length === 1 ? 'Error' : 'Errors'} Occurred
              </h4>
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                {result.errors!.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t">
        <button
          onClick={handleDownloadCSV}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Summary
        </button>
        <button
          onClick={onStartNew}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Import Another File
        </button>
        <button
          onClick={onDone}
          className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
        >
          Done
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
