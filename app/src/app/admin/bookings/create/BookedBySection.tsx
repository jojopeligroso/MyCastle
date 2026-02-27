'use client';

import { useEffect, useRef, useCallback } from 'react';

export type BookedByType = 'self' | 'parent' | 'guardian' | 'other';

export interface BookedByData {
  type: BookedByType;
  name: string;
  email: string;
  phone: string;
}

interface Agency {
  id: string;
  name: string;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface Props {
  isMinor: boolean;
  selectedAgencyId: string;
  agencies: Agency[];
  bookedBy: BookedByData;
  onBookedByChange: (data: BookedByData) => void;
}

export function BookedBySection({
  isMinor,
  selectedAgencyId,
  agencies,
  bookedBy,
  onBookedByChange,
}: Props) {
  // Use refs to access current values without creating dependencies
  const bookedByRef = useRef(bookedBy);
  const onBookedByChangeRef = useRef(onBookedByChange);
  const agenciesRef = useRef(agencies);

  // Keep refs in sync
  useEffect(() => {
    bookedByRef.current = bookedBy;
    onBookedByChangeRef.current = onBookedByChange;
    agenciesRef.current = agencies;
  });

  // Auto-populate from agency when selected and type is 'other'
  useEffect(() => {
    const currentBookedBy = bookedByRef.current;
    if (selectedAgencyId && currentBookedBy.type === 'other') {
      const agency = agenciesRef.current.find(a => a.id === selectedAgencyId);
      if (agency && !currentBookedBy.name && !currentBookedBy.email) {
        onBookedByChangeRef.current({
          ...currentBookedBy,
          name: agency.contactPerson || '',
          email: agency.contactEmail || '',
          phone: agency.contactPhone || '',
        });
      }
    }
  }, [selectedAgencyId]);

  // If minor and type is 'self', force to 'parent'
  useEffect(() => {
    const currentBookedBy = bookedByRef.current;
    if (isMinor && currentBookedBy.type === 'self') {
      onBookedByChangeRef.current({ ...currentBookedBy, type: 'parent' });
    }
  }, [isMinor]);

  const handleTypeChange = useCallback(
    (type: BookedByType) => {
      // Pre-populate agency contact if selecting 'other' and agency is selected
      if (type === 'other' && selectedAgencyId) {
        const agency = agencies.find(a => a.id === selectedAgencyId);
        if (agency) {
          onBookedByChange({
            type,
            name: agency.contactPerson || '',
            email: agency.contactEmail || '',
            phone: agency.contactPhone || '',
          });
          return;
        }
      }

      // Clear contact fields when switching to self
      if (type === 'self') {
        onBookedByChange({ type, name: '', email: '', phone: '' });
      } else {
        onBookedByChange({ ...bookedBy, type });
      }
    },
    [selectedAgencyId, agencies, bookedBy, onBookedByChange]
  );

  const handleFieldChange = useCallback(
    (field: 'name' | 'email' | 'phone', value: string) => {
      onBookedByChange({ ...bookedBy, [field]: value });
    },
    [bookedBy, onBookedByChange]
  );

  const showContactForm = bookedBy.type !== 'self';
  const isContactRequired = isMinor || bookedBy.type !== 'self';

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Who is Making This Booking?</h2>

      {isMinor && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Required:</strong> Since the student is a minor, parent/guardian contact
            information is required.
          </p>
        </div>
      )}

      {/* Type Selection */}
      <div className="space-y-3 mb-6">
        <label className={`inline-flex items-center cursor-pointer ${isMinor ? 'opacity-50' : ''}`}>
          <input
            type="radio"
            name="bookedByType"
            value="self"
            checked={bookedBy.type === 'self'}
            onChange={() => handleTypeChange('self')}
            disabled={isMinor}
            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Student booking for themselves</span>
        </label>

        <label className="inline-flex items-center cursor-pointer ml-6">
          <input
            type="radio"
            name="bookedByType"
            value="parent"
            checked={bookedBy.type === 'parent'}
            onChange={() => handleTypeChange('parent')}
            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Parent/Guardian booking for student</span>
        </label>

        <label className="inline-flex items-center cursor-pointer ml-6">
          <input
            type="radio"
            name="bookedByType"
            value="other"
            checked={bookedBy.type === 'other'}
            onChange={() => handleTypeChange('other')}
            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Other (agency contact, etc.)</span>
        </label>
      </div>

      {/* Contact Form */}
      {showContactForm && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Contact Name {isContactRequired && '*'}
              </label>
              <input
                type="text"
                required={isContactRequired}
                value={bookedBy.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  bookedBy.type === 'parent'
                    ? "Parent/Guardian's full name"
                    : bookedBy.type === 'other'
                      ? 'Agency contact name'
                      : 'Contact name'
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email {isContactRequired && '*'}
              </label>
              <input
                type="email"
                required={isContactRequired}
                value={bookedBy.email}
                onChange={e => handleFieldChange('email', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={bookedBy.phone}
                onChange={e => handleFieldChange('phone', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="+353..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
