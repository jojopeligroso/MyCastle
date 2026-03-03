'use client';

import React, { useState } from 'react';

interface EvidenceSummary {
  summativeScores: Array<{
    id: string;
    scorePercentage: number;
    assessmentDate: string;
  }>;
  avgSummativeScore: number | null;
  competencyStats: {
    total: number;
    achieved: number;
    developing: number;
    emerging: number;
  };
  competencyRate: number | null;
  meetsThreshold: boolean;
  strongCandidate: boolean;
}

interface PromotionRequestFormProps {
  studentId: string;
  studentName: string;
  currentLevel: string;
  evidence: EvidenceSummary;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];

export function PromotionRequestForm({
  studentId,
  studentName,
  currentLevel,
  evidence,
  onSuccess,
  onCancel,
}: PromotionRequestFormProps) {
  const [toLevel, setToLevel] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only show levels above current
  const currentIndex = CEFR_LEVELS.indexOf(currentLevel);
  const availableLevels = CEFR_LEVELS.filter((_, i) => i > currentIndex);

  const getLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      A1: 'bg-green-100 text-green-800',
      A2: 'bg-green-200 text-green-900',
      B1: 'bg-blue-100 text-blue-800',
      'B1+': 'bg-blue-200 text-blue-900',
      B2: 'bg-indigo-100 text-indigo-800',
      'B2+': 'bg-indigo-200 text-indigo-900',
      C1: 'bg-purple-100 text-purple-800',
      C2: 'bg-purple-200 text-purple-900',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toLevel) {
      setError('Please select a target level');
      return;
    }

    if (reason.length < 10) {
      setError('Please provide a reason (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/students/${studentId}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toLevel,
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit promotion request');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Request Level Promotion</h3>
          <p className="text-sm text-gray-500 mt-1">
            For <span className="font-medium">{studentName}</span>
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

      {/* Evidence Summary */}
      <div className="mb-6 space-y-4">
        <h4 className="text-sm font-semibold text-gray-700">Evidence Summary</h4>

        {/* Recommendation Badge */}
        {evidence.strongCandidate ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-green-800">
                Strong candidate for promotion (avg score 90%+)
              </span>
            </div>
          </div>
        ) : evidence.meetsThreshold ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-blue-800">
                Meets minimum threshold (avg score 80%+)
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-amber-800">
                Below typical threshold - additional justification recommended
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Summative Score</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {evidence.avgSummativeScore !== null
                ? `${evidence.avgSummativeScore.toFixed(1)}%`
                : 'N/A'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Last 90 days</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Competency Progress</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {evidence.competencyRate !== null ? `${evidence.competencyRate}%` : 'N/A'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {evidence.competencyStats.achieved} achieved / {evidence.competencyStats.total} total
            </p>
          </div>
        </div>

        {/* Recent Scores */}
        {evidence.summativeScores.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Recent Summative Scores</p>
            <div className="flex flex-wrap gap-2">
              {evidence.summativeScores.slice(0, 5).map(score => (
                <span
                  key={score.id}
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    score.scorePercentage >= 80
                      ? 'bg-green-100 text-green-800'
                      : score.scorePercentage >= 60
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {score.scorePercentage.toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Current → Target Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Level Change</label>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex px-3 py-1.5 rounded font-medium ${getLevelColor(currentLevel)}`}
            >
              {currentLevel}
            </span>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <select
              value={toLevel}
              onChange={e => setToLevel(e.target.value)}
              required
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select target level...</option>
              {availableLevels.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Promotion
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            required
            minLength={10}
            placeholder="Explain why this student is ready for promotion..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">{reason.length}/1000 characters (minimum 10)</p>
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
            disabled={isSubmitting || !toLevel}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
