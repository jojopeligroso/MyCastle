/**
 * Enroll Student Form Component
 * Form for enrolling a student in a class with capacity validation
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  code?: string;
  level?: string;
  capacity: number;
  enrolledCount: number;
  startDate?: string;
  endDate?: string;
}

export default function EnrollStudentForm() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch students and classes on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch students with role=student
        const studentsRes = await fetch('/api/admin/users?role=student');
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(studentsData.users || []);
        }

        // Fetch active classes
        const classesRes = await fetch('/api/admin/classes?status=active');
        if (classesRes.ok) {
          const classesData = await classesRes.json();
          setClasses(classesData.classes || []);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    }

    fetchData();
  }, []);

  // Update dates when class is selected
  useEffect(() => {
    if (selectedClassId) {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass) {
        if (selectedClass.startDate) {
          setStartDate(selectedClass.startDate);
        }
        if (selectedClass.endDate) {
          setEndDate(selectedClass.endDate);
        }
      }
    }
  }, [selectedClassId, classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: selectedStudentId,
          class_id: selectedClassId,
          start_date: startDate,
          end_date: endDate || undefined,
          status: 'active',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create enrollment');
      }

      // Success - redirect to enrollments list
      router.push('/admin/enrolments');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const capacityRemaining = selectedClass
    ? selectedClass.capacity - selectedClass.enrolledCount
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Student Selector */}
      <div>
        <label htmlFor="student" className="block text-sm font-medium text-gray-700">
          Student <span className="text-red-500">*</span>
        </label>
        <select
          id="student"
          value={selectedStudentId}
          onChange={e => setSelectedStudentId(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select a student...</option>
          {students.map(student => (
            <option key={student.id} value={student.id}>
              {student.name} ({student.email})
            </option>
          ))}
        </select>
      </div>

      {/* Class Selector */}
      <div>
        <label htmlFor="class" className="block text-sm font-medium text-gray-700">
          Class <span className="text-red-500">*</span>
        </label>
        <select
          id="class"
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
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

      {/* Start Date */}
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
          Start Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* End Date */}
      <div>
        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
          Expected End Date
        </label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">Optional - defaults to class end date</p>
      </div>

      {/* Enrollment Date (Display Only) */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Enrollment Date</label>
        <p className="mt-1 text-sm text-gray-900">{new Date().toLocaleDateString()}</p>
        <p className="mt-1 text-sm text-gray-500">Will be set to today&apos;s date</p>
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => router.push('/admin/enrolments')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !selectedStudentId || !selectedClassId || !startDate}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enrolling...' : 'Enroll Student'}
        </button>
      </div>
    </form>
  );
}
