'use client';

/**
 * EditClassForm Component - Form to update an existing class
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface ClassData {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  subject: string | null;
  capacity: number;
  teacher_id: string | null;
  schedule_description: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
}

interface Props {
  classData: ClassData;
  teachers: Teacher[];
}

export function EditClassForm({ classData, teachers }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: classData.name,
    code: classData.code || '',
    level: classData.level || 'Beginner',
    subject: classData.subject || 'General English',
    capacity: classData.capacity,
    teacher_id: classData.teacher_id || '',
    schedule_description: classData.schedule_description || '',
    start_date: classData.start_date.split('T')[0], // Format for date input
    end_date: classData.end_date ? classData.end_date.split('T')[0] : '',
    status: classData.status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/classes/${classData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          teacher_id: formData.teacher_id || null,
          end_date: formData.end_date || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update class');
      }

      // Success - redirect to class detail page
      router.push(`/admin/classes/${classData.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Class Name */}
      <div className="mb-6">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Class Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., General English - Beginner Morning"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Class Code */}
      <div className="mb-6">
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
          Class Code
        </label>
        <input
          type="text"
          id="code"
          name="code"
          value={formData.code}
          onChange={handleChange}
          placeholder="e.g., GEN-B101"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Level and Subject */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
            Level *
          </label>
          <select
            id="level"
            name="level"
            required
            value={formData.level}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="Beginner">Beginner</option>
            <option value="Elementary">Elementary</option>
            <option value="Pre-Intermediate">Pre-Intermediate</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Upper-Intermediate">Upper-Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <select
            id="subject"
            name="subject"
            required
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="General English">General English</option>
            <option value="Business English">Business English</option>
            <option value="IELTS Preparation">IELTS Preparation</option>
            <option value="TOEFL Preparation">TOEFL Preparation</option>
            <option value="Academic English">Academic English</option>
            <option value="Conversation">Conversation</option>
            <option value="Grammar">Grammar</option>
            <option value="Pronunciation">Pronunciation</option>
          </select>
        </div>
      </div>

      {/* Capacity and Teacher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
            Capacity *
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            required
            min="1"
            max="50"
            value={formData.capacity}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700 mb-2">
            Assign Teacher
          </label>
          <select
            id="teacher_id"
            name="teacher_id"
            value={formData.teacher_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select teacher (optional)</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule Description */}
      <div className="mb-6">
        <label htmlFor="schedule_description" className="block text-sm font-medium text-gray-700 mb-2">
          Schedule *
        </label>
        <input
          type="text"
          id="schedule_description"
          name="schedule_description"
          required
          value={formData.schedule_description}
          onChange={handleChange}
          placeholder="e.g., Mon/Wed/Fri 09:00-11:00"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          Describe the class schedule (days and times)
        </p>
      </div>

      {/* Start and End Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            required
            value={formData.start_date}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
          <p className="mt-1 text-sm text-gray-500">Optional - leave empty for ongoing class</p>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6">
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
          Status *
        </label>
        <select
          id="status"
          name="status"
          required
          value={formData.status}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
