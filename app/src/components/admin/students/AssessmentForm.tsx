'use client';

import React, { useState, useEffect } from 'react';

interface Descriptor {
  id: string;
  category: string;
  subcategory: string | null;
  descriptorText: string;
  level: string;
}

interface AssessmentFormProps {
  studentId: string;
  studentName: string;
  classId?: string;
  enrollmentId?: string;
  currentLevel?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ASSESSMENT_TYPES = [
  { value: 'periodic', label: 'Weekly/Periodic Assessment' },
  { value: 'ad_hoc', label: 'Ad-hoc Observation' },
  { value: 'end_of_unit', label: 'End of Unit Assessment' },
  { value: 'placement', label: 'Placement Assessment' },
];

const SCORE_OPTIONS = [
  { value: 1, label: '1 - Not demonstrated', color: 'text-red-600' },
  { value: 2, label: '2 - Emerging', color: 'text-amber-600' },
  { value: 3, label: '3 - Developing', color: 'text-blue-600' },
  { value: 4, label: '4 - Competent', color: 'text-green-600' },
];

export function AssessmentForm({
  studentId,
  studentName,
  classId,
  enrollmentId,
  currentLevel,
  onSuccess,
  onCancel,
}: AssessmentFormProps) {
  const [descriptors, setDescriptors] = useState<Descriptor[]>([]);
  const [isLoadingDescriptors, setIsLoadingDescriptors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    descriptorId: '',
    assessmentType: 'periodic' as 'periodic' | 'ad_hoc' | 'end_of_unit' | 'placement',
    assessmentDate: new Date().toISOString().split('T')[0],
    score: 0,
    notes: '',
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Fetch descriptors for the current level
  useEffect(() => {
    async function fetchDescriptors() {
      setIsLoadingDescriptors(true);
      try {
        const params = new URLSearchParams();
        if (currentLevel) {
          params.append('level', currentLevel);
        }

        const response = await fetch(`/api/lessons/descriptors?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setDescriptors(data.descriptors || []);
        }
      } catch (err) {
        console.error('Failed to fetch descriptors:', err);
      } finally {
        setIsLoadingDescriptors(false);
      }
    }

    fetchDescriptors();
  }, [currentLevel]);

  // Get unique categories from descriptors
  const categories = [...new Set(descriptors.map(d => d.category))];

  // Filter descriptors by selected category
  const filteredDescriptors = selectedCategory
    ? descriptors.filter(d => d.category === selectedCategory)
    : descriptors;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descriptorId) {
      setError('Please select a descriptor');
      return;
    }

    if (formData.score < 1 || formData.score > 4) {
      setError('Please select a valid score');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/competency-assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          descriptorId: formData.descriptorId,
          classId,
          enrollmentId,
          assessmentType: formData.assessmentType,
          assessmentDate: formData.assessmentDate,
          score: formData.score,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create assessment');
      }

      setSuccess(true);
      setFormData({
        descriptorId: '',
        assessmentType: 'periodic',
        assessmentDate: new Date().toISOString().split('T')[0],
        score: 0,
        notes: '',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDescriptor = descriptors.find(d => d.id === formData.descriptorId);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Record Assessment</h3>
          <p className="text-sm text-gray-500 mt-1">
            Recording for <span className="font-medium">{studentName}</span>
            {currentLevel && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                {currentLevel}
              </span>
            )}
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Assessment recorded successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Assessment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Type</label>
          <select
            value={formData.assessmentType}
            onChange={e =>
              setFormData({
                ...formData,
                assessmentType: e.target.value as typeof formData.assessmentType,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {ASSESSMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assessment Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Date</label>
          <input
            type="date"
            value={formData.assessmentDate}
            onChange={e => setFormData({ ...formData, assessmentDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Skill Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Skill Category</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedCategory === ''
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Descriptor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CEFR Descriptor</label>
          {isLoadingDescriptors ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredDescriptors.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No descriptors available for this level.</p>
          ) : (
            <select
              value={formData.descriptorId}
              onChange={e => setFormData({ ...formData, descriptorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select a descriptor...</option>
              {filteredDescriptors.map(descriptor => (
                <option key={descriptor.id} value={descriptor.id}>
                  [{descriptor.category}] {descriptor.subcategory}:{' '}
                  {descriptor.descriptorText.substring(0, 80)}...
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Selected Descriptor Detail */}
        {selectedDescriptor && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {selectedDescriptor.category} - {selectedDescriptor.subcategory}
            </p>
            <p className="text-sm text-gray-800">{selectedDescriptor.descriptorText}</p>
          </div>
        )}

        {/* Score Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Score (1-4 Scale)</label>
          <div className="grid grid-cols-2 gap-2">
            {SCORE_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, score: option.value })}
                className={`p-3 text-left rounded-lg border-2 transition-colors ${
                  formData.score === option.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={`text-lg font-bold ${option.color}`}>{option.value}</span>
                <p className="text-xs text-gray-600 mt-1">{option.label.split(' - ')[1]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Any additional observations or context..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
            type="submit"
            disabled={isSubmitting || !formData.descriptorId || formData.score < 1}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Record Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}
