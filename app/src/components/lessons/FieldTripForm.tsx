'use client';

import { useState } from 'react';
import type { FieldTrip } from '@/lib/lessons/chat-types';

interface FieldTripFormProps {
  onSave: (fieldTrip: FieldTrip) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<FieldTrip>;
}

export default function FieldTripForm({
  onSave,
  onCancel,
  isSaving = false,
  initialData,
}: FieldTripFormProps) {
  const [formData, setFormData] = useState<Partial<FieldTrip>>({
    location: initialData?.location || '',
    venueName: initialData?.venueName || '',
    date: initialData?.date || '',
    departureTime: initialData?.departureTime || '',
    returnTime: initialData?.returnTime || '',
    educationalObjectives: initialData?.educationalObjectives || [''],
    cefrAlignment: initialData?.cefrAlignment || [''],
    riskAssessment: initialData?.riskAssessment || '',
    permissionsRequired: initialData?.permissionsRequired || [''],
    transport: initialData?.transport || '',
    emergencyContact: initialData?.emergencyContact || '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleArrayChange = (
    field: 'educationalObjectives' | 'cefrAlignment' | 'permissionsRequired',
    index: number,
    value: string
  ) => {
    setFormData(prev => {
      const arr = [...(prev[field] || [])];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = (
    field: 'educationalObjectives' | 'cefrAlignment' | 'permissionsRequired'
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), ''],
    }));
  };

  const removeArrayItem = (
    field: 'educationalObjectives' | 'cefrAlignment' | 'permissionsRequired',
    index: number
  ) => {
    setFormData(prev => {
      const arr = [...(prev[field] || [])];
      arr.splice(index, 1);
      return { ...prev, [field]: arr.length > 0 ? arr : [''] };
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.location?.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.venueName?.trim()) {
      newErrors.venueName = 'Venue name is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.departureTime) {
      newErrors.departureTime = 'Departure time is required';
    }
    if (!formData.returnTime) {
      newErrors.returnTime = 'Return time is required';
    }
    if (!formData.transport?.trim()) {
      newErrors.transport = 'Transport details are required';
    }
    if (!formData.emergencyContact?.trim()) {
      newErrors.emergencyContact = 'Emergency contact is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSave({
      location: formData.location!,
      venueName: formData.venueName!,
      date: formData.date!,
      departureTime: formData.departureTime!,
      returnTime: formData.returnTime!,
      educationalObjectives: formData.educationalObjectives?.filter(Boolean) || [],
      cefrAlignment: formData.cefrAlignment?.filter(Boolean) || [],
      riskAssessment: formData.riskAssessment || '',
      permissionsRequired: formData.permissionsRequired?.filter(Boolean) || [],
      transport: formData.transport!,
      emergencyContact: formData.emergencyContact!,
      notes: formData.notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-2xl sm:w-full mx-4">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Field Trip Details
                </h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Location & Venue */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Dublin City Centre"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.location ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.location && (
                      <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      name="venueName"
                      value={formData.venueName}
                      onChange={handleChange}
                      placeholder="e.g., National Museum of Ireland"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.venueName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.venueName && (
                      <p className="text-red-500 text-xs mt-1">{errors.venueName}</p>
                    )}
                  </div>
                </div>

                {/* Date & Times */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.date ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.date && (
                      <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departure Time *
                    </label>
                    <input
                      type="time"
                      name="departureTime"
                      value={formData.departureTime}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.departureTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.departureTime && (
                      <p className="text-red-500 text-xs mt-1">{errors.departureTime}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Return Time *
                    </label>
                    <input
                      type="time"
                      name="returnTime"
                      value={formData.returnTime}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.returnTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.returnTime && (
                      <p className="text-red-500 text-xs mt-1">{errors.returnTime}</p>
                    )}
                  </div>
                </div>

                {/* Educational Objectives */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Educational Objectives
                  </label>
                  {formData.educationalObjectives?.map((obj, idx) => (
                    <div key={idx} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={e =>
                          handleArrayChange('educationalObjectives', idx, e.target.value)
                        }
                        placeholder="e.g., Practice describing historical artifacts"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('educationalObjectives', idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('educationalObjectives')}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add objective
                  </button>
                </div>

                {/* CEFR Alignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEFR Alignment
                  </label>
                  {formData.cefrAlignment?.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={item}
                        onChange={e =>
                          handleArrayChange('cefrAlignment', idx, e.target.value)
                        }
                        placeholder="e.g., B1 Speaking: Can describe experiences"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('cefrAlignment', idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('cefrAlignment')}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add CEFR descriptor
                  </button>
                </div>

                {/* Transport & Emergency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transport Arrangements *
                    </label>
                    <input
                      type="text"
                      name="transport"
                      value={formData.transport}
                      onChange={handleChange}
                      placeholder="e.g., Dublin Bus, private coach"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.transport ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.transport && (
                      <p className="text-red-500 text-xs mt-1">{errors.transport}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact *
                    </label>
                    <input
                      type="text"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      placeholder="e.g., School office: 01 234 5678"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.emergencyContact ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.emergencyContact && (
                      <p className="text-red-500 text-xs mt-1">{errors.emergencyContact}</p>
                    )}
                  </div>
                </div>

                {/* Risk Assessment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Risk Assessment Notes
                  </label>
                  <textarea
                    name="riskAssessment"
                    value={formData.riskAssessment}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Note any risks and mitigation measures..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Permissions Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permissions Required
                  </label>
                  {formData.permissionsRequired?.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={item}
                        onChange={e =>
                          handleArrayChange('permissionsRequired', idx, e.target.value)
                        }
                        placeholder="e.g., Parent consent form"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('permissionsRequired', idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('permissionsRequired')}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add permission
                  </button>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Any other relevant information..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Field Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
