'use client';

import { useState } from 'react';
import type { ApprovalStatus } from '@/lib/lessons/chat-types';

interface DoSApprovalButtonProps {
  lessonPlanId: string;
  currentStatus: ApprovalStatus;
  onStatusChange: (newStatus: ApprovalStatus) => void;
}

export default function DoSApprovalButton({
  lessonPlanId,
  currentStatus,
  onStatusChange,
}: DoSApprovalButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRequestApproval = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/lessons/${lessonPlanId}/request-approval`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: notes || undefined }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit for approval');
      }

      onStatusChange('pending_approval');
      setShowNotesModal(false);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show if already approved
  if (currentStatus === 'approved') {
    return (
      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
        <svg
          className="w-4 h-4 mr-1.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Approved
      </div>
    );
  }

  // Show pending state
  if (currentStatus === 'pending_approval') {
    return (
      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        <svg
          className="w-4 h-4 mr-1.5 animate-pulse"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
        Awaiting DoS Approval
      </div>
    );
  }

  // Show rejected with resubmit option
  if (currentStatus === 'rejected') {
    return (
      <div className="space-y-2">
        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <svg
            className="w-4 h-4 mr-1.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Needs Revision
        </div>
        <button
          onClick={() => setShowNotesModal(true)}
          className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
        >
          Resubmit for Approval
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowNotesModal(true)}
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 disabled:opacity-50"
      >
        Get DoS Approval
      </button>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowNotesModal(false)}
            />

            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full mx-4">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Submit for DoS Approval
                </h3>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes for DoS (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any context or notes for the reviewer..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Once submitted, the Director of Studies will review your lesson
                  plan and either approve it or request changes.
                </p>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNotesModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestApproval}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
