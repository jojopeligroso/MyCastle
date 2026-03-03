'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SummativeAssessmentForm } from '../SummativeAssessmentForm';

interface AssessmentsTabProps {
  studentId: string;
  studentName?: string;
}

interface SummativeAssessment {
  id: string;
  typeName: string | null;
  scorePercentage: number;
  assessmentDate: string;
  notes: string | null;
  className: string | null;
  assessorName: string | null;
  createdAt: string;
}

interface AssessmentStats {
  total: number;
  averageScore: number;
}

export function AssessmentsTab({ studentId, studentName = 'Student' }: AssessmentsTabProps) {
  const [assessments, setAssessments] = useState<SummativeAssessment[]>([]);
  const [stats, setStats] = useState<AssessmentStats>({ total: 0, averageScore: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchAssessments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/students/${studentId}/summative`);
      if (!res.ok) {
        throw new Error('Failed to fetch assessments');
      }

      const data = await res.json();
      setAssessments(data.assessments || []);
      setStats({
        total: data.total || 0,
        averageScore: data.averageScore || 0,
      });
    } catch (err) {
      console.error('Error fetching assessments:', err);
      setError('Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleSuccess = () => {
    setShowForm(false);
    fetchAssessments();
  };

  // Get score badge color
  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    if (score >= 40) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading assessments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Summative Assessments</h3>
          <p className="text-xs text-gray-500 mt-0.5">Formal test scores and exam results</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Assessment
        </button>
      </div>

      {/* Stats Cards */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Total Assessments
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Average Score
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${getScoreBadge(stats.averageScore).replace('bg-', 'text-').replace('-100', '-600').replace('-800', '-600')}`}
            >
              {stats.averageScore.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <SummativeAssessmentForm
              studentId={studentId}
              studentName={studentName}
              onSuccess={handleSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchAssessments}
            className="mt-2 text-sm text-red-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No summative assessments recorded yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Click &quot;Record Assessment&quot; to add a test score
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assessor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assessments.map(assessment => (
                <tr key={assessment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {new Date(assessment.assessmentDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {assessment.typeName || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBadge(assessment.scorePercentage)}`}
                    >
                      {assessment.scorePercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {assessment.className || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {assessment.assessorName || 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Link to Settings */}
      <div className="text-center pt-4">
        <a
          href="/admin/settings/assessment-types"
          className="text-xs text-gray-500 hover:text-purple-600"
        >
          Manage assessment types →
        </a>
      </div>
    </div>
  );
}
