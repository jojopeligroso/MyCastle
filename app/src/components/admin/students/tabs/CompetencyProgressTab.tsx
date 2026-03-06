'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { AssessmentForm } from '../AssessmentForm';

interface SkillGap {
  id: string;
  category: string;
  subcategory: string;
  descriptorText: string;
  currentScore: number | null;
  assessmentCount: number;
  lastAssessedAt: string | null;
  isCompetent: boolean;
}

interface SkillGroup {
  category: string;
  competent: number;
  total: number;
  gaps: SkillGap[];
}

interface CompetencyProgressTabProps {
  studentId: string;
  studentName?: string;
  currentLevel: string | null;
  isTeacher?: boolean;
  isAdmin?: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function CompetencyProgressTab({
  studentId,
  studentName = 'Student',
  currentLevel,
  isTeacher = false,
  isAdmin = false,
}: CompetencyProgressTabProps) {
  // Fetch progress data
  const { data, isLoading, error, mutate } = useSWR<{
    skillGroups: SkillGroup[];
    summary: { competent: number; total: number; progress: number };
  }>(studentId ? `/api/admin/students/${studentId}/progress` : null, fetcher);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);

  const handleAssessmentSuccess = () => {
    setShowAssessmentForm(false);
    mutate(); // Refresh progress data
  };

  const skillGroups = data?.skillGroups || [
    { category: 'Reading', competent: 0, total: 0, gaps: [] },
    { category: 'Writing', competent: 0, total: 0, gaps: [] },
    { category: 'Listening', competent: 0, total: 0, gaps: [] },
    { category: 'Speaking', competent: 0, total: 0, gaps: [] },
  ];

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'bg-gray-100 text-gray-600';
    if (score >= 3.5) return 'bg-green-100 text-green-800';
    if (score >= 2.5) return 'bg-blue-100 text-blue-800';
    if (score >= 1.5) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreLabel = (score: number | null): string => {
    if (score === null) return 'Not assessed';
    if (score >= 3.5) return 'Competent';
    if (score >= 2.5) return 'Developing';
    if (score >= 1.5) return 'Emerging';
    return 'Not demonstrated';
  };

  const getProgressPercentage = (competent: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((competent / total) * 100);
  };

  const getCategoryIcon = (category: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      Reading: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      Writing: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      Listening: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      ),
      Speaking: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    };
    return icons[category] || <span className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <p className="text-sm text-red-600">Failed to load competency progress</p>
      </div>
    );
  }

  const hasAnyData = skillGroups.some((g: SkillGroup) => g.total > 0);

  return (
    <div className="space-y-6">
      {/* Overall Progress Header */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">CEFR Competency Progress</h3>
            {currentLevel && (
              <p className="text-xs text-gray-500 mt-1">
                Tracking descriptors for level <span className="font-medium">{currentLevel}</span>
              </p>
            )}
          </div>
          {(isTeacher || isAdmin) && (
            <button
              onClick={() => setShowAssessmentForm(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
            >
              Add Assessment
            </button>
          )}
        </div>

        {!currentLevel && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Student has no assigned CEFR level. Assign a level to track
              competency progress.
            </p>
          </div>
        )}
      </section>

      {/* Skill Category Overview */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {skillGroups.map((group: SkillGroup) => {
            const progress = getProgressPercentage(group.competent, group.total);
            const isSelected = selectedCategory === group.category;

            return (
              <button
                key={group.category}
                onClick={() => setSelectedCategory(isSelected ? null : group.category)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={isSelected ? 'text-purple-600' : 'text-gray-400'}>
                    {getCategoryIcon(group.category)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{group.category}</span>
                </div>
                {group.total > 0 ? (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {group.competent} / {group.total} competent ({progress}%)
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">No descriptors tracked</p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Detailed Skill Gaps */}
      {selectedCategory && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {selectedCategory} Skill Gaps
          </h4>
          {skillGroups.find((g: SkillGroup) => g.category === selectedCategory)?.gaps.length ===
          0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-600">No skill gaps recorded for {selectedCategory}</p>
              <p className="text-xs text-gray-500 mt-1">
                Assessments will populate this view with specific areas needing improvement
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {skillGroups
                .find((g: SkillGroup) => g.category === selectedCategory)
                ?.gaps.map((gap: SkillGap) => (
                  <div key={gap.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{gap.subcategory}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {gap.descriptorText}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getScoreColor(gap.currentScore)}`}
                        >
                          {gap.currentScore !== null ? gap.currentScore.toFixed(1) : '—'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {getScoreLabel(gap.currentScore)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {gap.assessmentCount} assessment{gap.assessmentCount !== 1 ? 's' : ''}
                      </span>
                      {gap.lastAssessedAt && (
                        <span>
                          Last: {new Date(gap.lastAssessedAt).toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Empty State */}
      {!hasAnyData && !selectedCategory && (
        <section>
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">No competency assessments recorded</p>
            <p className="mt-1 text-xs text-gray-500">
              Teachers can add assessments to track progress against CEFR descriptors
            </p>
            {(isTeacher || isAdmin) && (
              <button
                onClick={() => setShowAssessmentForm(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
              >
                Record First Assessment
              </button>
            )}
          </div>
        </section>
      )}

      {/* Assessment Scale Legend */}
      <section className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">Assessment Scale</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-400"></span>
            <span className="text-xs text-gray-600">1 - Not demonstrated</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-400"></span>
            <span className="text-xs text-gray-600">2 - Emerging</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-400"></span>
            <span className="text-xs text-gray-600">3 - Developing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-400"></span>
            <span className="text-xs text-gray-600">4 - Competent</span>
          </div>
        </div>
      </section>

      {/* Assessment Form Modal */}
      {showAssessmentForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowAssessmentForm(false)}
            />
            <div className="relative w-full max-w-2xl">
              <AssessmentForm
                studentId={studentId}
                studentName={studentName}
                currentLevel={currentLevel}
                onSuccess={handleAssessmentSuccess}
                onCancel={() => setShowAssessmentForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
