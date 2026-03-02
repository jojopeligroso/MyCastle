/**
 * Competency Assessments Hook
 *
 * Custom hooks for fetching and mutating competency assessments.
 * Provides both assessment list and progress summary functionality.
 */

import { useState, useCallback } from 'react';

interface Descriptor {
  id: string;
  category: string;
  subcategory: string;
  descriptorText: string;
  cefrLevel: string;
}

interface Assessor {
  id: string;
  name: string;
}

interface Assessment {
  id: string;
  studentId: string;
  descriptorId: string;
  classId: string | null;
  enrollmentId: string | null;
  assignmentId: string | null;
  assessmentType: string;
  assessmentDate: string;
  score: number;
  notes: string | null;
  assessedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AssessmentWithRelations {
  assessment: Assessment;
  descriptor: Descriptor | null;
  assessor: Assessor | null;
}

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

interface ProgressSummary {
  totalCompetent: number;
  totalDescriptors: number;
  overallProgress: number;
  totalGaps: number;
}

interface AssessmentsResponse {
  assessments: AssessmentWithRelations[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface ProgressResponse {
  studentId: string;
  cefrLevel: string | null;
  skillGroups: SkillGroup[];
  summary: ProgressSummary;
}

interface CreateAssessmentInput {
  studentId: string;
  descriptorId: string;
  classId?: string;
  enrollmentId?: string;
  assignmentId?: string;
  assessmentType: 'periodic' | 'ad_hoc' | 'end_of_unit' | 'placement';
  assessmentDate?: string;
  score: number;
  notes?: string;
}

interface UseAssessmentsOptions {
  studentId?: string;
  descriptorId?: string;
  classId?: string;
  assessmentType?: string;
  limit?: number;
  offset?: number;
}

/**
 * Hook for fetching competency assessments
 */
export function useCompetencyAssessments(options: UseAssessmentsOptions = {}) {
  const [data, setData] = useState<AssessmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.studentId) params.append('studentId', options.studentId);
      if (options.descriptorId) params.append('descriptorId', options.descriptorId);
      if (options.classId) params.append('classId', options.classId);
      if (options.assessmentType) params.append('assessmentType', options.assessmentType);
      if (options.limit) params.append('limit', String(options.limit));
      if (options.offset) params.append('offset', String(options.offset));

      const response = await fetch(`/api/admin/competency-assessments?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch assessments');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [
    options.studentId,
    options.descriptorId,
    options.classId,
    options.assessmentType,
    options.limit,
    options.offset,
  ]);

  return { data, isLoading, error, refetch: fetchAssessments };
}

/**
 * Hook for fetching competency progress summary
 */
export function useCompetencyProgress(
  studentId: string,
  cefrLevel?: string | null,
  enrollmentId?: string,
  includeUnassessed = false
) {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!studentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ studentId });
      if (cefrLevel) params.append('cefrLevel', cefrLevel);
      if (enrollmentId) params.append('enrollmentId', enrollmentId);
      if (includeUnassessed) params.append('includeUnassessed', 'true');

      const response = await fetch(`/api/admin/competency-progress?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch progress');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [studentId, cefrLevel, enrollmentId, includeUnassessed]);

  return { data, isLoading, error, refetch: fetchProgress };
}

/**
 * Hook for creating competency assessments
 */
export function useCreateAssessment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAssessment = useCallback(async (input: CreateAssessmentInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/competency-assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create assessment');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createAssessment, isLoading, error };
}
