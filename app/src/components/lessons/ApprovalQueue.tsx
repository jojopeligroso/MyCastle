'use client';

import { useState, useEffect } from 'react';

interface PendingApproval {
  id: string;
  title: string;
  topic: string;
  cefrLevel: string;
  approvalStatus: string;
  submittedForApprovalAt: string;
  speakoutBook?: string;
  speakoutUnit?: string;
  speakoutLesson?: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  createdAt: string;
}

interface RecentlyProcessed {
  id: string;
  title: string;
  topic: string;
  cefrLevel: string;
  approvalStatus: string;
  approvedAt: string;
  approvalComments?: string;
  teacherId: string;
  teacherName: string;
}

export default function ApprovalQueue() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [recentlyProcessed, setRecentlyProcessed] = useState<RecentlyProcessed[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch approvals
  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const response = await fetch('/api/lessons/approvals');
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }
      const data = await response.json();
      setPendingApprovals(data.data.pending);
      setRecentlyProcessed(data.data.recentlyProcessed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (
    planId: string,
    decision: 'approved' | 'rejected'
  ) => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${planId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comments: comments || undefined }),
      });

      if (!response.ok) {
        throw new Error('Failed to process approval');
      }

      // Refresh the list
      await fetchApprovals();
      setSelectedPlan(null);
      setComments('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Lesson Plan Approvals
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve teacher lesson plans
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Pending Approvals */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            Pending Approval ({pendingApprovals.length})
          </h3>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No lesson plans pending approval
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pendingApprovals.map(plan => (
              <li key={plan.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {plan.title}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {plan.cefrLevel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {plan.topic}
                      {plan.speakoutBook && (
                        <span className="ml-2 text-gray-400">
                          ({plan.speakoutBook}, {plan.speakoutUnit})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted by {plan.teacherName || plan.teacherEmail} on{' '}
                      {formatDate(plan.submittedForApprovalAt)}
                    </p>
                  </div>

                  {selectedPlan === plan.id ? (
                    <div className="flex-shrink-0 ml-4 w-64">
                      <textarea
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                        placeholder="Add comments (optional)"
                        rows={2}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={() => handleApproval(plan.id, 'approved')}
                          disabled={processing}
                          className="flex-1 px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {processing ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleApproval(plan.id, 'rejected')}
                          disabled={processing}
                          className="flex-1 px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {processing ? '...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlan(null);
                            setComments('');
                          }}
                          className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 ml-4 flex space-x-2">
                      <button
                        onClick={() => setSelectedPlan(plan.id)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recently Processed */}
      {recentlyProcessed.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">
              Recently Processed
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {recentlyProcessed.map(plan => (
              <li key={plan.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {plan.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      by {plan.teacherName} |{' '}
                      {plan.approvedAt && formatDate(plan.approvedAt)}
                    </p>
                    {plan.approvalComments && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        &quot;{plan.approvalComments}&quot;
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      plan.approvalStatus === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {plan.approvalStatus === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
