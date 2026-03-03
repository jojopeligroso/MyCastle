'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EvidenceSummary {
  avgSummativeScore: number | null;
  competencyRate: number | null;
  competencyStats: {
    total: number;
    achieved: number;
    developing: number;
    emerging: number;
  };
  meetsThreshold: boolean;
  strongCandidate: boolean;
}

interface Promotion {
  id: string;
  studentId: string;
  studentName: string | null;
  fromLevel: string;
  toLevel: string;
  status: string;
  recommendedAt: Date;
  recommendationReason: string | null;
  evidenceSummary: EvidenceSummary | null;
  recommenderName: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  reviewerName: string | null;
  fromClassName: string | null;
  currentSummativeAvg: number | null;
}

interface PromotionReviewListProps {
  promotions: Promotion[];
  currentFilter: string;
}

export function PromotionReviewList({ promotions, currentFilter }: PromotionReviewListProps) {
  const router = useRouter();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ];

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleReview = async (promotionId: string, action: 'approve' | 'reject') => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/promotions/${promotionId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: reviewNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} promotion`);
      }

      // Refresh the page to show updated data
      router.refresh();
      setReviewingId(null);
      setReviewNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = promotions.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {filters.map(filter => (
            <Link
              key={filter.value}
              href={`/admin/promotions?status=${filter.value}`}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                currentFilter === filter.value
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {filter.label}
              {filter.value === 'pending' && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No promotions</h3>
          <p className="mt-1 text-sm text-gray-500">
            {currentFilter === 'pending'
              ? 'No pending promotion requests to review.'
              : `No ${currentFilter} promotions found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {promotions.map(promotion => (
            <div
              key={promotion.id}
              className={`bg-white border rounded-lg overflow-hidden ${
                promotion.status === 'pending' ? 'border-amber-200' : 'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/students/${promotion.studentId}`}
                      className="text-lg font-semibold text-gray-900 hover:text-purple-600"
                    >
                      {promotion.studentName || 'Unknown Student'}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 text-sm font-medium rounded ${getLevelColor(promotion.fromLevel)}`}>
                        {promotion.fromLevel}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className={`inline-flex px-2 py-0.5 text-sm font-medium rounded ${getLevelColor(promotion.toLevel)}`}>
                        {promotion.toLevel}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(promotion.status)}
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span>
                    Requested by {promotion.recommenderName || 'Unknown'} on{' '}
                    {new Date(promotion.recommendedAt).toLocaleDateString('en-GB')}
                  </span>
                  {promotion.fromClassName && (
                    <span>from {promotion.fromClassName}</span>
                  )}
                </div>
              </div>

              {/* Evidence Summary */}
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Current Avg Score</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {promotion.currentSummativeAvg !== null
                        ? `${promotion.currentSummativeAvg.toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  {promotion.evidenceSummary && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">At Request Avg</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {promotion.evidenceSummary.avgSummativeScore !== null
                            ? `${promotion.evidenceSummary.avgSummativeScore.toFixed(1)}%`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Competency Progress</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {promotion.evidenceSummary.competencyRate !== null
                            ? `${promotion.evidenceSummary.competencyRate}%`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Recommendation</p>
                        {promotion.evidenceSummary.strongCandidate ? (
                          <span className="inline-flex items-center text-sm font-medium text-green-700">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Strong Candidate
                          </span>
                        ) : promotion.evidenceSummary.meetsThreshold ? (
                          <span className="text-sm font-medium text-blue-700">Meets Threshold</span>
                        ) : (
                          <span className="text-sm font-medium text-amber-700">Below Threshold</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Reason */}
                {promotion.recommendationReason && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Reason:</span> {promotion.recommendationReason}
                    </p>
                  </div>
                )}

                {/* Review Notes (for approved/rejected) */}
                {promotion.status !== 'pending' && promotion.reviewNotes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Review Notes:</span> {promotion.reviewNotes}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Reviewed by {promotion.reviewerName || 'Unknown'} on{' '}
                      {promotion.reviewedAt ? new Date(promotion.reviewedAt).toLocaleDateString('en-GB') : 'Unknown'}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions (for pending only) */}
              {promotion.status === 'pending' && (
                <div className="p-4 border-t border-gray-200">
                  {reviewingId === promotion.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Review Notes (optional)
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={e => setReviewNotes(e.target.value)}
                          rows={2}
                          placeholder="Add notes about your decision..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleReview(promotion.id, 'approve')}
                          disabled={isSubmitting}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {isSubmitting ? 'Processing...' : 'Approve Promotion'}
                        </button>
                        <button
                          onClick={() => handleReview(promotion.id, 'reject')}
                          disabled={isSubmitting}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setReviewNotes('');
                          }}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/admin/students/${promotion.studentId}`}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        View Full Profile
                      </Link>
                      <button
                        onClick={() => setReviewingId(promotion.id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                      >
                        Review Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
