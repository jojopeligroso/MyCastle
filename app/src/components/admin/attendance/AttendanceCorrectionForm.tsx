'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Student = {
  id: string;
  name: string;
};

type AttendanceRecord = {
  id: string;
  status: string;
  notes: string | null;
  minutesLate?: number;
  minutesLeftEarly?: number;
};

type Props = {
  sessionId: string;
  students: Student[];
  existingRecords: Map<string, AttendanceRecord>;
  onClose: () => void;
};

const statuses = [
  { value: 'present', label: 'Present', color: 'green' },
  { value: 'absent', label: 'Absent', color: 'red' },
  { value: 'late', label: 'Late', color: 'yellow' },
  { value: 'excused', label: 'Excused', color: 'gray' },
];

export default function AttendanceCorrectionForm({
  sessionId,
  students,
  existingRecords,
  onClose,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [correctedStatus, setCorrectedStatus] = useState('present');
  const [correctedNotes, setCorrectedNotes] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const selectedRecord = selectedStudentId ? existingRecords.get(selectedStudentId) : null;
  const originalStatus = selectedRecord?.status || 'present';
  const originalNotes = selectedRecord?.notes || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedStudentId) {
      setError('Please select a student');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the correction');
      return;
    }

    if (originalStatus === correctedStatus && originalNotes === correctedNotes) {
      setError('No changes detected. Please modify the status or notes.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/attendance/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          studentId: selectedStudentId,
          attendanceId: selectedRecord?.id,
          originalStatus,
          originalNotes,
          correctedStatus,
          correctedNotes,
          reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit correction');
      }

      alert('Correction request submitted successfully. Awaiting admin approval.');
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    const record = existingRecords.get(studentId);
    if (record) {
      setCorrectedStatus(record.status);
      setCorrectedNotes(record.notes || '');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Request Attendance Correction</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Selection */}
            <div>
              <label htmlFor="student" className="block text-sm font-medium text-gray-700">
                Select Student <span className="text-red-500">*</span>
              </label>
              <select
                id="student"
                value={selectedStudentId}
                onChange={e => handleStudentChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                required
              >
                <option value="">-- Select a student --</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Show original and corrected values when student selected */}
            {selectedStudentId && (
              <>
                {/* Original Status */}
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Original Record:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Status:</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          originalStatus === 'present'
                            ? 'bg-green-100 text-green-800'
                            : originalStatus === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : originalStatus === 'late'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {originalStatus}
                      </span>
                    </div>
                    {originalNotes && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-500">Notes:</span>
                        <span className="text-sm text-gray-700">{originalNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Corrected Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Corrected Status <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {statuses.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setCorrectedStatus(s.value)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          correctedStatus === s.value
                            ? s.color === 'green'
                              ? 'bg-green-600 text-white'
                              : s.color === 'red'
                                ? 'bg-red-600 text-white'
                                : s.color === 'yellow'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Corrected Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Corrected Notes
                  </label>
                  <textarea
                    id="notes"
                    value={correctedNotes}
                    onChange={e => setCorrectedNotes(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    placeholder="Add any additional notes..."
                  />
                </div>

                {/* Reason */}
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                    Reason for Correction <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    placeholder="Explain why this correction is needed (e.g., marked wrong student, technical error, etc.)"
                    required
                  />
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedStudentId}
                className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Correction'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
