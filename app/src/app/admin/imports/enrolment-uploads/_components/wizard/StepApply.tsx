'use client';

/**
 * StepApply - Wizard Step 5
 * Execute the import changes with progress feedback
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import type { ApplyResult } from '../ImportWizard';

interface StepApplyProps {
  batchId: string;
  onComplete: (result: ApplyResult) => void;
  onError: (error: string | null) => void;
  onBack: () => void;
}

type ApplyStatus = 'ready' | 'applying' | 'completed' | 'failed';

export default function StepApply({ batchId, onComplete, onError, onBack }: StepApplyProps) {
  const [status, setStatus] = useState<ApplyStatus>('ready');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApply = useCallback(async () => {
    setStatus('applying');
    setProgress(10);
    setError(null);

    try {
      // Simulate progress while applying
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 500);

      const response = await fetch(`/api/imports/batches/${batchId}/apply`, {
        method: 'POST',
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.join(', ') || data.error || 'Apply failed');
      }

      setProgress(100);
      setStatus('completed');
      setResult({
        insertedCount: data.insertedCount || 0,
        updatedCount: data.updatedCount || 0,
        skippedCount: data.skippedCount || 0,
        errors: data.errors || [],
        insertedStudents: data.insertedStudents,
        updatedEnrollments: data.updatedEnrollments,
      });

      // Auto-proceed after short delay
      setTimeout(() => {
        onComplete({
          insertedCount: data.insertedCount || 0,
          updatedCount: data.updatedCount || 0,
          skippedCount: data.skippedCount || 0,
          errors: data.errors || [],
          insertedStudents: data.insertedStudents,
          updatedEnrollments: data.updatedEnrollments,
        });
      }, 1500);
    } catch (err) {
      setStatus('failed');
      setProgress(0);
      const message = err instanceof Error ? err.message : 'Apply failed';
      setError(message);
      onError(message);
    }
  }, [batchId, onComplete, onError]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Apply Changes</h2>
        <p className="mt-1 text-sm text-gray-500">
          Execute the confirmed changes to create and update records
        </p>
      </div>

      {/* Status Display */}
      <div className="flex flex-col items-center justify-center py-12">
        {status === 'ready' && (
          <>
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-6">
              <Play className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Apply</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
              Click the button below to apply all confirmed changes. This will create new students
              and update existing enrollments.
            </p>
            <button
              onClick={handleApply}
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="h-4 w-4 mr-2" />
              Apply Changes
            </button>
          </>
        )}

        {status === 'applying' && (
          <>
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-6">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Applying Changes...</h3>

            {/* Progress Bar */}
            <div className="w-full max-w-md mb-4">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 text-center mt-2">{progress}% complete</p>
            </div>

            <p className="text-sm text-gray-500">Creating students and updating enrollments...</p>
          </>
        )}

        {status === 'completed' && result && (
          <>
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Changes Applied Successfully</h3>

            {/* Result Stats */}
            <div className="flex items-center gap-8 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                  <UserPlus className="h-5 w-5" />
                  <span className="text-2xl font-semibold">{result.insertedCount}</span>
                </div>
                <p className="text-sm text-gray-500">Students Created</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                  <RefreshCw className="h-5 w-5" />
                  <span className="text-2xl font-semibold">{result.updatedCount}</span>
                </div>
                <p className="text-sm text-gray-500">Enrollments Updated</p>
              </div>
            </div>

            <p className="text-sm text-gray-500">Proceeding to summary...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Apply Failed</h3>
            <p className="text-sm text-red-600 text-center max-w-md mb-6">
              {error || 'An error occurred while applying changes.'}
            </p>
            <div className="flex gap-4">
              <button
                onClick={onBack}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Review
              </button>
              <button
                onClick={handleApply}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </>
        )}
      </div>

      {/* Back button (only when ready) */}
      {status === 'ready' && (
        <div className="pt-4 border-t">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>
      )}
    </div>
  );
}
