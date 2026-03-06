'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  X,
  BookOpen,
  Filter,
  Search,
  AlertCircle,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface CustomDescriptor {
  id: string;
  cefrLevel: string;
  skill: string;
  descriptorText: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
}

interface Stats {
  byLevel: { level: string; count: number }[];
  bySkill: { skill: string; count: number }[];
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SKILLS = ['reading', 'writing', 'listening', 'speaking', 'grammar', 'vocabulary'];

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-green-100 text-green-800',
  A2: 'bg-green-200 text-green-900',
  B1: 'bg-blue-100 text-blue-800',
  B2: 'bg-blue-200 text-blue-900',
  C1: 'bg-purple-100 text-purple-800',
  C2: 'bg-purple-200 text-purple-900',
};

const SKILL_ICONS: Record<string, string> = {
  reading: '📖',
  writing: '✏️',
  listening: '👂',
  speaking: '🗣️',
  grammar: '📝',
  vocabulary: '📚',
};

export default function CustomDescriptorManager() {
  const [descriptors, setDescriptors] = useState<CustomDescriptor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterSkill, setFilterSkill] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cefrLevel: 'B1',
    skill: 'speaking',
    descriptorText: '',
    category: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDescriptors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterLevel) params.set('level', filterLevel);
      if (filterSkill) params.set('skill', filterSkill);
      params.set('activeOnly', showInactive ? 'false' : 'true');

      const res = await fetch(`/api/admin/curriculum/custom?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setDescriptors(data.descriptors);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError('Failed to load custom descriptors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterSkill, showInactive]);

  useEffect(() => {
    fetchDescriptors();
  }, [fetchDescriptors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/curriculum/custom/${editingId}`
        : '/api/admin/curriculum/custom';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          category: formData.category || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess(editingId ? 'Descriptor updated successfully' : 'Descriptor created successfully');
      setShowForm(false);
      setEditingId(null);
      setFormData({ cefrLevel: 'B1', skill: 'speaking', descriptorText: '', category: '' });
      fetchDescriptors();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save descriptor');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (descriptor: CustomDescriptor) => {
    setEditingId(descriptor.id);
    setFormData({
      cefrLevel: descriptor.cefrLevel,
      skill: descriptor.skill,
      descriptorText: descriptor.descriptorText,
      category: descriptor.category || '',
    });
    setShowForm(true);
    setFormError(null);
  };

  const handleToggleActive = async (descriptor: CustomDescriptor) => {
    try {
      const res = await fetch(`/api/admin/curriculum/custom/${descriptor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !descriptor.isActive }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setSuccess(`Descriptor ${descriptor.isActive ? 'deactivated' : 'activated'}`);
      fetchDescriptors();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update descriptor');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm('Are you sure you want to delete this descriptor? This action cannot be undone.')
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/curriculum/custom/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      setSuccess('Descriptor deleted successfully');
      fetchDescriptors();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete descriptor');
      console.error(err);
    }
  };

  const filteredDescriptors = descriptors.filter(d => {
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        d.descriptorText.toLowerCase().includes(search) ||
        (d.category && d.category.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ cefrLevel: 'B1', skill: 'speaking', descriptorText: '', category: '' });
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{descriptors.length}</div>
            <div className="text-sm text-gray-500">Total Descriptors</div>
          </div>
          {CEFR_LEVELS.slice(0, 3).map(level => {
            const count = stats.byLevel.find(s => s.level === level)?.count || 0;
            return (
              <div key={level} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-500">{level} Level</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search descriptors..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All Levels</option>
            {CEFR_LEVELS.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <select
            value={filterSkill}
            onChange={e => setFilterSkill(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All Skills</option>
            {SKILLS.map(skill => (
              <option key={skill} value={skill}>
                {skill.charAt(0).toUpperCase() + skill.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              showInactive
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            {showInactive ? 'Showing All' : 'Active Only'}
          </button>
        </div>

        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ cefrLevel: 'B1', skill: 'speaking', descriptorText: '', category: '' });
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          Add Descriptor
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Descriptor' : 'Add Custom Descriptor'}
              </h3>
              <button onClick={cancelForm} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">CEFR Level</label>
                  <select
                    value={formData.cefrLevel}
                    onChange={e => setFormData({ ...formData, cefrLevel: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    required
                  >
                    {CEFR_LEVELS.map(level => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Skill</label>
                  <select
                    value={formData.skill}
                    onChange={e => setFormData({ ...formData, skill: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    required
                  >
                    {SKILLS.map(skill => (
                      <option key={skill} value={skill}>
                        {SKILL_ICONS[skill]} {skill.charAt(0).toUpperCase() + skill.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Business English, Academic Writing"
                  className="w-full rounded-lg border px-3 py-2"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Descriptor Text
                </label>
                <textarea
                  value={formData.descriptorText}
                  onChange={e => setFormData({ ...formData, descriptorText: e.target.value })}
                  placeholder="Can understand and use familiar everyday expressions..."
                  className="h-32 w-full resize-none rounded-lg border px-3 py-2"
                  required
                  minLength={10}
                />
                <p className="mt-1 text-xs text-gray-500">Minimum 10 characters</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Descriptors List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : filteredDescriptors.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">No custom descriptors</h3>
          <p className="mb-4 text-gray-500">
            {searchText || filterLevel || filterSkill
              ? 'No descriptors match your filters'
              : 'Create your first custom learning objective'}
          </p>
          {!searchText && !filterLevel && !filterSkill && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4" />
              Add Descriptor
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDescriptors.map(descriptor => (
            <div
              key={descriptor.id}
              className={`rounded-lg border bg-white p-4 shadow-sm transition-opacity ${
                !descriptor.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[descriptor.cefrLevel]}`}
                    >
                      {descriptor.cefrLevel}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {SKILL_ICONS[descriptor.skill]} {descriptor.skill}
                    </span>
                    {descriptor.category && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {descriptor.category}
                      </span>
                    )}
                    {!descriptor.isActive && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Inactive
                      </span>
                    )}
                    <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Custom
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{descriptor.descriptorText}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    Created {new Date(descriptor.createdAt).toLocaleDateString()}
                    {descriptor.createdByName && ` by ${descriptor.createdByName}`}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(descriptor)}
                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title={descriptor.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {descriptor.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(descriptor)}
                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(descriptor.id)}
                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
