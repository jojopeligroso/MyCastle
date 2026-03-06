'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ClassOption {
  id: string;
  name: string;
  level: string | null;
  teacherName: string | null;
}

interface ExistingDiagnostic {
  id: string;
  status: string;
  stageResults: {
    written?: { score: number; notes: string | null; completedAt: string };
    oral?: { score: number; notes: string | null; completedAt: string };
  };
  recommendedLevel: string | null;
  actualPlacementLevel: string | null;
  notes: string | null;
}

interface DiagnosticInputFormProps {
  studentId: string;
  studentName: string;
  existingDiagnostic?: ExistingDiagnostic | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CEFR_LEVELS = ['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];

export function DiagnosticInputForm({
  studentId,
  studentName,
  existingDiagnostic,
  onSuccess,
  onCancel,
}: DiagnosticInputFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    // Written test (Admin)
    writtenScore: existingDiagnostic?.stageResults?.written?.score ?? '',
    writtenNotes: existingDiagnostic?.stageResults?.written?.notes ?? '',

    // Oral test (DoS)
    oralScore: existingDiagnostic?.stageResults?.oral?.score ?? '',
    oralNotes: existingDiagnostic?.stageResults?.oral?.notes ?? '',

    // Level recommendation
    recommendedLevel: existingDiagnostic?.recommendedLevel ?? '',

    // Placement
    actualPlacementLevel: existingDiagnostic?.actualPlacementLevel ?? '',
    placementClassId: '',

    // General notes
    notes: existingDiagnostic?.notes ?? '',
  });

  const isEditing = !!existingDiagnostic;
  const hasWrittenResults = existingDiagnostic?.stageResults?.written !== undefined;
  const hasOralResults = existingDiagnostic?.stageResults?.oral !== undefined;

  // Fetch available classes for placement
  useEffect(() => {
    async function fetchClasses() {
      setIsLoadingClasses(true);
      try {
        const response = await fetch('/api/admin/classes?status=active');
        if (response.ok) {
          const data = await response.json();
          setClasses(
            data.classes?.map(
              (c: { id: string; name: string; level?: string; teacher?: { name: string } }) => ({
                id: c.id,
                name: c.name,
                level: c.level || null,
                teacherName: c.teacher?.name || null,
              })
            ) || []
          );
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      } finally {
        setIsLoadingClasses(false);
      }
    }

    fetchClasses();
  }, []);

  // Filter classes by recommended level
  const filteredClasses = formData.recommendedLevel
    ? classes.filter(c => c.level === formData.recommendedLevel || !c.level)
    : classes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {};

      // Written test data
      if (formData.writtenScore !== '') {
        payload.writtenScore = Number(formData.writtenScore);
        payload.writtenNotes = formData.writtenNotes || undefined;
      }

      // Oral test data
      if (formData.oralScore !== '') {
        payload.oralScore = Number(formData.oralScore);
        payload.oralNotes = formData.oralNotes || undefined;
      }

      // Level recommendation
      if (formData.recommendedLevel) {
        payload.recommendedLevel = formData.recommendedLevel;
      }

      // Placement
      if (formData.actualPlacementLevel) {
        payload.actualPlacementLevel = formData.actualPlacementLevel;
      }
      if (formData.placementClassId) {
        payload.placementClassId = formData.placementClassId;
      }

      // Notes
      if (formData.notes) {
        payload.notes = formData.notes;
      }

      let response: Response;

      if (isEditing && existingDiagnostic) {
        // Update existing diagnostic
        response = await fetch(`/api/admin/students/${studentId}/diagnostics`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagnosticId: existingDiagnostic.id, ...payload }),
        });
      } else {
        // Create new diagnostic
        response = await fetch(`/api/admin/students/${studentId}/diagnostics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save diagnostic');
      }

      setSuccess(true);

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect back to student profile after brief delay
        setTimeout(() => {
          router.push(`/admin/students/${studentId}`);
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number | string) => {
    const numScore = typeof score === 'string' ? parseInt(score, 10) : score;
    if (isNaN(numScore)) return 'text-gray-400';
    if (numScore >= 80) return 'text-green-600';
    if (numScore >= 60) return 'text-blue-600';
    if (numScore >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Update Diagnostic Assessment' : 'New Diagnostic Assessment'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Recording for <span className="font-medium">{studentName}</span>
            </p>
          </div>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            Diagnostic {isEditing ? 'updated' : 'recorded'} successfully! Redirecting...
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Written Test Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
              1
            </div>
            <h3 className="text-base font-medium text-gray-900">Written Diagnostic Test</h3>
            {hasWrittenResults && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                Completed
              </span>
            )}
          </div>

          <div className="ml-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Written Test Score (0-100)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.writtenScore}
                  onChange={e => setFormData({ ...formData, writtenScore: e.target.value })}
                  placeholder="Enter score"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {formData.writtenScore !== '' && (
                  <span
                    className={`absolute right-3 top-2 font-semibold ${getScoreColor(formData.writtenScore)}`}
                  >
                    {formData.writtenScore}%
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Written Test Notes
              </label>
              <textarea
                value={formData.writtenNotes}
                onChange={e => setFormData({ ...formData, writtenNotes: e.target.value })}
                rows={2}
                placeholder="Observations from written test..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Oral Test Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
              2
            </div>
            <h3 className="text-base font-medium text-gray-900">Oral Diagnostic (DoS)</h3>
            {hasOralResults && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                Completed
              </span>
            )}
          </div>

          <div className="ml-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Oral Test Score (0-100)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.oralScore}
                  onChange={e => setFormData({ ...formData, oralScore: e.target.value })}
                  placeholder="Enter score"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {formData.oralScore !== '' && (
                  <span
                    className={`absolute right-3 top-2 font-semibold ${getScoreColor(formData.oralScore)}`}
                  >
                    {formData.oralScore}%
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Oral Test Notes
              </label>
              <textarea
                value={formData.oralNotes}
                onChange={e => setFormData({ ...formData, oralNotes: e.target.value })}
                rows={2}
                placeholder="Observations from oral assessment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Level Recommendation Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-semibold text-sm">
              3
            </div>
            <h3 className="text-base font-medium text-gray-900">Level Recommendation</h3>
          </div>

          <div className="ml-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recommended CEFR Level
              </label>
              <select
                value={formData.recommendedLevel}
                onChange={e => setFormData({ ...formData, recommendedLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select level...</option>
                {CEFR_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Additional observations or recommendations..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Placement Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold text-sm">
              4
            </div>
            <h3 className="text-base font-medium text-gray-900">Provisional Placement</h3>
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              First Week Trial
            </span>
          </div>

          <div className="ml-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Placement Level
              </label>
              <select
                value={formData.actualPlacementLevel}
                onChange={e => setFormData({ ...formData, actualPlacementLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select level...</option>
                {CEFR_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              {formData.recommendedLevel &&
                formData.actualPlacementLevel &&
                formData.recommendedLevel !== formData.actualPlacementLevel && (
                  <p className="text-xs text-amber-600 mt-1">
                    Note: Placement level differs from recommended level
                  </p>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provisional Class
              </label>
              {isLoadingClasses ? (
                <div className="flex items-center py-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                  Loading classes...
                </div>
              ) : (
                <select
                  value={formData.placementClassId}
                  onChange={e => setFormData({ ...formData, placementClassId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select class...</option>
                  {filteredClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.level && `(${cls.level})`}{' '}
                      {cls.teacherName && `- ${cls.teacherName}`}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Student will be enrolled provisionally for 1 week
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting || success}
            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Diagnostic' : 'Save Diagnostic'}
          </button>
        </div>
      </form>
    </div>
  );
}
