'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface CefrDescriptor {
  id: string;
  level: string;
  category: string;
  subcategory: string | null;
  descriptorText: string;
  scale: string | null;
  skillFocus: string | null;
  isOverall: boolean | null;
}

interface TextbookDescriptor {
  id: string;
  book: string;
  unit: string;
  page: number | null;
  lesson: string | null;
  level: string;
  skillFocus: string;
  descriptorText: string;
}

interface SelectedObjective {
  id?: string; // Database ID if already saved
  source: 'cefr' | 'coursebook' | 'custom';
  objectiveType: 'primary' | 'secondary';
  descriptorId?: string;
  coursebookDescriptorId?: string;
  customDescriptorText?: string;
  sortOrder: number;
  // Display data
  displayText: string;
  level?: string;
  skillFocus?: string;
  pageRef?: string;
}

interface LearningObjectiveSelectorProps {
  sessionId: string;
  classLevel?: string;
  primaryCoursebookId?: string;
  initialObjectives?: SelectedObjective[];
  onSave?: (objectives: SelectedObjective[]) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CEFR_LEVELS = ['PreA1', 'A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];

const SKILLS = ['Speaking', 'Listening', 'Reading', 'Writing', 'Mediation'];

const MAX_PRIMARY = 2;
const MAX_SECONDARY = 6;

// ============================================================================
// Component
// ============================================================================

export function LearningObjectiveSelector({
  sessionId,
  classLevel = 'B1',
  primaryCoursebookId: _primaryCoursebookId, // Reserved for future coursebook filtering
  initialObjectives = [],
  onSave,
  onCancel,
  readOnly = false,
}: LearningObjectiveSelectorProps) {
  // State for descriptors
  const [cefrDescriptors, setCefrDescriptors] = useState<CefrDescriptor[]>([]);
  const [textbookDescriptors, setTextbookDescriptors] = useState<TextbookDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for selected objectives
  const [selectedObjectives, setSelectedObjectives] =
    useState<SelectedObjective[]>(initialObjectives);

  // State for filters
  const [activeTab, setActiveTab] = useState<'cefr' | 'textbook' | 'custom'>('cefr');
  const [levelFilter, setLevelFilter] = useState<string>(classLevel);
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // State for saving
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // State for custom descriptor
  const [customText, setCustomText] = useState('');

  // Fetch descriptors on mount
  useEffect(() => {
    async function fetchDescriptors() {
      setIsLoading(true);
      setError(null);

      try {
        const [cefrRes, textbookRes] = await Promise.all([
          fetch('/api/admin/curriculum/cefr'),
          fetch('/api/admin/curriculum/textbook?filterByTenant=true'),
        ]);

        if (!cefrRes.ok || !textbookRes.ok) {
          throw new Error('Failed to fetch descriptors');
        }

        const [cefrData, textbookData] = await Promise.all([cefrRes.json(), textbookRes.json()]);

        setCefrDescriptors(cefrData.descriptors || []);
        setTextbookDescriptors(textbookData.descriptors || []);
      } catch (err) {
        console.error('Error fetching descriptors:', err);
        setError('Failed to load descriptors. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDescriptors();
  }, []);

  // Fetch existing objectives for this session
  useEffect(() => {
    async function fetchExistingObjectives() {
      if (!sessionId || initialObjectives.length > 0) return;

      try {
        const res = await fetch(`/api/admin/sessions/${sessionId}/objectives`);
        if (res.ok) {
          const data = await res.json();
          if (data.objectives?.length > 0) {
            setSelectedObjectives(data.objectives);
          }
        }
      } catch (err) {
        console.error('Error fetching existing objectives:', err);
      }
    }

    fetchExistingObjectives();
  }, [sessionId, initialObjectives.length]);

  // Get adjacent CEFR levels for filtering
  const getAdjacentLevels = useCallback((level: string): string[] => {
    const idx = CEFR_LEVELS.indexOf(level);
    if (idx === -1) return [level];

    const result: string[] = [];
    // Include one level below, current, and one above
    if (idx > 0) result.push(CEFR_LEVELS[idx - 1]);
    result.push(level);
    if (idx < CEFR_LEVELS.length - 1) result.push(CEFR_LEVELS[idx + 1]);

    return result;
  }, []);

  // Filter CEFR descriptors
  const filteredCefrDescriptors = cefrDescriptors.filter(d => {
    const allowedLevels = getAdjacentLevels(levelFilter);
    if (!allowedLevels.includes(d.level)) return false;
    if (skillFilter && d.skillFocus !== skillFilter && d.category !== skillFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        d.descriptorText.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query) ||
        (d.scale?.toLowerCase().includes(query) ?? false)
      );
    }
    return true;
  });

  // Filter textbook descriptors
  const filteredTextbookDescriptors = textbookDescriptors.filter(d => {
    const allowedLevels = getAdjacentLevels(levelFilter);
    if (!allowedLevels.includes(d.level)) return false;
    if (skillFilter && d.skillFocus !== skillFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        d.descriptorText.toLowerCase().includes(query) ||
        d.lesson?.toLowerCase().includes(query) ||
        d.unit.toLowerCase().includes(query) ||
        d.book.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Count objectives by type
  const primaryCount = selectedObjectives.filter(o => o.objectiveType === 'primary').length;
  const secondaryCount = selectedObjectives.filter(o => o.objectiveType === 'secondary').length;

  // Check if descriptor is already selected
  const isSelected = (descriptorId: string, source: 'cefr' | 'coursebook'): boolean => {
    return selectedObjectives.some(
      o =>
        (source === 'cefr' && o.descriptorId === descriptorId) ||
        (source === 'coursebook' && o.coursebookDescriptorId === descriptorId)
    );
  };

  // Add objective
  const addObjective = (
    descriptor: CefrDescriptor | TextbookDescriptor,
    source: 'cefr' | 'coursebook',
    type: 'primary' | 'secondary'
  ) => {
    if (type === 'primary' && primaryCount >= MAX_PRIMARY) {
      setError(`Maximum ${MAX_PRIMARY} primary objectives allowed`);
      return;
    }
    if (type === 'secondary' && secondaryCount >= MAX_SECONDARY) {
      setError(`Maximum ${MAX_SECONDARY} secondary objectives allowed`);
      return;
    }

    const newObjective: SelectedObjective = {
      source,
      objectiveType: type,
      sortOrder: selectedObjectives.length,
      displayText: descriptor.descriptorText,
      level: descriptor.level,
      skillFocus: 'skillFocus' in descriptor ? (descriptor.skillFocus ?? undefined) : undefined,
    };

    if (source === 'cefr') {
      newObjective.descriptorId = descriptor.id;
    } else {
      newObjective.coursebookDescriptorId = descriptor.id;
      const tbDesc = descriptor as TextbookDescriptor;
      if (tbDesc.page) {
        newObjective.pageRef = `p.${tbDesc.page}`;
      }
    }

    setSelectedObjectives([...selectedObjectives, newObjective]);
    setError(null);
  };

  // Add custom objective
  const addCustomObjective = (type: 'primary' | 'secondary') => {
    if (!customText.trim()) {
      setError('Please enter a custom objective');
      return;
    }
    if (type === 'primary' && primaryCount >= MAX_PRIMARY) {
      setError(`Maximum ${MAX_PRIMARY} primary objectives allowed`);
      return;
    }
    if (type === 'secondary' && secondaryCount >= MAX_SECONDARY) {
      setError(`Maximum ${MAX_SECONDARY} secondary objectives allowed`);
      return;
    }

    const newObjective: SelectedObjective = {
      source: 'custom',
      objectiveType: type,
      customDescriptorText: customText.trim(),
      sortOrder: selectedObjectives.length,
      displayText: customText.trim(),
    };

    setSelectedObjectives([...selectedObjectives, newObjective]);
    setCustomText('');
    setError(null);
  };

  // Remove objective
  const removeObjective = (index: number) => {
    const newObjectives = selectedObjectives.filter((_, i) => i !== index);
    // Update sort orders
    newObjectives.forEach((obj, i) => {
      obj.sortOrder = i;
    });
    setSelectedObjectives(newObjectives);
  };

  // Change objective type
  const toggleObjectiveType = (index: number) => {
    const objective = selectedObjectives[index];
    const newType = objective.objectiveType === 'primary' ? 'secondary' : 'primary';

    // Check limits
    if (newType === 'primary' && primaryCount >= MAX_PRIMARY) {
      setError(`Maximum ${MAX_PRIMARY} primary objectives allowed`);
      return;
    }

    const newObjectives = [...selectedObjectives];
    newObjectives[index] = { ...objective, objectiveType: newType };
    setSelectedObjectives(newObjectives);
    setError(null);
  };

  // Save objectives
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/objectives`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectives: selectedObjectives }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save objectives');
      }

      setSaveSuccess(true);
      if (onSave) {
        onSave(selectedObjectives);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading descriptors...</span>
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
            <h3 className="text-lg font-semibold text-gray-900">Session Learning Objectives</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select up to {MAX_PRIMARY} primary and {MAX_SECONDARY} secondary objectives
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs rounded-full ${primaryCount >= MAX_PRIMARY ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}
              >
                Primary: {primaryCount}/{MAX_PRIMARY}
              </span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${secondaryCount >= MAX_SECONDARY ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}
              >
                Secondary: {secondaryCount}/{MAX_SECONDARY}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {saveSuccess && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Objectives saved successfully!</p>
        </div>
      )}

      {/* Selected Objectives */}
      {selectedObjectives.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Selected Objectives</h4>
          <div className="space-y-2">
            {selectedObjectives.map((objective, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  objective.objectiveType === 'primary'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleObjectiveType(index)}
                  disabled={readOnly}
                  className={`shrink-0 px-2 py-1 text-xs font-medium rounded ${
                    objective.objectiveType === 'primary'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {objective.objectiveType === 'primary' ? 'P' : 'S'}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{objective.displayText}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {objective.level && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {objective.level}
                      </span>
                    )}
                    {objective.skillFocus && (
                      <span className="text-xs text-gray-500">{objective.skillFocus}</span>
                    )}
                    {objective.pageRef && (
                      <span className="text-xs text-gray-400">{objective.pageRef}</span>
                    )}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        objective.source === 'cefr'
                          ? 'bg-emerald-100 text-emerald-700'
                          : objective.source === 'coursebook'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {objective.source === 'cefr'
                        ? 'CEFR'
                        : objective.source === 'coursebook'
                          ? 'Textbook'
                          : 'Custom'}
                    </span>
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeObjective(index)}
                    className="shrink-0 p-1 text-gray-400 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Descriptor Browser */}
      {!readOnly && (
        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('cefr')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'cefr'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              CEFR Descriptors ({cefrDescriptors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('textbook')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'textbook'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Textbook ({textbookDescriptors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'custom'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Filters */}
          {activeTab !== 'custom' && (
            <div className="flex flex-wrap gap-3 mb-4">
              {/* Level Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Level</label>
                <select
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {CEFR_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Skill</label>
                <select
                  value={skillFilter}
                  onChange={e => setSkillFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Skills</option>
                  {SKILLS.map(skill => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex-[2] min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search descriptors..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* CEFR Descriptors List */}
          {activeTab === 'cefr' && (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {filteredCefrDescriptors.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No descriptors found. Try adjusting filters.
                </div>
              ) : (
                filteredCefrDescriptors.slice(0, 50).map(descriptor => {
                  const selected = isSelected(descriptor.id, 'cefr');
                  return (
                    <div
                      key={descriptor.id}
                      className={`p-3 hover:bg-gray-50 ${selected ? 'bg-purple-50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2">
                            {descriptor.descriptorText}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {descriptor.level}
                            </span>
                            {descriptor.skillFocus && (
                              <span className="text-xs text-gray-500">{descriptor.skillFocus}</span>
                            )}
                            {descriptor.scale && (
                              <span className="text-xs text-gray-400">{descriptor.scale}</span>
                            )}
                          </div>
                        </div>
                        {!selected && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => addObjective(descriptor, 'cefr', 'primary')}
                              disabled={primaryCount >= MAX_PRIMARY}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +P
                            </button>
                            <button
                              type="button"
                              onClick={() => addObjective(descriptor, 'cefr', 'secondary')}
                              disabled={secondaryCount >= MAX_SECONDARY}
                              className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +S
                            </button>
                          </div>
                        )}
                        {selected && (
                          <span className="text-xs text-purple-600 font-medium">Selected</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {filteredCefrDescriptors.length > 50 && (
                <div className="p-3 text-center text-xs text-gray-500 bg-gray-50">
                  Showing 50 of {filteredCefrDescriptors.length} descriptors. Use filters to narrow
                  results.
                </div>
              )}
            </div>
          )}

          {/* Textbook Descriptors List */}
          {activeTab === 'textbook' && (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {filteredTextbookDescriptors.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No textbook descriptors found. Try adjusting filters.
                </div>
              ) : (
                filteredTextbookDescriptors.slice(0, 50).map(descriptor => {
                  const selected = isSelected(descriptor.id, 'coursebook');
                  return (
                    <div
                      key={descriptor.id}
                      className={`p-3 hover:bg-gray-50 ${selected ? 'bg-amber-50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2">
                            {descriptor.descriptorText}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {descriptor.level}
                            </span>
                            <span className="text-xs text-gray-500">{descriptor.skillFocus}</span>
                            <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              {descriptor.book}
                            </span>
                            <span className="text-xs text-gray-400">
                              {descriptor.unit}
                              {descriptor.page && `, p.${descriptor.page}`}
                            </span>
                          </div>
                        </div>
                        {!selected && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => addObjective(descriptor, 'coursebook', 'primary')}
                              disabled={primaryCount >= MAX_PRIMARY}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +P
                            </button>
                            <button
                              type="button"
                              onClick={() => addObjective(descriptor, 'coursebook', 'secondary')}
                              disabled={secondaryCount >= MAX_SECONDARY}
                              className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +S
                            </button>
                          </div>
                        )}
                        {selected && (
                          <span className="text-xs text-amber-600 font-medium">Selected</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {filteredTextbookDescriptors.length > 50 && (
                <div className="p-3 text-center text-xs text-gray-500 bg-gray-50">
                  Showing 50 of {filteredTextbookDescriptors.length} descriptors. Use filters to
                  narrow results.
                </div>
              )}
            </div>
          )}

          {/* Custom Objective Input */}
          {activeTab === 'custom' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Learning Objective
              </label>
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Enter a custom learning objective for this session..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => addCustomObjective('primary')}
                  disabled={!customText.trim() || primaryCount >= MAX_PRIMARY}
                  className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add as Primary
                </button>
                <button
                  type="button"
                  onClick={() => addCustomObjective('secondary')}
                  disabled={!customText.trim() || secondaryCount >= MAX_SECONDARY}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add as Secondary
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || selectedObjectives.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Objectives'}
          </button>
        </div>
      )}
    </div>
  );
}

export default LearningObjectiveSelector;
