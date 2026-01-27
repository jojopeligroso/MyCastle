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

interface Programme {
  id: string;
  name: string;
  code: string;
}

interface ClassData {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  subject: string | null;
  capacity: number;
  teacherId: string | null;
  programmeId: string | null;
  scheduleDescription: string | null;
  startTime: string | null;
  endTime: string | null;
  breakDurationMinutes: number | null;
  daysOfWeek: string[];
  startDate: string;
  endDate: string | null;
  showCapacityPublicly: boolean | null;
  status: string;
  enrolledCount: number;
}

interface Props {
  classData: ClassData;
  teachers: Teacher[];
  programmes: Programme[];
}

export function EditClassForm({ classData, teachers, programmes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: classData.name,
    code: classData.code || '',
    level: classData.level || 'Beginner',
    subject: classData.subject || 'General English',
    capacity: classData.capacity,
    teacher_id: classData.teacherId || '',
    programme_id: classData.programmeId || '',
    schedule_description: classData.scheduleDescription || '',
    start_time: classData.startTime || '',
    end_time: classData.endTime || '',
    break_duration_minutes: classData.breakDurationMinutes || 0,
    days_of_week: classData.daysOfWeek || [],
    start_date: classData.startDate.split('T')[0], // Format for date input
    end_date: classData.endDate ? classData.endDate.split('T')[0] : '',
    show_capacity_publicly: classData.showCapacityPublicly ?? true,
    status: classData.status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate capacity isn't reduced below enrolled count
    if (formData.capacity < classData.enrolledCount) {
      setError(
        `Capacity cannot be reduced below ${classData.enrolledCount} (current enrollment count). Please unenroll students first.`
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/classes/${classData.id}`, {
        method: 'PUT',
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
    } catch (_err) {
      const error = err as Error;
      setError(error.message);
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox' && name === 'show_capacity_publicly') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (name === 'capacity' || name === 'break_duration_minutes') {
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

  const handleDayChange = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Enrollment warning */}
      {classData.enrolledCount > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          <p className="text-sm">
            <strong>Note:</strong> This class has {classData.enrolledCount} enrolled student
            {classData.enrolledCount > 1 ? 's' : ''}. Capacity cannot be reduced below this number.
          </p>
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

      {/* Programme Selection */}
      <div className="mb-6">
        <label htmlFor="programme_id" className="block text-sm font-medium text-gray-700 mb-2">
          Programme *
        </label>
        <select
          id="programme_id"
          name="programme_id"
          required
          value={formData.programme_id}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">Select a programme</option>
          {programmes.map(programme => (
            <option key={programme.id} value={programme.id}>
              {programme.name} ({programme.code})
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">Select the programme this class belongs to</p>
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
            min={classData.enrolledCount}
            max="50"
            value={formData.capacity}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Minimum: {classData.enrolledCount} (current enrollment)
          </p>
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

      {/* Capacity Visibility */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="show_capacity_publicly"
            checked={formData.show_capacity_publicly}
            onChange={handleChange}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Show capacity publicly on dashboards</span>
        </label>
        <p className="mt-1 ml-6 text-sm text-gray-500">
          Uncheck to hide capacity limits from public-facing dashboards
        </p>
      </div>

      {/* Days of Week */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week *</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {daysOfWeek.map(day => (
            <label key={day} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.days_of_week.includes(day)}
                onChange={() => handleDayChange(day)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{day}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-sm text-gray-500">Select the days this class runs</p>
      </div>

      {/* Start and End Times */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
            Start Time *
          </label>
          <input
            type="time"
            id="start_time"
            name="start_time"
            required
            value={formData.start_time}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
            End Time *
          </label>
          <input
            type="time"
            id="end_time"
            name="end_time"
            required
            value={formData.end_time}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label
            htmlFor="break_duration_minutes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Break (minutes)
          </label>
          <input
            type="number"
            id="break_duration_minutes"
            name="break_duration_minutes"
            min="0"
            max="60"
            value={formData.break_duration_minutes}
            onChange={handleChange}
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
          <p className="mt-1 text-sm text-gray-500">Optional break time</p>
        </div>
      </div>

      {/* Schedule Description */}
      <div className="mb-6">
        <label
          htmlFor="schedule_description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
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
        <p className="mt-1 text-sm text-gray-500">Describe the class schedule (days and times)</p>
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
