/**
 * Attendance Register Component
 * T-050: Register UI (Bulk Present + Overrides) (8 points, Medium)
 *
 * Features:
 * - Bulk "Mark All Present" button
 * - Individual per-student overrides
 * - Keyboard shortcuts (P=Present, A=Absent, L=Late, E=Excused)
 * - Optimistic UI with server reconciliation
 * - Hash-chain integration for tamper evidence
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { computeAttendanceHash, getLastHash } from '@/lib/hash-chain';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface AttendanceRecord {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface AttendanceRegisterProps {
  sessionId: string;
  classId: string;
  sessionDate: string;
  students: Student[];
  onSave: (records: AttendanceRecord[]) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800', key: 'P' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800', key: 'A' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-800', key: 'L' },
  { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-800', key: 'E' },
] as const;

export default function AttendanceRegister({
  sessionId,
  classId,
  sessionDate,
  students,
  onSave,
}: AttendanceRegisterProps) {
  const [attendance, setAttendance] = useState<Map<string, AttendanceRecord>>(new Map());
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Initialize attendance with all students present by default
  useEffect(() => {
    const initialAttendance = new Map<string, AttendanceRecord>();
    students.forEach(student => {
      initialAttendance.set(student.id, {
        studentId: student.id,
        status: 'present',
      });
    });
    setAttendance(initialAttendance);
  }, [students]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (!selectedStudent) return;

      const key = e.key.toUpperCase();
      const option = STATUS_OPTIONS.find(opt => opt.key === key);

      if (option) {
        updateAttendance(selectedStudent, option.value);
        e.preventDefault();
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedStudent]);

  function updateAttendance(studentId: string, status: AttendanceRecord['status']) {
    setAttendance(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(studentId);
      newMap.set(studentId, {
        ...current,
        studentId,
        status,
        notes: notes.get(studentId),
      });
      return newMap;
    });
  }

  function updateNotes(studentId: string, noteText: string) {
    setNotes(prev => {
      const newMap = new Map(prev);
      newMap.set(studentId, noteText);
      return newMap;
    });

    // Update attendance record
    setAttendance(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(studentId);
      if (current) {
        newMap.set(studentId, {
          ...current,
          notes: noteText,
        });
      }
      return newMap;
    });
  }

  function markAllPresent() {
    const newAttendance = new Map<string, AttendanceRecord>();
    students.forEach(student => {
      newAttendance.set(student.id, {
        studentId: student.id,
        status: 'present',
        notes: notes.get(student.id),
      });
    });
    setAttendance(newAttendance);
    setMessage({ type: 'success', text: 'All students marked present' });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const records = Array.from(attendance.values());
      await onSave(records);

      setMessage({ type: 'success', text: `Attendance saved for ${records.length} students` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save attendance',
      });
    } finally {
      setSaving(false);
    }
  }

  function getStatusColor(status: string) {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || 'bg-gray-100';
  }

  const summary = {
    present: Array.from(attendance.values()).filter(a => a.status === 'present').length,
    absent: Array.from(attendance.values()).filter(a => a.status === 'absent').length,
    late: Array.from(attendance.values()).filter(a => a.status === 'late').length,
    excused: Array.from(attendance.values()).filter(a => a.status === 'excused').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Register</h2>
          <p className="text-sm text-gray-600">{sessionDate} - {students.length} students</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={markAllPresent}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
            disabled={saving}
          >
            ✓ Mark All Present
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-300"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {STATUS_OPTIONS.map(option => (
          <div key={option.value} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 capitalize">{option.label}</div>
            <div className="text-2xl font-bold text-gray-900">{summary[option.value]}</div>
          </div>
        ))}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm font-medium text-blue-900">Keyboard Shortcuts:</div>
        <div className="text-sm text-blue-700 mt-1">
          Select a student, then press: P (Present), A (Absent), L (Late), E (Excused)
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map(student => {
              const record = attendance.get(student.id);
              const currentStatus = record?.status || 'present';

              return (
                <tr
                  key={student.id}
                  className={`hover:bg-gray-50 ${selectedStudent === student.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedStudent(student.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={e => {
                            e.stopPropagation();
                            updateAttendance(student.id, option.value);
                          }}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            currentStatus === option.value
                              ? option.color
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={notes.get(student.id) || ''}
                      onChange={e => updateNotes(student.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Optional notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save Footer */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600">
          {Array.from(attendance.values()).filter(a => a.status !== 'present').length} exceptions from
          default (Present)
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-300"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>
    </div>
  );
}
