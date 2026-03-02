'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createAccommodationPreset,
  updateAccommodationPreset,
  deleteAccommodationPreset,
  setDefaultAccommodationPreset,
} from './actions';

interface AccommodationPreset {
  id: string;
  name: string;
  description: string | null;
  pricePerWeekEur: string;
  depositEur: string | null;
  isDefault: boolean | null;
  sortOrder: number | null;
  isActive: boolean | null;
}

interface Props {
  initialPresets: AccommodationPreset[];
  tenantId: string;
}

export function AccommodationPresetsClient({ initialPresets, tenantId }: Props) {
  const router = useRouter();
  const [presets, _setPresets] = useState(initialPresets);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New preset form state
  const [newPreset, setNewPreset] = useState({
    name: '',
    description: '',
    pricePerWeekEur: '0',
    depositEur: '0',
  });

  // Edit form state
  const [editPreset, setEditPreset] = useState({
    name: '',
    description: '',
    pricePerWeekEur: '0',
    depositEur: '0',
  });

  const handleAddPreset = async () => {
    if (!newPreset.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createAccommodationPreset({
        tenantId,
        name: newPreset.name,
        description: newPreset.description || null,
        pricePerWeekEur: newPreset.pricePerWeekEur,
        depositEur: newPreset.depositEur,
      });

      if (result.success) {
        setIsAdding(false);
        setNewPreset({ name: '', description: '', pricePerWeekEur: '0', depositEur: '0' });
        router.refresh();
      } else {
        setError(result.error || 'Failed to create preset');
      }
    } catch (_err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePreset = async (id: string) => {
    if (!editPreset.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateAccommodationPreset(id, {
        name: editPreset.name,
        description: editPreset.description || null,
        pricePerWeekEur: editPreset.pricePerWeekEur,
        depositEur: editPreset.depositEur,
      });

      if (result.success) {
        setEditingId(null);
        router.refresh();
      } else {
        setError(result.error || 'Failed to update preset');
      }
    } catch (_err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePreset = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await deleteAccommodationPreset(id);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to delete preset');
      }
    } catch (_err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await setDefaultAccommodationPreset(id);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to set default');
      }
    } catch (_err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (preset: AccommodationPreset) => {
    setEditingId(preset.id);
    setEditPreset({
      name: preset.name,
      description: preset.description || '',
      pricePerWeekEur: preset.pricePerWeekEur,
      depositEur: preset.depositEur || '0',
    });
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Add New Preset */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Accommodation Types</h2>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              + Add Type
            </button>
          )}
        </div>

        {isAdding && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4 mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newPreset.name}
                  onChange={e => setNewPreset({ ...newPreset, name: e.target.value })}
                  placeholder="e.g., Host Family, Student House - Twin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newPreset.description}
                  onChange={e => setNewPreset({ ...newPreset, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Week (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPreset.pricePerWeekEur}
                  onChange={e => setNewPreset({ ...newPreset, pricePerWeekEur: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPreset.depositEur}
                  onChange={e => setNewPreset({ ...newPreset, depositEur: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewPreset({
                    name: '',
                    description: '',
                    pricePerWeekEur: '0',
                    depositEur: '0',
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPreset}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Type'}
              </button>
            </div>
          </div>
        )}

        {/* List of Presets */}
        {presets.length === 0 ? (
          <p className="text-sm text-gray-500">No accommodation types configured yet.</p>
        ) : (
          <div className="space-y-3">
            {presets.map(preset => (
              <div
                key={preset.id}
                className={`border rounded-lg p-4 ${
                  preset.isDefault ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {editingId === preset.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={editPreset.name}
                          onChange={e => setEditPreset({ ...editPreset, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={editPreset.description}
                          onChange={e =>
                            setEditPreset({ ...editPreset, description: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price/Week (EUR)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPreset.pricePerWeekEur}
                          onChange={e =>
                            setEditPreset({ ...editPreset, pricePerWeekEur: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Deposit (EUR)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPreset.depositEur}
                          onChange={e =>
                            setEditPreset({ ...editPreset, depositEur: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdatePreset(preset.id)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {preset.name}
                        {preset.isDefault && (
                          <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </p>
                      {preset.description && (
                        <p className="text-sm text-gray-500">{preset.description}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        &euro;{parseFloat(preset.pricePerWeekEur).toFixed(2)}/week
                        {parseFloat(preset.depositEur || '0') > 0 && (
                          <span className="ml-2 text-gray-400">
                            (Deposit: &euro;{parseFloat(preset.depositEur || '0').toFixed(2)})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!preset.isDefault && (
                        <button
                          onClick={() => handleSetDefault(preset.id)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(preset)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePreset(preset.id, preset.name)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
