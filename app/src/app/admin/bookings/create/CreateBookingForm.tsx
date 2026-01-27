'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking } from './actions';

interface Student {
  id: string;
  name: string;
  studentNumber: string | null;
}

interface Course {
  id: string;
  name: string;
  level: string | null;
  pricePerWeekEur: string | null;
}

interface AccommodationType {
  id: string;
  name: string;
  pricePerWeekEur: string | null;
}

interface Agency {
  id: string;
  name: string;
}

interface Props {
  students: Student[];
  courses: Course[];
  accommodationTypes: AccommodationType[];
  agencies: Agency[];
  tenantId: string;
}

export function CreateBookingForm({
  students,
  courses,
  accommodationTypes,
  agencies,
  tenantId,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [agencyId, setAgencyId] = useState(agencies[0]?.id || '');
  const [accommodationTypeId, setAccommodationTypeId] = useState('');
  const [weeks, setWeeks] = useState('12');
  const [courseStartDate, setCourseStartDate] = useState('');
  const [courseEndDate, setCourseEndDate] = useState('');

  // Financial fields
  const [courseFee, setCourseFee] = useState('0');
  const [accommodationFee, setAccommodationFee] = useState('0');
  const [registrationFee, setRegistrationFee] = useState('75');
  const [learnerProtectionFee, setLearnerProtectionFee] = useState('45');
  const [medicalInsuranceFee, setMedicalInsuranceFee] = useState('0');
  const [depositPaid, setDepositPaid] = useState('1000');

  // Calculate total
  const totalBooking = (
    parseFloat(courseFee) +
    parseFloat(accommodationFee) +
    parseFloat(registrationFee) +
    parseFloat(learnerProtectionFee) +
    parseFloat(medicalInsuranceFee)
  ).toFixed(2);

  // Auto-calculate course fee when course/weeks change
  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    const course = courses.find(c => c.id === newCourseId);
    if (course && course.pricePerWeekEur) {
      const fee = (parseFloat(course.pricePerWeekEur) * parseFloat(weeks || '1')).toFixed(2);
      setCourseFee(fee);
    }
  };

  const handleWeeksChange = (newWeeks: string) => {
    setWeeks(newWeeks);
    const course = courses.find(c => c.id === courseId);
    if (course && course.pricePerWeekEur && newWeeks) {
      const fee = (parseFloat(course.pricePerWeekEur) * parseFloat(newWeeks)).toFixed(2);
      setCourseFee(fee);
    }
  };

  // Auto-calculate accommodation fee
  const handleAccommodationChange = (newAccomId: string) => {
    setAccommodationTypeId(newAccomId);
    if (!newAccomId) {
      setAccommodationFee('0');
      return;
    }
    const accom = accommodationTypes.find(a => a.id === newAccomId);
    if (accom && accom.pricePerWeekEur) {
      const fee = (parseFloat(accom.pricePerWeekEur) * parseFloat(weeks || '1')).toFixed(2);
      setAccommodationFee(fee);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createBooking({
        tenantId,
        studentId,
        courseId,
        agencyId,
        accommodationTypeId: accommodationTypeId || null,
        weeks: parseInt(weeks),
        courseStartDate,
        courseEndDate,
        courseFeeEur: courseFee,
        accommodationFeeEur: accommodationFee,
        registrationFeeEur: registrationFee,
        learnerProtectionFeeEur: learnerProtectionFee,
        medicalInsuranceFeeEur: medicalInsuranceFee,
        totalBookingEur: totalBooking,
        depositPaidEur: depositPaid,
      });

      if (result.success) {
        router.push('/admin/bookings');
      } else {
        setError(result.error || 'Failed to create booking');
      }
    } catch (_err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Student & Course Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Student & Course Details</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Student *</label>
            <select
              required
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">Select a student</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.studentNumber && `(${s.studentNumber})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Course *</label>
            <select
              required
              value={courseId}
              onChange={e => handleCourseChange(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">Select a course</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level}) - €{c.pricePerWeekEur}/week
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Agency *</label>
            <select
              required
              value={agencyId}
              onChange={e => setAgencyId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              {agencies.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Accommodation (Optional)
            </label>
            <select
              value={accommodationTypeId}
              onChange={e => handleAccommodationChange(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">None</option>
              {accommodationTypes.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} - €{a.pricePerWeekEur}/week
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dates Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Course Dates</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Weeks *</label>
            <input
              type="number"
              required
              min="1"
              value={weeks}
              onChange={e => handleWeeksChange(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date *</label>
            <input
              type="date"
              required
              value={courseStartDate}
              onChange={e => setCourseStartDate(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Date *</label>
            <input
              type="date"
              required
              value={courseEndDate}
              onChange={e => setCourseEndDate(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Financial Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Breakdown (EUR)</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Course Fee</label>
            <input
              type="number"
              step="0.01"
              value={courseFee}
              onChange={e => setCourseFee(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Accommodation Fee</label>
            <input
              type="number"
              step="0.01"
              value={accommodationFee}
              onChange={e => setAccommodationFee(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Fee</label>
            <input
              type="number"
              step="0.01"
              value={registrationFee}
              onChange={e => setRegistrationFee(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Learner Protection Fee
            </label>
            <input
              type="number"
              step="0.01"
              value={learnerProtectionFee}
              onChange={e => setLearnerProtectionFee(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Medical Insurance Fee</label>
            <input
              type="number"
              step="0.01"
              value={medicalInsuranceFee}
              onChange={e => setMedicalInsuranceFee(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Deposit Paid</label>
            <input
              type="number"
              step="0.01"
              value={depositPaid}
              onChange={e => setDepositPaid(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900">Total Booking:</span>
            <span className="text-2xl font-bold text-gray-900">€{totalBooking}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push('/admin/bookings')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Booking'}
        </button>
      </div>
    </form>
  );
}
