'use client';

import React, { useState, useEffect } from 'react';

interface AssessmentType {
  id: string;
  name: string;
  description: string | null;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SummativeAssessmentFormProps {
  studentId: string;
  studentName: string;
  classes?: ClassOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SummativeAssessmentForm({
  studentId,
  studentName,
  classes = [],
  onSuccess,
  onCancel,
}: SummativeAssessmentFormProps) {
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    assessmentTypeId: '',
    scorePercentage: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    classId: '',
    notes: '',
  });

  // Fetch assessment types
  useEffect(() => {
    async function fetchTypes() {
      try {
        const res = await fetch('/api/admin/summative-types');
        if (res.ok) {
          const data = await res.json();
          // Only show active types
          const activeTypes = (data.types || []).filter(
            (t: { isActive: boolean | null }) => t.isActive
          );
          setTypes(activeTypes);
        }
      } catch (err) {
        console.error('Failed to fetch assessment types:', err);
      } finally {
        setIsLoadingTypes(false);
      }
    }

    fetchTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assessmentTypeId) {
      setError('Please select an assessment type');
      return;
    }

    if (!formData.scorePercentage || isNaN(parseFloat(formData.scorePercentage))) {
      setError('Please enter a valid score');
      return;
    }

    const score = parseFloat(formData.scorePercentage);
    if (score < 0 || score > 100) {
      setError('Score must be between 0 and 100');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/students/${studentId}/summative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentTypeId: formData.assessmentTypeId,
          scorePercentage: score,
          assessmentDate: formData.assessmentDate,
          classId: formData.classId || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record assessment');
      }

      setSuccess(true);
      setFormData({
        assessmentTypeId: '',
        scorePercentage: '',
        assessmentDate: new Date().toISOString().split('T')[0],
        classId: '',
        notes: '',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get score color based on percentage
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const currentScore = parseFloat(formData.scorePercentage) || 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Record Summative Assessment</h3>
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Assessment recorded successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Assessment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type</label>
          {isLoadingTypes ? (
            <div className="flex items-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span className="ml-2 text-sm text-gray-500">Loading types...</span>
            </div>
          ) : types.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                No assessment types defined.{' '}
                <a href="/admin/settings/assessment-types" className="underline hover:no-underline">
                  Create one first
                </a>
                .
              </p>
            </div>
          ) : (
            <select
              value={formData.assessmentTypeId}
              onChange={e => setFormData({ ...formData, assessmentTypeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select assessment type...</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Score and Date Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Score (%)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.scorePercentage}
                onChange={e => setFormData({ ...formData, scorePercentage: e.target.value })}
                placeholder="0-100"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {formData.scorePercentage && (
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold ${getScoreColor(currentScore)}`}
                >
                  {currentScore.toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.assessmentDate}
              onChange={e => setFormData({ ...formData, assessmentDate: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Class (optional) */}
        {classes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={formData.classId}
              onChange={e => setFormData({ ...formData, classId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">No specific class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            placeholder="Any additional observations..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
            type="submit"
            disabled={isSubmitting || types.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Record Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}
