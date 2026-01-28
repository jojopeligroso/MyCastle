'use client';

/**
 * CreateRoomForm Component - Form to create a new room/classroom
 * Ref: Task 1.8.2 - Create Room Form
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COMMON_EQUIPMENT = [
  'projector',
  'whiteboard',
  'smartboard',
  'computer',
  'audio_system',
  'video_conferencing',
];

const COMMON_FACILITIES = [
  'wifi',
  'air_conditioning',
  'heating',
  'natural_light',
  'sound_insulation',
  'wheelchair_access',
];

export function CreateRoomForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 20,
    accessibility: false,
    status: 'available',
  });

  const [equipment, setEquipment] = useState<Record<string, boolean | number>>({});
  const [facilities, setFacilities] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          equipment,
          facilities,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create room');
      }

      // Success - redirect to rooms list
      router.push('/admin/rooms');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox' && name === 'accessibility') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (name === 'capacity') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleEquipmentChange = (key: string, type: 'boolean' | 'number') => {
    if (type === 'boolean') {
      setEquipment(prev => {
        const newEquipment = { ...prev };
        if (newEquipment[key]) {
          delete newEquipment[key];
        } else {
          newEquipment[key] = true;
        }
        return newEquipment;
      });
    }
  };

  const handleEquipmentNumberChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEquipment(prev => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const handleFacilityToggle = (facility: string) => {
    setFacilities(prev => {
      if (prev.includes(facility)) {
        return prev.filter(f => f !== facility);
      } else {
        return [...prev, facility];
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Room Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="e.g., Room 101, Computer Lab A"
              />
              <p className="mt-1 text-sm text-gray-500">Enter a unique name for this room</p>
            </div>

            <div className="col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="Additional details about the room..."
              />
            </div>

            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                Capacity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="capacity"
                id="capacity"
                required
                min="1"
                max="100"
                value={formData.capacity}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">Maximum number of students</p>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            <div className="col-span-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="accessibility"
                    id="accessibility"
                    checked={formData.accessibility}
                    onChange={handleChange}
                    className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="accessibility" className="font-medium text-gray-700">
                    Wheelchair Accessible
                  </label>
                  <p className="text-gray-500">This room is wheelchair accessible</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Equipment</h3>
          <div className="space-y-3">
            {COMMON_EQUIPMENT.map(item => (
              <div key={item} className="flex items-center">
                <input
                  type="checkbox"
                  id={`equipment-${item}`}
                  checked={!!equipment[item]}
                  onChange={() => handleEquipmentChange(item, 'boolean')}
                  className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
                />
                <label
                  htmlFor={`equipment-${item}`}
                  className="ml-3 text-sm text-gray-700 capitalize"
                >
                  {item.replace('_', ' ')}
                </label>
                {item === 'computer' && equipment[item] && (
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Quantity"
                    value={typeof equipment[item] === 'number' ? equipment[item] : 1}
                    onChange={e => handleEquipmentNumberChange(item, e.target.value)}
                    className="ml-4 w-20 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Facilities */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Facilities</h3>
          <div className="space-y-3">
            {COMMON_FACILITIES.map(facility => (
              <div key={facility} className="flex items-center">
                <input
                  type="checkbox"
                  id={`facility-${facility}`}
                  checked={facilities.includes(facility)}
                  onChange={() => handleFacilityToggle(facility)}
                  className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
                />
                <label
                  htmlFor={`facility-${facility}`}
                  className="ml-3 text-sm text-gray-700 capitalize"
                >
                  {facility.replace('_', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </form>
  );
}
