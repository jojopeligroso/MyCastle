'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateStudent,
  getStudentEnrollments,
  getAvailableClasses,
  enrollStudentInClass,
  removeStudentEnrollment,
  type UpdateStudentData,
  type StudentEnrollment,
  type AvailableClass,
} from '@/app/admin/students/_actions/studentActions';

interface StudentEditPageFormProps {
  student: {
    id: string;
    userId: string;
    studentId: string;
    name: string | null;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | null;
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
  studentId: string;
}

export function StudentEditPageForm({ student, studentId }: StudentEditPageFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Class enrollment state
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(true);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Load enrollments and available classes
  useEffect(() => {
    async function loadEnrollmentData() {
      setIsLoadingEnrollments(true);
      try {
        const [enrollmentsResult, classesResult] = await Promise.all([
          getStudentEnrollments(studentId),
          getAvailableClasses(),
        ]);

        if (enrollmentsResult.success) {
          setEnrollments(enrollmentsResult.enrollments);
        }
        if (classesResult.success) {
          setAvailableClasses(classesResult.classes);
        }
      } catch (err) {
        console.error('Error loading enrollment data:', err);
      } finally {
        setIsLoadingEnrollments(false);
      }
    }

    loadEnrollmentData();
  }, [studentId]);

  const handleEnrollInClass = async () => {
    if (!selectedClassId) return;

    setIsEnrolling(true);
    setEnrollmentError(null);

    try {
      const result = await enrollStudentInClass(studentId, selectedClassId);
      if (result.success) {
        // Refresh enrollments
        const enrollmentsResult = await getStudentEnrollments(studentId);
        if (enrollmentsResult.success) {
          setEnrollments(enrollmentsResult.enrollments);
        }
        setSelectedClassId('');
      } else {
        setEnrollmentError(result.error || 'Failed to enroll');
      }
    } catch (err) {
      setEnrollmentError('An error occurred');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove this class enrollment?')) return;

    try {
      const result = await removeStudentEnrollment(enrollmentId);
      if (result.success) {
        setEnrollments(enrollments.filter(e => e.enrollment_id !== enrollmentId));
      } else {
        setEnrollmentError(result.error || 'Failed to remove enrollment');
      }
    } catch (err) {
      setEnrollmentError('An error occurred');
    }
  };

  const [formData, setFormData] = useState({
    name: student.name || '',
    email: student.email || '',
    phone: student.phone || '',
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
    nationality: student.nationality || '',
    studentNumber: student.studentNumber || '',
    isVisaStudent: student.isVisaStudent || false,
    visaType: student.visaType || '',
    visaExpiryDate: student.visaExpiryDate ? student.visaExpiryDate.split('T')[0] : '',
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
      const updateData: UpdateStudentData = {
        name: formData.name,
        email: formData.email || undefined,
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
        router.push(`/admin/students/${studentId}`);
        router.refresh();
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="studentNumber" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Visa Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                <label htmlFor="visaType" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="block text-sm font-medium text-gray-700 mb-1"
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
          Emergency Contact
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="emergencyContactName"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              className="block text-sm font-medium text-gray-700 mb-1"
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
              className="block text-sm font-medium text-gray-700 mb-1"
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
          Medical & Dietary Information
        </h3>
        <div className="space-y-6">
          <div>
            <label
              htmlFor="medicalConditions"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Medical Conditions
            </label>
            <textarea
              id="medicalConditions"
              name="medicalConditions"
              rows={3}
              value={formData.medicalConditions}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Any medical conditions the school should be aware of"
            />
          </div>

          <div>
            <label
              htmlFor="dietaryRequirements"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Dietary Requirements
            </label>
            <textarea
              id="dietaryRequirements"
              name="dietaryRequirements"
              rows={3}
              value={formData.dietaryRequirements}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Vegetarian, Vegan, Allergies"
            />
          </div>
        </div>
      </section>

      {/* Class Assignment */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Class Assignment</h3>

        {enrollmentError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {enrollmentError}
          </div>
        )}

        {/* Current Enrollments */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Current Classes</h4>
          {isLoadingEnrollments ? (
            <div className="text-sm text-gray-500">Loading enrollments...</div>
          ) : enrollments.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
              Not enrolled in any classes
            </div>
          ) : (
            <div className="space-y-2">
              {enrollments.map(enrollment => (
                <div
                  key={enrollment.enrollment_id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {enrollment.class_name}
                      {enrollment.class_code && (
                        <span className="ml-2 text-gray-500 text-sm">
                          ({enrollment.class_code})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {enrollment.class_level && <span>{enrollment.class_level} • </span>}
                      {enrollment.teacher_name && <span>{enrollment.teacher_name} • </span>}
                      {enrollment.schedule_description && (
                        <span>{enrollment.schedule_description}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Enrolled: {enrollment.enrollment_date}
                      {enrollment.expected_end_date && ` • Ends: ${enrollment.expected_end_date}`}
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded ${
                          enrollment.enrollment_status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {enrollment.enrollment_status}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEnrollment(enrollment.enrollment_id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add to Class */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Add to Class</h4>
          <div className="flex gap-3">
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              disabled={isLoadingEnrollments}
            >
              <option value="">Select a class...</option>
              {availableClasses
                .filter(c => !enrollments.some(e => e.class_id === c.id))
                .map(classItem => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                    {classItem.level && ` (${classItem.level})`}
                    {classItem.teacher_name && ` - ${classItem.teacher_name}`}
                    {` [${classItem.enrolled_count}/${classItem.capacity}]`}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleEnrollInClass}
              disabled={!selectedClassId || isEnrolling}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEnrolling ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.push(`/admin/students/${studentId}`)}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
