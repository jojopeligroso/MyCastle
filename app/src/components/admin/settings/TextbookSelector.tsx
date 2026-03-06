'use client';

import { useState, useEffect } from 'react';

interface TextbookInfo {
  name: string;
  descriptorCount: number;
  isActive: boolean;
}

interface TextbookSelectorProps {
  onSave?: () => void;
}

export function TextbookSelector({ onSave }: TextbookSelectorProps) {
  const [textbooks, setTextbooks] = useState<TextbookInfo[]>([]);
  const [activeTextbooks, setActiveTextbooks] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/admin/settings/curriculum');
        if (!res.ok) throw new Error('Failed to fetch settings');

        const data = await res.json();
        setTextbooks(data.availableTextbooks || []);
        setActiveTextbooks(data.activeTextbooks);
      } catch (err) {
        console.error('Error fetching curriculum settings:', err);
        setError('Failed to load textbook settings');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Toggle individual textbook
  const toggleTextbook = (bookName: string) => {
    setHasChanges(true);
    setSuccess(false);

    // If currently null (all active), switch to explicit list excluding this one
    if (activeTextbooks === null) {
      const allBooks = textbooks.map(t => t.name).filter(name => name !== bookName);
      setActiveTextbooks(allBooks);
      return;
    }

    // Toggle in the list
    if (activeTextbooks.includes(bookName)) {
      setActiveTextbooks(activeTextbooks.filter(name => name !== bookName));
    } else {
      setActiveTextbooks([...activeTextbooks, bookName]);
    }
  };

  // Select all textbooks
  const selectAll = () => {
    setHasChanges(true);
    setSuccess(false);
    setActiveTextbooks(null); // null means all active
  };

  // Deselect all textbooks
  const deselectAll = () => {
    setHasChanges(true);
    setSuccess(false);
    setActiveTextbooks([]);
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/settings/curriculum', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeTextbooks }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess(true);
      setHasChanges(false);
      if (onSave) onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if textbook is active
  const isActive = (bookName: string): boolean => {
    if (activeTextbooks === null) return true;
    return activeTextbooks.includes(bookName);
  };

  // Count active textbooks
  const activeCount = activeTextbooks === null ? textbooks.length : activeTextbooks.length;
  const totalDescriptors = textbooks
    .filter(t => isActive(t.name))
    .reduce((sum, t) => sum + t.descriptorCount, 0);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading textbook settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Textbooks</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select which textbook series are available for learning objectives
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">{activeCount}</p>
              <p className="text-xs text-gray-500">of {textbooks.length} active</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {totalDescriptors.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">descriptors available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Settings saved successfully!</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
        <button
          type="button"
          onClick={selectAll}
          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
        >
          Select All
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={deselectAll}
          className="text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          Deselect All
        </button>
      </div>

      {/* Textbook List */}
      <div className="p-6">
        {textbooks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="mt-2 text-sm">No textbooks found in the database</p>
            <p className="mt-1 text-xs text-gray-400">
              Import textbook descriptors to enable this feature
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {textbooks.map(textbook => {
              const active = isActive(textbook.name);
              return (
                <div
                  key={textbook.name}
                  onClick={() => toggleTextbook(textbook.name)}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    active
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {/* Checkbox indicator */}
                  <div
                    className={`absolute top-3 right-3 w-5 h-5 rounded flex items-center justify-center ${
                      active ? 'bg-purple-600' : 'border-2 border-gray-300'
                    }`}
                  >
                    {active && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Book info */}
                  <div className="pr-8">
                    <h4 className={`font-medium ${active ? 'text-purple-900' : 'text-gray-700'}`}>
                      {textbook.name}
                    </h4>
                    <p className={`text-sm mt-1 ${active ? 'text-purple-600' : 'text-gray-500'}`}>
                      {textbook.descriptorCount.toLocaleString()} descriptors
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {hasChanges ? (
            <span className="text-amber-600 font-medium">You have unsaved changes</span>
          ) : (
            'Changes are saved automatically'
          )}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default TextbookSelector;
