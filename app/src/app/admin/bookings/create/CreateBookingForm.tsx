'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking } from './actions';
import { StudentSelector } from './StudentSelector';
import { BookedBySection, BookedByData } from './BookedBySection';

interface Student {
  id: string;
  name: string | null;
  email: string;
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
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface FeePreset {
  id: string;
  feeType: string;
  label: string;
  amountEur: string;
  isDefault: boolean | null;
}

interface AccommodationPreset {
  id: string;
  name: string;
  pricePerWeekEur: string;
  isDefault: boolean | null;
}

interface NewStudentData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  isMinor: boolean;
  cefrLevel: string;
  nationality: string;
}

interface Props {
  students: Student[];
  courses: Course[];
  accommodationTypes: AccommodationType[];
  agencies: Agency[];
  tenantId: string;
  feePresets?: FeePreset[];
  accommodationPresets?: AccommodationPreset[];
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VISA_TYPES = ['First Time', 'Renewal 1', 'Renewal 2', 'N/A'];

export function CreateBookingForm({
  students,
  courses,
  accommodationTypes,
  agencies,
  tenantId,
  feePresets = [],
  accommodationPresets = [],
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student state
  const [studentId, setStudentId] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState<NewStudentData | null>(null);
  const [isMinor, setIsMinor] = useState(false);

  // Booked By state
  const [bookedBy, setBookedBy] = useState<BookedByData>({
    type: 'self',
    name: '',
    email: '',
    phone: '',
  });

  // Course/Booking state
  const [courseId, setCourseId] = useState('');
  const [agencyId, setAgencyId] = useState(agencies[0]?.id || '');
  const [accommodationTypeId, setAccommodationTypeId] = useState('');
  const [weeks, setWeeks] = useState('12');
  const [courseStartDate, setCourseStartDate] = useState('');
  const [courseEndDate, setCourseEndDate] = useState('');

  // NEW: Academic fields
  const [placementTestScore, setPlacementTestScore] = useState('');
  const [assignedLevel, setAssignedLevel] = useState('');

  // NEW: Accommodation dates (optional - blank = TBC)
  const [accommodationStartDate, setAccommodationStartDate] = useState('');
  const [accommodationEndDate, setAccommodationEndDate] = useState('');

  // NEW: Visa/Nationality fields for booking (optional section)
  const [nationality, setNationality] = useState('');
  const [visaType, setVisaType] = useState('');
  const [visaExpiryDate, setVisaExpiryDate] = useState('');

  // Financial fields
  const [courseFee, setCourseFee] = useState('0');
  const [accommodationFee, setAccommodationFee] = useState('0');
  const [transferFee, setTransferFee] = useState('0');
  const [examFee, setExamFee] = useState('0');
  const [registrationFee, setRegistrationFee] = useState('75');
  const [learnerProtectionFee, setLearnerProtectionFee] = useState('130');
  const [medicalInsuranceFee, setMedicalInsuranceFee] = useState('0');
  const [depositPaid, setDepositPaid] = useState('1000');

  // Helper to get presets by type
  const getPresetsByType = (type: string) =>
    feePresets.filter(p => p.feeType === type);

  const registrationPresets = getPresetsByType('registration');
  const learnerProtectionPresets = getPresetsByType('learner_protection');
  const transferPresets = getPresetsByType('transfer');
  const examPresets = getPresetsByType('exam');

  // Initialize fee values from default presets
  useEffect(() => {
    const defaultReg = registrationPresets.find(p => p.isDefault);
    const defaultLp = learnerProtectionPresets.find(p => p.isDefault);
    const defaultTransfer = transferPresets.find(p => p.isDefault);
    const defaultExam = examPresets.find(p => p.isDefault);

    if (defaultReg) setRegistrationFee(defaultReg.amountEur);
    if (defaultLp) setLearnerProtectionFee(defaultLp.amountEur);
    if (defaultTransfer) setTransferFee(defaultTransfer.amountEur);
    if (defaultExam) setExamFee(defaultExam.amountEur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feePresets]);

  // Calculate total
  const totalBooking = (
    parseFloat(courseFee || '0') +
    parseFloat(accommodationFee || '0') +
    parseFloat(transferFee || '0') +
    parseFloat(examFee || '0') +
    parseFloat(registrationFee || '0') +
    parseFloat(learnerProtectionFee || '0') +
    parseFloat(medicalInsuranceFee || '0')
  ).toFixed(2);

  // Handle student selection
  const handleStudentSelect = (id: string | null, student: NewStudentData | null) => {
    setStudentId(id);
    setNewStudent(student);
  };

  const handleMinorStatusChange = (minor: boolean) => {
    setIsMinor(minor);
    if (minor && bookedBy.type === 'self') {
      setBookedBy({ ...bookedBy, type: 'parent' });
    }
  };

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
    // Also recalculate accommodation fee
    if (accommodationTypeId) {
      const accom = accommodationTypes.find(a => a.id === accommodationTypeId);
      if (accom && accom.pricePerWeekEur && newWeeks) {
        const accomFee = (parseFloat(accom.pricePerWeekEur) * parseFloat(newWeeks)).toFixed(2);
        setAccommodationFee(accomFee);
      }
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

  // Handle fee preset selection
  const handleFeePresetChange = (presetId: string, setter: (v: string) => void, presets: FeePreset[]) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setter(preset.amountEur);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (!studentId && !newStudent) {
      setError('Please select an existing student or create a new one');
      setIsSubmitting(false);
      return;
    }

    if (newStudent && (!newStudent.name || !newStudent.email)) {
      setError('Please provide name and email for the new student');
      setIsSubmitting(false);
      return;
    }

    if (isMinor && bookedBy.type === 'self') {
      setError('Minor students require a parent/guardian or other contact');
      setIsSubmitting(false);
      return;
    }

    if (bookedBy.type !== 'self' && (!bookedBy.name || !bookedBy.email)) {
      setError('Please provide contact name and email for the booking contact');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createBooking({
        tenantId,
        studentId: studentId || undefined,
        newStudent: newStudent
          ? {
              name: newStudent.name,
              email: newStudent.email,
              phone: newStudent.phone || undefined,
              dateOfBirth: newStudent.dateOfBirth || undefined,
              isMinor: newStudent.isMinor,
              cefrLevel: newStudent.cefrLevel || undefined,
              nationality: newStudent.nationality || nationality || undefined,
            }
          : undefined,
        bookedBy:
          bookedBy.type !== 'self'
            ? {
                type: bookedBy.type,
                name: bookedBy.name,
                email: bookedBy.email,
                phone: bookedBy.phone || undefined,
              }
            : undefined,
        courseId,
        agencyId,
        accommodationTypeId: accommodationTypeId || null,
        weeks: parseInt(weeks),
        courseStartDate: courseStartDate || undefined,
        courseEndDate: courseEndDate || undefined,
        // NEW fields
        placementTestScore: placementTestScore || undefined,
        assignedLevel: assignedLevel || undefined,
        accommodationStartDate: accommodationStartDate || undefined,
        accommodationEndDate: accommodationEndDate || undefined,
        // Financial
        courseFeeEur: courseFee,
        accommodationFeeEur: accommodationFee,
        transferFeeEur: transferFee,
        examFeeEur: examFee,
        registrationFeeEur: registrationFee,
        learnerProtectionFeeEur: learnerProtectionFee,
        medicalInsuranceFeeEur: medicalInsuranceFee,
        totalBookingEur: totalBooking,
        depositPaidEur: depositPaid,
        // Visa info (for student record update)
        nationality: nationality || undefined,
        visaType: visaType || undefined,
        visaExpiryDate: visaExpiryDate || undefined,
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

      {/* Student Selection Section */}
      <StudentSelector
        students={students}
        onStudentSelect={handleStudentSelect}
        onMinorStatusChange={handleMinorStatusChange}
      />

      {/* Booked By Section */}
      <BookedBySection
        isMinor={isMinor}
        selectedAgencyId={agencyId}
        agencies={agencies}
        bookedBy={bookedBy}
        onBookedByChange={setBookedBy}
      />

      {/* Course Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Course Details</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                  {c.name} ({c.level}) - &euro;{c.pricePerWeekEur}/week
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
            <label className="block text-sm font-medium text-gray-700">Placement Test Score</label>
            <input
              type="text"
              value={placementTestScore}
              onChange={e => setPlacementTestScore(e.target.value)}
              placeholder="e.g., 42/60"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Assigned Level</label>
            <select
              value={assignedLevel}
              onChange={e => setAssignedLevel(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">Select level</option>
              {CEFR_LEVELS.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dates Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Course Dates</h2>
        <p className="text-sm text-gray-500 mb-4">Leave date fields blank for &quot;TBC&quot; (to be confirmed)</p>
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
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={courseStartDate}
              onChange={e => setCourseStartDate(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank for TBC</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={courseEndDate}
              onChange={e => setCourseEndDate(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank for TBC</p>
          </div>
        </div>
      </div>

      {/* Accommodation Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Accommodation</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Accommodation Type</label>
            <select
              value={accommodationTypeId}
              onChange={e => handleAccommodationChange(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">None</option>
              {/* Use accommodation presets if available, otherwise fall back to accommodationTypes */}
              {accommodationPresets.length > 0
                ? accommodationPresets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} - &euro;{a.pricePerWeekEur}/week
                    </option>
                  ))
                : accommodationTypes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} - &euro;{a.pricePerWeekEur}/week
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Accommodation Start Date
            </label>
            <input
              type="date"
              value={accommodationStartDate}
              onChange={e => setAccommodationStartDate(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank for TBC</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Accommodation End Date
            </label>
            <input
              type="date"
              value={accommodationEndDate}
              onChange={e => setAccommodationEndDate(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank for TBC</p>
          </div>
        </div>
      </div>

      {/* Visa & Nationality Section (Optional) */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Visa & Nationality</h2>
        <p className="text-sm text-gray-500 mb-4">Optional - Can also be edited on student profile</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nationality</label>
            <input
              type="text"
              value={nationality}
              onChange={e => setNationality(e.target.value)}
              placeholder="e.g., Brazilian"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Visa Type</label>
            <select
              value={visaType}
              onChange={e => setVisaType(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">Select type</option>
              {VISA_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Visa Expiry Date</label>
            <input
              type="date"
              value={visaExpiryDate}
              onChange={e => setVisaExpiryDate(e.target.value)}
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

          {/* Registration Fee with Preset Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Fee</label>
            {registrationPresets.length > 0 ? (
              <div className="flex gap-2 mt-1">
                <select
                  onChange={e => handleFeePresetChange(e.target.value, setRegistrationFee, registrationPresets)}
                  className="block w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                >
                  <option value="">Select preset</option>
                  {registrationPresets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} (&euro;{parseFloat(p.amountEur).toFixed(2)})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={registrationFee}
                  onChange={e => setRegistrationFee(e.target.value)}
                  className="block w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <input
                type="number"
                step="0.01"
                value={registrationFee}
                onChange={e => setRegistrationFee(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* Learner Protection Fee with Preset Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Learner Protection</label>
            {learnerProtectionPresets.length > 0 ? (
              <div className="flex gap-2 mt-1">
                <select
                  onChange={e => handleFeePresetChange(e.target.value, setLearnerProtectionFee, learnerProtectionPresets)}
                  className="block w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                >
                  <option value="">Select preset</option>
                  {learnerProtectionPresets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} (&euro;{parseFloat(p.amountEur).toFixed(2)})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={learnerProtectionFee}
                  onChange={e => setLearnerProtectionFee(e.target.value)}
                  className="block w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <input
                type="number"
                step="0.01"
                value={learnerProtectionFee}
                onChange={e => setLearnerProtectionFee(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* Transfer Fee with Preset Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Transfer Fee</label>
            {transferPresets.length > 0 ? (
              <div className="flex gap-2 mt-1">
                <select
                  onChange={e => handleFeePresetChange(e.target.value, setTransferFee, transferPresets)}
                  className="block w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                >
                  <option value="">Select preset</option>
                  {transferPresets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} (&euro;{parseFloat(p.amountEur).toFixed(2)})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={transferFee}
                  onChange={e => setTransferFee(e.target.value)}
                  className="block w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <input
                type="number"
                step="0.01"
                value={transferFee}
                onChange={e => setTransferFee(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* Exam Fee with Preset Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Exam Fee</label>
            {examPresets.length > 0 ? (
              <div className="flex gap-2 mt-1">
                <select
                  onChange={e => handleFeePresetChange(e.target.value, setExamFee, examPresets)}
                  className="block w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                >
                  <option value="">Select preset</option>
                  {examPresets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} (&euro;{parseFloat(p.amountEur).toFixed(2)})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={examFee}
                  onChange={e => setExamFee(e.target.value)}
                  className="block w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <input
                type="number"
                step="0.01"
                value={examFee}
                onChange={e => setExamFee(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            )}
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
            <span className="text-2xl font-bold text-gray-900">&euro;{totalBooking}</span>
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
