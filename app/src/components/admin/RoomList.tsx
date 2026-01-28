'use client';

/**
 * RoomList Component - Display and manage rooms table
 * Ref: Task 1.8.1 - Rooms List Page
 */

import Link from 'next/link';
import { useState } from 'react';

interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  equipment: Record<string, unknown>;
  facilities: string[];
  accessibility: boolean;
  status: string;
  createdAt: Date;
}

interface Props {
  rooms: Room[];
  onEdit?: (roomId: string) => void;
  onDelete?: (roomId: string) => void;
}

export function RoomList({ rooms, onEdit, onDelete }: Props) {
  const [searchInput, setSearchInput] = useState('');

  // Client-side filtering
  const filteredRooms = rooms.filter(room => {
    if (!searchInput) return true;
    const search = searchInput.toLowerCase();
    return (
      room.name.toLowerCase().includes(search) || room.description?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      available: 'bg-green-100 text-green-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      unavailable: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const formatEquipment = (equipment: Record<string, unknown>) => {
    if (!equipment || Object.keys(equipment).length === 0) return 'None';
    return Object.entries(equipment)
      .map(([key, value]) => {
        if (typeof value === 'boolean') return value ? key : null;
        return `${key}: ${value}`;
      })
      .filter(Boolean)
      .join(', ');
  };

  const formatFacilities = (facilities: string[]) => {
    if (!facilities || facilities.length === 0) return 'None';
    return facilities.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with Search */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full lg:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by room name or description..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
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
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-600">
            Showing {filteredRooms.length} of {rooms.length} rooms
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchInput ? 'No rooms found' : 'No rooms yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchInput ? 'Try adjusting your search' : 'Get started by creating a new room'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facilities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accessible
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRooms.map(room => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{room.name}</div>
                    {room.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {room.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{room.capacity} students</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-xs">
                      {formatEquipment(room.equipment)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-xs">
                      {formatFacilities(room.facilities)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {room.accessibility ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(room.status)}`}
                    >
                      {room.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(room.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(room.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {filteredRooms.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            Total: {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
