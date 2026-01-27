'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Correction = {
  id: string;
  sessionId: string;
  studentId: string;
  originalStatus: string;
  originalNotes: string | null;
  correctedStatus: string;
  correctedNotes: string | null;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: string;
};

type Props = {
  initialCorrections?: Correction[];
};

export default function PendingCorrections({ initialCorrections = [] }: Props) {
  const [corrections, setCorrections] = useState<Correction[]>(initialCorrections);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (initialCorrections.length === 0) {
      fetchCorrections();
    }
  }, []);

  const fetchCorrections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/attendance/corrections?status=pending');
      if (response.ok) {
        const data = await response.json();
        setCorrections(data.corrections || []);
      }
    } catch (error) {
      console.error('Failed to fetch corrections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (correctionId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/attendance/corrections/${correctionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNotes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to review correction');
      }

      alert(`Correction ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setReviewingId(null);
      setReviewNotes('');
      fetchCorrections(); // Refresh the list
      router.refresh(); // Refresh the page data
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to review correction');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'excused':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Corrections</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (corrections.length === 0) {
    return (
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Corrections</h3>
        <p className="text-sm text-gray-500">No pending correction requests</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Pending Corrections
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {corrections.length}
          </span>
        </h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {corrections.map(correction => (
          <li key={correction.id} className="px-6 py-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Requested on {new Date(correction.requestedAt).toLocaleDateString()} at{' '}
                  {new Date(correction.requestedAt).toLocaleTimeString()}
                </div>
                <a
                  href={`/admin/attendance/${correction.sessionId}`}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  View Session →
                </a>
              </div>

              {/* Change Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Original</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(correction.originalStatus)}`}
                    >
                      {correction.originalStatus}
                    </span>
                  </div>
                  {correction.originalNotes && (
                    <p className="text-sm text-gray-600 italic">
                      &quot;{correction.originalNotes}&quot;
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Corrected</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(correction.correctedStatus)}`}
                    >
                      {correction.correctedStatus}
                    </span>
                  </div>
                  {correction.correctedNotes && (
                    <p className="text-sm text-gray-600 italic">
                      &quot;{correction.correctedNotes}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Reason:</p>
                <p className="text-sm text-gray-700">{correction.reason}</p>
              </div>

              {/* Review Form */}
              {reviewingId === correction.id ? (
                <div className="space-y-3 border-t pt-3">
                  <div>
                    <label
                      htmlFor="reviewNotes"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Review Notes (Optional)
                    </label>
                    <textarea
                      id="reviewNotes"
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                      placeholder="Add any notes about this decision..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(correction.id, 'approve')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(correction.id, 'reject')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setReviewingId(null);
                        setReviewNotes('');
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => setReviewingId(correction.id)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Review
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
