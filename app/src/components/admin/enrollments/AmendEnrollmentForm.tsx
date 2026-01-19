/**
 * Amend Enrollment Form Component
 * Tabbed form for extensions, reductions, and level changes
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface AmendEnrollmentFormProps {
  enrollmentId: string;
  currentEndDate?: string;
  currentLevel?: string;
  studentName: string;
  className: string;
  startDate?: string;
}

type TabType = 'extension' | 'reduction' | 'level';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function AmendEnrollmentForm({
  enrollmentId,
  currentEndDate,
  currentLevel,
  studentName,
  className,
  startDate,
}: AmendEnrollmentFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'extension';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extension state
  const [newEndDateExtension, setNewEndDateExtension] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  // Reduction state
  const [newEndDateReduction, setNewEndDateReduction] = useState('');
  const [reductionReason, setReductionReason] = useState('');

  // Level change state
  const [newLevel, setNewLevel] = useState('');
  const [levelChangeReason, setLevelChangeReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let body: Record<string, unknown> = {};

      switch (activeTab) {
        case 'extension':
          if (!newEndDateExtension) {
            throw new Error('Please select a new end date');
          }
          if (currentEndDate && new Date(newEndDateExtension) <= new Date(currentEndDate)) {
            throw new Error('New end date must be after the current end date');
          }
          body = {
            amendment_type: 'EXTENSION',
            previous_value: currentEndDate,
            new_value: newEndDateExtension,
            reason: extensionReason || undefined,
          };
          break;

        case 'reduction':
          if (!newEndDateReduction) {
            throw new Error('Please select a new end date');
          }
          if (startDate && new Date(newEndDateReduction) < new Date(startDate)) {
            throw new Error('New end date cannot be before the start date');
          }
          if (currentEndDate && new Date(newEndDateReduction) >= new Date(currentEndDate)) {
            throw new Error('New end date must be before the current end date');
          }
          body = {
            amendment_type: 'REDUCTION',
            previous_value: currentEndDate,
            new_value: newEndDateReduction,
            reason: reductionReason || undefined,
          };
          break;

        case 'level':
          if (!newLevel) {
            throw new Error('Please select a new level');
          }
          if (newLevel === currentLevel) {
            throw new Error('New level must be different from current level');
          }
          body = {
            amendment_type: 'LEVEL_CHANGE',
            previous_value: currentLevel,
            new_value: newLevel,
            reason: levelChangeReason || undefined,
            metadata: { oldLevel: currentLevel, newLevel },
          };
          break;
      }

      const response = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create amendment');
      }

      // Success - redirect to enrollment detail page
      router.push(`/admin/enrolments/${enrollmentId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student and Class Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Student:</span> {studentName}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Class:</span> {className}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('extension')}
            className={`${
              activeTab === 'extension'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Extension
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reduction')}
            className={`${
              activeTab === 'reduction'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Reduction
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('level')}
            className={`${
              activeTab === 'level'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Level Change
          </button>
        </nav>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Extension Tab */}
        {activeTab === 'extension' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current End Date</label>
              <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                <span className="text-sm font-semibold text-gray-900">
                  {currentEndDate ? new Date(currentEndDate).toLocaleDateString() : 'Not set'}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="newEndDateExtension"
                className="block text-sm font-medium text-gray-700"
              >
                New End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="newEndDateExtension"
                value={newEndDateExtension}
                onChange={e => setNewEndDateExtension(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">Must be after the current end date</p>
            </div>

            <div>
              <label htmlFor="extensionReason" className="block text-sm font-medium text-gray-700">
                Reason (Optional)
              </label>
              <textarea
                id="extensionReason"
                value={extensionReason}
                onChange={e => setExtensionReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Reason for extension..."
              />
            </div>
          </>
        )}

        {/* Reduction Tab */}
        {activeTab === 'reduction' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current End Date</label>
              <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                <span className="text-sm font-semibold text-gray-900">
                  {currentEndDate ? new Date(currentEndDate).toLocaleDateString() : 'Not set'}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="newEndDateReduction"
                className="block text-sm font-medium text-gray-700"
              >
                New End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="newEndDateReduction"
                value={newEndDateReduction}
                onChange={e => setNewEndDateReduction(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Must be before the current end date and after the start date
              </p>
            </div>

            <div>
              <label htmlFor="reductionReason" className="block text-sm font-medium text-gray-700">
                Reason (Optional)
              </label>
              <textarea
                id="reductionReason"
                value={reductionReason}
                onChange={e => setReductionReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Reason for reduction..."
              />
            </div>
          </>
        )}

        {/* Level Change Tab */}
        {activeTab === 'level' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Level</label>
              <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {currentLevel || 'Not set'}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="newLevel" className="block text-sm font-medium text-gray-700">
                New Level <span className="text-red-500">*</span>
              </label>
              <select
                id="newLevel"
                value={newLevel}
                onChange={e => setNewLevel(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a level...</option>
                {CEFR_LEVELS.map(level => (
                  <option key={level} value={level} disabled={level === currentLevel}>
                    {level} {level === currentLevel && '(Current)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="levelChangeReason"
                className="block text-sm font-medium text-gray-700"
              >
                Reason (Optional)
              </label>
              <textarea
                id="levelChangeReason"
                value={levelChangeReason}
                onChange={e => setLevelChangeReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Reason for level change..."
              />
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push(`/admin/enrolments/${enrollmentId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Amendment'}
          </button>
        </div>
      </form>
    </div>
  );
}
