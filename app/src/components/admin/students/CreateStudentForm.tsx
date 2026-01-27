'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStudent } from '@/app/admin/students/_actions/studentActions';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

type LevelAssignmentMethod = 'manual' | 'diagnostic';

export function CreateStudentForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [levelMethod, setLevelMethod] = useState<LevelAssignmentMethod>('manual');

  // Manual level assignment
  const [currentLevel, setCurrentLevel] = useState<string>('');
  const [initialLevel, setInitialLevel] = useState<string>('');

  // Diagnostic test
  const [diagnosticScore, setDiagnosticScore] = useState('');
  const [diagnosticMaxScore, setDiagnosticMaxScore] = useState('100');
  const [suggestedLevel, setSuggestedLevel] = useState<string>('');

  // Visa info
  const [visaType, setVisaType] = useState('');
  const [visaExpiry, setVisaExpiry] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!name || !email) {
        throw new Error('Name and email are required');
      }

      if (levelMethod === 'manual' && !currentLevel) {
        throw new Error('Please select a current level');
      }

      if (levelMethod === 'diagnostic' && (!diagnosticScore || !suggestedLevel)) {
        throw new Error('Please enter diagnostic test score and suggested level');
      }

      // Prepare data
      const data: unknown = {
        name,
        email,
        phone: phone || undefined,
        visa_type: visaType || undefined,
        visa_expiry: visaExpiry || undefined,
      };

      if (levelMethod === 'manual') {
        data.current_level = currentLevel;
        data.initial_level = initialLevel || currentLevel;
        data.level_status = 'confirmed';
      } else {
        data.diagnostic_test = {
          score: parseInt(diagnosticScore, 10),
          max_score: parseInt(diagnosticMaxScore, 10),
          suggested_level: suggestedLevel,
        };
      }

      const result = await createStudent(data);

      if (result.success) {
        // Redirect to student registry
        router.push('/admin/students');
      } else {
        throw new Error(result.error || 'Failed to create student');
      }
    } catch (_err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Maria Garcia"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="student@example.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="+44 7700 900000"
            />
          </div>
        </div>
      </section>

      {/* Level Assignment */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">CEFR Level Assignment</h2>

        {/* Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How would you like to assign the student level?
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-purple-300 transition-colors">
              <input
                type="radio"
                name="levelMethod"
                value="manual"
                checked={levelMethod === 'manual'}
                onChange={e => setLevelMethod(e.target.value as LevelAssignmentMethod)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Manual Level Selection</div>
                <div className="text-sm text-gray-500 mt-1">
                  Directly assign a CEFR level. The level status will be set to
                  &quot;confirmed&quot;.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-purple-300 transition-colors">
              <input
                type="radio"
                name="levelMethod"
                value="diagnostic"
                checked={levelMethod === 'diagnostic'}
                onChange={e => setLevelMethod(e.target.value as LevelAssignmentMethod)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Diagnostic Test Result</div>
                <div className="text-sm text-gray-500 mt-1">
                  Enter diagnostic test score and suggested level. The level status will be set to
                  &quot;provisional&quot; and require approval.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Manual Level Selection */}
        {levelMethod === 'manual' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="currentLevel"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Current Level <span className="text-red-500">*</span>
              </label>
              <select
                id="currentLevel"
                value={currentLevel}
                onChange={e => setCurrentLevel(e.target.value)}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select level...</option>
                {CEFR_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="initialLevel"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Initial Level (Optional)
              </label>
              <select
                id="initialLevel"
                value={initialLevel}
                onChange={e => setInitialLevel(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Same as current...</option>
                {CEFR_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">The level when the student first joined</p>
            </div>
          </div>
        )}

        {/* Diagnostic Test Input */}
        {levelMethod === 'diagnostic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="diagnosticScore"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Test Score <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="diagnosticScore"
                  value={diagnosticScore}
                  onChange={e => setDiagnosticScore(e.target.value)}
                  min="0"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="65"
                />
              </div>

              <div>
                <label
                  htmlFor="diagnosticMaxScore"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Max Score
                </label>
                <input
                  type="number"
                  id="diagnosticMaxScore"
                  value={diagnosticMaxScore}
                  onChange={e => setDiagnosticMaxScore(e.target.value)}
                  min="1"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="suggestedLevel"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Suggested Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="suggestedLevel"
                  value={suggestedLevel}
                  onChange={e => setSuggestedLevel(e.target.value)}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {CEFR_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> This student level will be marked as &quot;provisional&quot;
                and require approval from a Director of Studies or Administrator before being
                confirmed.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Visa Information */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Visa Information (Optional)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="visaType" className="block text-sm font-medium text-gray-700 mb-1">
              Visa Type
            </label>
            <input
              type="text"
              id="visaType"
              value={visaType}
              onChange={e => setVisaType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Student Visa (Tier 4)"
            />
          </div>

          <div>
            <label htmlFor="visaExpiry" className="block text-sm font-medium text-gray-700 mb-1">
              Visa Expiry Date
            </label>
            <input
              type="date"
              id="visaExpiry"
              value={visaExpiry}
              onChange={e => setVisaExpiry(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating Student...' : 'Create Student'}
        </button>
      </div>
    </form>
  );
}
