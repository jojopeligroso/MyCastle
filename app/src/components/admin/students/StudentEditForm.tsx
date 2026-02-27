'use client';

import { useState } from 'react';
import {
  updateStudent,
  type UpdateStudentData,
} from '@/app/admin/students/_actions/studentActions';

interface StudentEditFormProps {
  student: {
    id: string;
    userId?: string;
    studentId?: string;
    name: string | null;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | Date | null;
    nationality?: string | null;
    studentNumber?: string | null;
    isVisaStudent?: boolean | null;
    visaType?: string | null;
    visaExpiryDate?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelationship?: string | null;
    medicalConditions?: string | null;
    dietaryRequirements?: string | null;
    status?: string;
  };
  onSave: () => void;
  onCancel: () => void;
}

export function StudentEditForm({ student, onSave, onCancel }: StudentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: student.name || '',
    email: student.email || '',
    phone: student.phone || '',
    dateOfBirth: student.dateOfBirth
      ? typeof student.dateOfBirth === 'string'
        ? student.dateOfBirth.split('T')[0]
        : student.dateOfBirth.toISOString().split('T')[0]
      : '',
    nationality: student.nationality || '',
    studentNumber: student.studentNumber || '',
    isVisaStudent: student.isVisaStudent || false,
    visaType: student.visaType || '',
    visaExpiryDate: student.visaExpiryDate
      ? typeof student.visaExpiryDate === 'string'
        ? student.visaExpiryDate.split('T')[0]
        : ''
      : '',
    emergencyContactName: student.emergencyContactName || '',
    emergencyContactPhone: student.emergencyContactPhone || '',
    emergencyContactRelationship: student.emergencyContactRelationship || '',
    medicalConditions: student.medicalConditions || '',
    dietaryRequirements: student.dietaryRequirements || '',
    status: student.status || 'active',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const studentId = student.studentId || student.id;
      const updateData: UpdateStudentData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        date_of_birth: formData.dateOfBirth || undefined,
        nationality: formData.nationality || undefined,
        student_number: formData.studentNumber || undefined,
        is_visa_student: formData.isVisaStudent,
        visa_type: formData.visaType || undefined,
        visa_expiry_date: formData.visaExpiryDate || undefined,
        emergency_contact_name: formData.emergencyContactName || undefined,
        emergency_contact_phone: formData.emergencyContactPhone || undefined,
        emergency_contact_relationship: formData.emergencyContactRelationship || undefined,
        medical_conditions: formData.medicalConditions || undefined,
        dietary_requirements: formData.dietaryRequirements || undefined,
        status: formData.status as 'active' | 'inactive' | 'suspended' | 'archived',
      };

      const result = await updateStudent(studentId, updateData);

      if (result.success) {
        onSave();
      } else {
        setError(result.error || 'Failed to update student');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error updating student:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Leave empty if no email"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-xs font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="nationality" className="block text-xs font-medium text-gray-700 mb-1">
              Nationality
            </label>
            <input
              type="text"
              id="nationality"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="studentNumber" className="block text-xs font-medium text-gray-700 mb-1">
              Student Number
            </label>
            <input
              type="text"
              id="studentNumber"
              name="studentNumber"
              value={formData.studentNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="active">Active</option>
              <option value="course_completed">Course Completed</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </section>

      {/* Visa Information */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Visa Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isVisaStudent"
                checked={formData.isVisaStudent}
                onChange={handleChange}
                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Visa Student (Stamp 2)</span>
            </label>
          </div>

          {formData.isVisaStudent && (
            <>
              <div>
                <label htmlFor="visaType" className="block text-xs font-medium text-gray-700 mb-1">
                  Visa Type
                </label>
                <select
                  id="visaType"
                  name="visaType"
                  value={formData.visaType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select type</option>
                  <option value="First Time">First Time</option>
                  <option value="Renewal 1">Renewal 1</option>
                  <option value="Renewal 2">Renewal 2</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="visaExpiryDate"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Visa Expiry Date
                </label>
                <input
                  type="date"
                  id="visaExpiryDate"
                  name="visaExpiryDate"
                  value={formData.visaExpiryDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Emergency Contact */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Emergency Contact</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="emergencyContactName"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Contact Name
            </label>
            <input
              type="text"
              id="emergencyContactName"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label
              htmlFor="emergencyContactPhone"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Contact Phone
            </label>
            <input
              type="tel"
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="emergencyContactRelationship"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Relationship
            </label>
            <input
              type="text"
              id="emergencyContactRelationship"
              name="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Parent, Spouse, Sibling"
            />
          </div>
        </div>
      </section>

      {/* Medical & Dietary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Medical & Dietary Information</h3>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="medicalConditions"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Medical Conditions
            </label>
            <textarea
              id="medicalConditions"
              name="medicalConditions"
              rows={2}
              value={formData.medicalConditions}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Any medical conditions the school should be aware of"
            />
          </div>

          <div>
            <label
              htmlFor="dietaryRequirements"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Dietary Requirements
            </label>
            <textarea
              id="dietaryRequirements"
              name="dietaryRequirements"
              rows={2}
              value={formData.dietaryRequirements}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Vegetarian, Vegan, Allergies"
            />
          </div>
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
