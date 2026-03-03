'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AssessmentType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
}

interface AssessmentTypesManagerProps {
  initialTypes: AssessmentType[];
}

export function AssessmentTypesManager({ initialTypes }: AssessmentTypesManagerProps) {
  const router = useRouter();
  const [types, setTypes] = useState<AssessmentType[]>(initialTypes);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/summative-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }

      const data = await res.json();
      setTypes([...types, data.type]);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/summative-types/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      const data = await res.json();
      setTypes(types.map(t => (t.id === editingId ? data.type : t)));
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/summative-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      setTypes(types.map(t => (t.id === id ? { ...t, isActive: !currentActive } : t)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const startEdit = (type: AssessmentType) => {
    setFormData({
      name: type.name,
      description: type.description || '',
    });
    setEditingId(type.id);
    setIsCreating(false);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const activeTypes = types.filter(t => t.isActive);
  const inactiveTypes = types.filter(t => !t.isActive);

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Assessment Type' : 'Create Assessment Type'}
          </h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., End of Unit Test"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of when this assessment type is used..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Button */}
      {!isCreating && !editingId && (
        <div className="flex justify-end">
          <button
            onClick={startCreate}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Assessment Type
          </button>
        </div>
      )}

      {/* Active Types */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Active Assessment Types ({activeTypes.length})
          </h3>
        </div>
        {activeTypes.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500">No active assessment types defined yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Click &quot;Add Assessment Type&quot; to create one.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeTypes.map(type => (
              <div key={type.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{type.name}</p>
                  {type.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(type)}
                    className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(type.id, true)}
                    className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Types */}
      {inactiveTypes.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500">
              Inactive Assessment Types ({inactiveTypes.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {inactiveTypes.map(type => (
              <div key={type.id} className="px-6 py-4 flex items-center justify-between bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-500">{type.name}</p>
                  {type.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{type.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleToggleActive(type.id, false)}
                  className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800"
                >
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
