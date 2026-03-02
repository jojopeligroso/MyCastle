'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFeePreset, updateFeePreset, deleteFeePreset, setDefaultPreset } from './actions';

interface FeePreset {
  id: string;
  feeType: string;
  label: string;
  amountEur: string;
  isDefault: boolean | null;
  sortOrder: number | null;
  isActive: boolean | null;
}

interface Props {
  initialPresets: FeePreset[];
  tenantId: string;
}

const FEE_TYPES = [
  { value: 'registration', label: 'Registration Fee' },
  { value: 'learner_protection', label: 'Learner Protection' },
  { value: 'transfer', label: 'Transfer Fee' },
  { value: 'exam', label: 'Exam Fee' },
] as const;

export function BookingFeePresetsClient({ initialPresets, tenantId }: Props) {
  const router = useRouter();
  const [presets, _setPresets] = useState(initialPresets);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New preset form state
  const [newPreset, setNewPreset] = useState({
    feeType: 'registration',
    label: '',
    amountEur: '0',
  });

  // Edit form state
  const [editPreset, setEditPreset] = useState({
    label: '',
    amountEur: '0',
  });

  const handleAddPreset = async () => {
    if (!newPreset.label.trim()) {
      setError('Label is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createFeePreset({
        tenantId,
        feeType: newPreset.feeType,
        label: newPreset.label,
        amountEur: newPreset.amountEur,
      });

      if (result.success) {
        setIsAdding(false);
        setNewPreset({ feeType: 'registration', label: '', amountEur: '0' });
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
    if (!editPreset.label.trim()) {
      setError('Label is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateFeePreset(id, {
        label: editPreset.label,
        amountEur: editPreset.amountEur,
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

  const handleDeletePreset = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete "${label}"?`)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await deleteFeePreset(id);

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

  const handleSetDefault = async (id: string, feeType: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await setDefaultPreset(id, feeType);

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

  const startEdit = (preset: FeePreset) => {
    setEditingId(preset.id);
    setEditPreset({
      label: preset.label,
      amountEur: preset.amountEur,
    });
  };

  // Group presets by fee type
  const groupedPresets = FEE_TYPES.map(type => ({
    ...type,
    presets: presets.filter(p => p.feeType === type.value),
  }));

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
          <h2 className="text-lg font-medium text-gray-900">Add New Preset</h2>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              + Add Preset
            </button>
          )}
        </div>

        {isAdding && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                <select
                  value={newPreset.feeType}
                  onChange={e => setNewPreset({ ...newPreset, feeType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {FEE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={newPreset.label}
                  onChange={e => setNewPreset({ ...newPreset, label: e.target.value })}
                  placeholder="e.g., Standard, Reduced, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPreset.amountEur}
                  onChange={e => setNewPreset({ ...newPreset, amountEur: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewPreset({ feeType: 'registration', label: '', amountEur: '0' });
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
                {isSubmitting ? 'Adding...' : 'Add Preset'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fee Type Sections */}
      {groupedPresets.map(group => (
        <div key={group.value} className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{group.label}</h2>

          {group.presets.length === 0 ? (
            <p className="text-sm text-gray-500">No presets configured for this fee type.</p>
          ) : (
            <div className="space-y-3">
              {group.presets.map(preset => (
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={editPreset.label}
                            onChange={e => setEditPreset({ ...editPreset, label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount (EUR)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPreset.amountEur}
                            onChange={e =>
                              setEditPreset({ ...editPreset, amountEur: e.target.value })
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
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {preset.label}
                            {preset.isDefault && (
                              <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            &euro;{parseFloat(preset.amountEur).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!preset.isDefault && (
                          <button
                            onClick={() => handleSetDefault(preset.id, preset.feeType)}
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
                          onClick={() => handleDeletePreset(preset.id, preset.label)}
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
      ))}
    </div>
  );
}
