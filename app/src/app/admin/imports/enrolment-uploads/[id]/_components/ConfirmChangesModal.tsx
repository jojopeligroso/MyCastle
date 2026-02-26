'use client';

/**
 * ConfirmChangesModal Component
 * Full-screen drawer showing detailed preview of changes before applying
 */

import { useState } from 'react';
import { X, Plus, RefreshCw, Loader2, CheckCircle, Minus } from 'lucide-react';
import ChangesPreviewTable from './ChangesPreviewTable';

interface ConfirmChangesModalProps {
  isOpen: boolean;
  batchId: string;
  newCount: number;
  updateCount: number;
  noopCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

type TabType = 'inserts' | 'updates';

export default function ConfirmChangesModal({
  isOpen,
  batchId,
  newCount,
  updateCount,
  noopCount,
  onConfirm,
  onCancel,
  isApplying = false,
}: ConfirmChangesModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('inserts');
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onCancel}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-4xl">
          <div className="flex h-full flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Confirm Import Changes</h2>
              <button
                onClick={onCancel}
                disabled={isApplying}
                className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Plus className="h-5 w-5 text-blue-600" />
                    <span className="text-2xl font-semibold text-blue-600">{newCount}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-blue-700">New Enrolments</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <RefreshCw className="h-5 w-5 text-amber-600" />
                    <span className="text-2xl font-semibold text-amber-600">{updateCount}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-amber-700">Updates</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Minus className="h-5 w-5 text-gray-500" />
                    <span className="text-2xl font-semibold text-gray-600">{noopCount}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-600">No Change</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('inserts')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'inserts'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    New Enrolments ({newCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('updates')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'updates'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Updates ({updateCount})
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="min-h-[300px]">
                {activeTab === 'inserts' && (
                  <ChangesPreviewTable batchId={batchId} action="INSERT" />
                )}
                {activeTab === 'updates' && (
                  <ChangesPreviewTable batchId={batchId} action="UPDATE" />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              {/* Confirmation Checkbox */}
              <div className="mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    disabled={isApplying}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have reviewed these changes and confirm they are correct. This action cannot
                    be undone.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancel}
                  disabled={isApplying}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!confirmed || isApplying}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
