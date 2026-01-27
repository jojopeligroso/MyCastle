/**
 * Transfer Student Form Component
 * Form for transferring a student from one class to another
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Class {
  id: string;
  name: string;
  code?: string;
  level?: string;
  capacity: number;
  enrolledCount: number;
}

interface TransferStudentFormProps {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  currentClassId: string;
  currentClassName: string;
  currentClassCode?: string;
  currentClassLevel?: string;
}

export default function TransferStudentForm({
  enrollmentId,
  studentId,
  studentName,
  currentClassId,
  currentClassName,
  currentClassCode,
  currentClassLevel,
}: TransferStudentFormProps) {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [targetClassId, setTargetClassId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  // Fetch active classes
  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await fetch('/api/admin/classes?status=active');
        if (response.ok) {
          const data = await response.json();
          // Exclude current class
          const filteredClasses = (data.classes || []).filter(
            (c: Class) => c.id !== currentClassId
          );
          setClasses(filteredClasses);
        }
      } catch (_err) {
        console.error('Failed to fetch classes:', err);
      }
    }

    fetchClasses();
  }, [currentClassId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Create TRANSFER amendment
      const amendmentResponse = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amendment_type: 'TRANSFER',
          previous_value: currentClassId,
          new_value: targetClassId,
          reason: reason || undefined,
          metadata: {
            newClassId: targetClassId,
            transferDate,
          },
        }),
      });

      if (!amendmentResponse.ok) {
        const amendmentData = await amendmentResponse.json();
        throw new Error(amendmentData.error || 'Failed to create transfer amendment');
      }

      // Step 2: Update original enrollment status to 'transferred' and set end date
      const updateResponse = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'transferred',
          end_date: transferDate,
        }),
      });

      if (!updateResponse.ok) {
        const updateData = await updateResponse.json();
        throw new Error(updateData.error || 'Failed to update enrollment status');
      }

      // Step 3: Create new enrollment in target class
      const createResponse = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          class_id: targetClassId,
          start_date: transferDate,
          status: 'active',
        }),
      });

      if (!createResponse.ok) {
        const createData = await createResponse.json();
        throw new Error(createData.error || 'Failed to create new enrollment');
      }

      const newEnrollment = await createResponse.json();

      // Success - redirect to new enrollment detail page
      router.push(`/admin/enrolments/${newEnrollment.id}`);
      router.refresh();
    } catch (_err) {
      const message = err instanceof Error ? err.message : 'An error occurred during transfer';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find(c => c.id === targetClassId);
  const capacityRemaining = selectedClass
    ? selectedClass.capacity - selectedClass.enrolledCount
    : null;

  return (
    <div className="space-y-6">
      {/* Current Class Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Current Enrollment</h3>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Student:</span> {studentName}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Current Class:</span> {currentClassName}
          {currentClassCode && ` (${currentClassCode})`}
          {currentClassLevel && ` - ${currentClassLevel}`}
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-700">
              This will mark the current enrollment as transferred and create a new enrollment in
              the target class. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Target Class Selector */}
        <div>
          <label htmlFor="targetClass" className="block text-sm font-medium text-gray-700">
            Target Class <span className="text-red-500">*</span>
          </label>
          <select
            id="targetClass"
            value={targetClassId}
            onChange={e => setTargetClassId(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select a class...</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
                {cls.code && ` (${cls.code})`}
                {cls.level && ` - ${cls.level}`} - {cls.enrolledCount}/{cls.capacity} enrolled
              </option>
            ))}
          </select>
          {selectedClass && capacityRemaining !== null && (
            <p className="mt-1 text-sm text-gray-500">
              {capacityRemaining > 0 ? (
                <span className="text-green-600">
                  {capacityRemaining} space{capacityRemaining !== 1 ? 's' : ''} available
                </span>
              ) : (
                <span className="text-red-600">Class is at full capacity</span>
              )}
            </p>
          )}
        </div>

        {/* Transfer Effective Date */}
        <div>
          <label htmlFor="transferDate" className="block text-sm font-medium text-gray-700">
            Transfer Effective Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="transferDate"
            value={transferDate}
            onChange={e => setTransferDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            The current enrollment will end on this date, and the new enrollment will start
          </p>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
            Reason (Optional)
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Reason for transfer..."
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push(`/admin/enrolments/${enrollmentId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !targetClassId || !transferDate}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Transferring...' : 'Transfer Student'}
          </button>
        </div>
      </form>
    </div>
  );
}
