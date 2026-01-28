'use client';

/**
 * RoomAllocationView Component - View and manage room allocations for class sessions
 * Shows which rooms are assigned to which sessions on a given date
 * Ref: Task 1.8.3 - Room Allocation/Booking View
 */

import { useState, useEffect } from 'react';

interface Room {
  id: string;
  name: string;
  capacity: number;
}

interface ClassInfo {
  id: string;
  name: string;
  code: string | null;
}

interface Session {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  classId: string;
}

interface Allocation {
  allocation: {
    id: string;
    roomId: string;
    classSessionId: string;
    notes: string | null;
    createdAt: Date;
  };
  room: Room;
  session: Session;
  class: ClassInfo;
}

export function RoomAllocationView() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllocations();
  }, [selectedDate]);

  const fetchAllocations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/room-allocations?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch allocations');
      }
      const data = await response.json();
      setAllocations(data.allocations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (allocationId: string) => {
    if (!confirm('Are you sure you want to remove this room allocation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/room-allocations/${allocationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete allocation');
      }

      // Refresh allocations
      await fetchAllocations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete allocation');
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'N/A';
    return time.substring(0, 5); // Format HH:MM:SS to HH:MM
  };

  // Group allocations by room
  const allocationsByRoom = allocations.reduce(
    (acc, allocation) => {
      const roomId = allocation.room.id;
      if (!acc[roomId]) {
        acc[roomId] = {
          room: allocation.room,
          sessions: [],
        };
      }
      acc[roomId].sessions.push({
        allocation: allocation.allocation,
        session: allocation.session,
        class: allocation.class,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        room: Room;
        sessions: Array<{
          allocation: Allocation['allocation'];
          session: Session;
          class: ClassInfo;
        }>;
      }
    >
  );

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Room Allocations</h2>
            <p className="mt-1 text-sm text-gray-500">
              View which sessions are assigned to which rooms
            </p>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <label htmlFor="date" className="text-sm font-medium text-gray-700">
              Date:
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-purple-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading allocations...</p>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="p-6">
          {Object.keys(allocationsByRoom).length === 0 ? (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No allocations</h3>
              <p className="mt-1 text-sm text-gray-500">
                No rooms have been allocated to sessions on this date.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(allocationsByRoom).map(({ room, sessions }) => (
                <div key={room.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Room Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                        <p className="text-sm text-gray-500">Capacity: {room.capacity} students</p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Sessions */}
                  <div className="divide-y divide-gray-200">
                    {sessions.map(({ allocation, session, class: classInfo }) => (
                      <div key={allocation.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {classInfo.name}
                                  {classInfo.code && (
                                    <span className="ml-2 text-gray-500">({classInfo.code})</span>
                                  )}
                                </p>
                                {allocation.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{allocation.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(allocation.id)}
                            className="ml-4 text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      {!loading && allocations.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {allocations.length} allocation{allocations.length !== 1 ? 's' : ''} for{' '}
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  );
}
