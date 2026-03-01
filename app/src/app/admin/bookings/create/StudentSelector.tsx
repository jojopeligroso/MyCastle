'use client';

import { useState, useMemo } from 'react';

interface Student {
  id: string;
  name: string | null;
  email: string;
  studentNumber: string | null;
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
  onStudentSelect: (studentId: string | null, newStudent: NewStudentData | null) => void;
  onMinorStatusChange: (isMinor: boolean) => void;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function StudentSelector({ students, onStudentSelect, onMinorStatusChange }: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // New student form state
  const [newStudent, setNewStudent] = useState<NewStudentData>({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    isMinor: false,
    cefrLevel: '',
    nationality: '',
  });

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      s =>
        s.name?.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.studentNumber?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  // Get selected student display text
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const displayText = selectedStudent
    ? `${selectedStudent.name || 'Unknown'} ${selectedStudent.studentNumber ? `(${selectedStudent.studentNumber})` : ''}`
    : '';

  // Calculate if student is minor based on date of birth
  const calculateIsMinor = (dob: string): boolean => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 < 18;
    }
    return age < 18;
  };

  const handleModeChange = (newMode: 'existing' | 'new') => {
    setMode(newMode);
    if (newMode === 'existing') {
      onStudentSelect(selectedStudentId || null, null);
      onMinorStatusChange(false);
    } else {
      setSelectedStudentId('');
      setSearchQuery('');
      onStudentSelect(null, newStudent.name ? newStudent : null);
      onMinorStatusChange(newStudent.isMinor);
    }
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowDropdown(false);
    setSearchQuery('');
    onStudentSelect(studentId, null);
    onMinorStatusChange(false); // Existing students - minor status handled elsewhere
  };

  const handleNewStudentChange = (field: keyof NewStudentData, value: string | boolean) => {
    const updated = { ...newStudent, [field]: value };

    // Auto-calculate minor status from DOB
    if (field === 'dateOfBirth' && typeof value === 'string') {
      const isMinor = calculateIsMinor(value);
      updated.isMinor = isMinor;
      onMinorStatusChange(isMinor);
    }

    // Manual override of minor status
    if (field === 'isMinor' && typeof value === 'boolean') {
      onMinorStatusChange(value);
    }

    setNewStudent(updated);

    // Only propagate if we have at least name and email
    if (updated.name && updated.email) {
      onStudentSelect(null, updated);
    } else {
      onStudentSelect(null, null);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Student</h2>

      {/* Mode Toggle */}
      <div className="flex space-x-4 mb-6">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            name="studentMode"
            checked={mode === 'existing'}
            onChange={() => handleModeChange('existing')}
            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Select existing student</span>
        </label>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            name="studentMode"
            checked={mode === 'new'}
            onChange={() => handleModeChange('new')}
            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Create new student</span>
        </label>
      </div>

      {mode === 'existing' ? (
        /* Existing Student - Searchable Dropdown */
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
          <div className="relative">
            <input
              type="text"
              value={showDropdown ? searchQuery : displayText}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => {
                // Delay to allow click on dropdown item
                setTimeout(() => setShowDropdown(false), 200);
              }}
              placeholder="Search by name, email, or student number..."
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            />
            {selectedStudentId && !showDropdown && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentId('');
                  setSearchQuery('');
                  onStudentSelect(null, null);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
              {filteredStudents.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">No students found</div>
              ) : (
                filteredStudents.map(student => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleStudentSelect(student.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${
                      student.id === selectedStudentId ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{student.name || 'Unknown'}</div>
                    <div className="text-gray-500 text-xs">
                      {student.email}
                      {student.studentNumber && ` • ${student.studentNumber}`}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* New Student - Inline Form */
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                required
                value={newStudent.name}
                onChange={e => handleNewStudentChange('name', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                required
                value={newStudent.email}
                onChange={e => handleNewStudentChange('email', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="student@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={newStudent.phone}
                onChange={e => handleNewStudentChange('phone', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="+353..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={newStudent.dateOfBirth}
                onChange={e => handleNewStudentChange('dateOfBirth', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">CEFR Level</label>
              <select
                value={newStudent.cefrLevel}
                onChange={e => handleNewStudentChange('cefrLevel', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="">Optional</option>
                {CEFR_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={newStudent.isMinor}
                  onChange={e => handleNewStudentChange('isMinor', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">This is a minor (under 18)</span>
              </label>
            </div>
          </div>

          {newStudent.isMinor && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Since this student is a minor, you will need to provide
                parent/guardian contact information below.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
