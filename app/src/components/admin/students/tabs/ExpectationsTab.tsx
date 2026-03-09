'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface ExpectationsRecord {
  id: string;
  studentId: string;
  tenantId: string;
  // Learning Goals
  primaryGoal: string | null;
  secondaryGoals: string[] | null;
  targetCefrLevel: string | null;
  targetDate: string | null;
  // Study Commitment
  weeklyStudyHours: number | null;
  selfStudyHours: number | null;
  preferredLearningStyle: string | null;
  // Motivation & Context
  studyReason: string | null;
  specificNeeds: string | null;
  prioritySkills: string[] | null;
  // Self-Assessment
  currentStrengths: string[] | null;
  areasForImprovement: string[] | null;
  anticipatedChallenges: string | null;
  // Expectations from School
  classroomExpectations: string | null;
  teacherSupport: string | null;
  feedbackPreference: string | null;
  // Commitment & Accountability
  attendanceCommitment: number | null;
  homeworkCommitment: number | null;
  participationCommitment: number | null;
  // Admin
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExpectationsTabProps {
  studentId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEARNING_STYLES = ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'];
const FEEDBACK_PREFERENCES = ['Frequent', 'Weekly', 'End of Unit'];

const SKILL_OPTIONS = [
  { value: 'speaking', label: 'Speaking' },
  { value: 'listening', label: 'Listening' },
  { value: 'reading', label: 'Reading' },
  { value: 'writing', label: 'Writing' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'pronunciation', label: 'Pronunciation' },
];

function MultiSelectCheckbox({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
}) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map(option => (
          <label key={option.value} className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => toggleOption(option.value)}
              className="rounded border-gray-300"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CommitmentSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-medium">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

export function ExpectationsTab({ studentId }: ExpectationsTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<ExpectationsRecord | null>(null);

  const {
    data,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<{ data: ExpectationsRecord[] }>(`/api/admin/students/${studentId}/expectations`, fetcher);

  const records = data?.data ?? [];

  const defaultFormData = {
    primaryGoal: '',
    secondaryGoals: [] as string[],
    targetCefrLevel: '',
    targetDate: '',
    weeklyStudyHours: '',
    selfStudyHours: '',
    preferredLearningStyle: '',
    studyReason: '',
    specificNeeds: '',
    prioritySkills: [] as string[],
    currentStrengths: [] as string[],
    areasForImprovement: [] as string[],
    anticipatedChallenges: '',
    classroomExpectations: '',
    teacherSupport: '',
    feedbackPreference: '',
    attendanceCommitment: 3,
    homeworkCommitment: 3,
    participationCommitment: 3,
  };

  const [formData, setFormData] = useState(defaultFormData);

  const handleOpenChange = (open: boolean) => {
    if (open && editingRecord) {
      setFormData({
        primaryGoal: editingRecord.primaryGoal || '',
        secondaryGoals: editingRecord.secondaryGoals || [],
        targetCefrLevel: editingRecord.targetCefrLevel || '',
        targetDate: editingRecord.targetDate ? editingRecord.targetDate.split('T')[0] : '',
        weeklyStudyHours: editingRecord.weeklyStudyHours?.toString() || '',
        selfStudyHours: editingRecord.selfStudyHours?.toString() || '',
        preferredLearningStyle: editingRecord.preferredLearningStyle || '',
        studyReason: editingRecord.studyReason || '',
        specificNeeds: editingRecord.specificNeeds || '',
        prioritySkills: editingRecord.prioritySkills || [],
        currentStrengths: editingRecord.currentStrengths || [],
        areasForImprovement: editingRecord.areasForImprovement || [],
        anticipatedChallenges: editingRecord.anticipatedChallenges || '',
        classroomExpectations: editingRecord.classroomExpectations || '',
        teacherSupport: editingRecord.teacherSupport || '',
        feedbackPreference: editingRecord.feedbackPreference || '',
        attendanceCommitment: editingRecord.attendanceCommitment || 3,
        homeworkCommitment: editingRecord.homeworkCommitment || 3,
        participationCommitment: editingRecord.participationCommitment || 3,
      });
    } else if (open) {
      setFormData(defaultFormData);
    }
    setError(null);
    setIsOpen(open);
    if (!open) {
      setEditingRecord(null);
    }
  };

  const handleEdit = (record: ExpectationsRecord) => {
    setEditingRecord(record);
    setIsOpen(true);
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this expectations record?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/students/${studentId}/expectations?recordId=${recordId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      await mutate();
    } catch {
      alert('Failed to delete expectations record');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        primaryGoal: formData.primaryGoal || null,
        secondaryGoals: formData.secondaryGoals.length > 0 ? formData.secondaryGoals : null,
        targetCefrLevel: formData.targetCefrLevel || null,
        targetDate: formData.targetDate || null,
        weeklyStudyHours: formData.weeklyStudyHours ? parseInt(formData.weeklyStudyHours, 10) : null,
        selfStudyHours: formData.selfStudyHours ? parseInt(formData.selfStudyHours, 10) : null,
        preferredLearningStyle: formData.preferredLearningStyle || null,
        studyReason: formData.studyReason || null,
        specificNeeds: formData.specificNeeds || null,
        prioritySkills: formData.prioritySkills.length > 0 ? formData.prioritySkills : null,
        currentStrengths: formData.currentStrengths.length > 0 ? formData.currentStrengths : null,
        areasForImprovement:
          formData.areasForImprovement.length > 0 ? formData.areasForImprovement : null,
        anticipatedChallenges: formData.anticipatedChallenges || null,
        classroomExpectations: formData.classroomExpectations || null,
        teacherSupport: formData.teacherSupport || null,
        feedbackPreference: formData.feedbackPreference || null,
        attendanceCommitment: formData.attendanceCommitment,
        homeworkCommitment: formData.homeworkCommitment,
        participationCommitment: formData.participationCommitment,
        ...(editingRecord ? { id: editingRecord.id } : {}),
      };

      const method = editingRecord ? 'PUT' : 'POST';
      const response = await fetch(`/api/admin/students/${studentId}/expectations`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save expectations');
      }

      await mutate();
      setIsOpen(false);
      setEditingRecord(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading expectations...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Failed to load expectations</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Student Expectations</h3>
          <p className="text-sm text-gray-500">Learning goals and commitments at course start</p>
        </div>
        <button
          onClick={() => handleOpenChange(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Add Expectations
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingRecord ? 'Edit Expectations' : 'New Expectations Record'}
                </h2>
                <button
                  onClick={() => handleOpenChange(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}

                {/* Learning Goals Section */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Learning Goals</h4>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Primary Learning Goal
                    </label>
                    <textarea
                      value={formData.primaryGoal}
                      onChange={e => handleInputChange('primaryGoal', e.target.value)}
                      placeholder="What is your main learning objective?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Target CEFR Level
                      </label>
                      <select
                        value={formData.targetCefrLevel}
                        onChange={e => handleInputChange('targetCefrLevel', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Select level</option>
                        {CEFR_LEVELS.map(level => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Target Date</label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={e => handleInputChange('targetDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Study Commitment Section */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Study Commitment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Weekly Class Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="168"
                        value={formData.weeklyStudyHours}
                        onChange={e => handleInputChange('weeklyStudyHours', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Weekly Self-Study Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="168"
                        value={formData.selfStudyHours}
                        onChange={e => handleInputChange('selfStudyHours', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Preferred Learning Style
                    </label>
                    <select
                      value={formData.preferredLearningStyle}
                      onChange={e => handleInputChange('preferredLearningStyle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select style</option>
                      {LEARNING_STYLES.map(style => (
                        <option key={style} value={style.toLowerCase()}>
                          {style}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Skills Section */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Skills Assessment</h4>
                  <MultiSelectCheckbox
                    options={SKILL_OPTIONS}
                    value={formData.prioritySkills}
                    onChange={value => handleInputChange('prioritySkills', value)}
                    label="Priority Skills to Improve"
                  />
                  <MultiSelectCheckbox
                    options={SKILL_OPTIONS}
                    value={formData.currentStrengths}
                    onChange={value => handleInputChange('currentStrengths', value)}
                    label="Current Strengths"
                  />
                  <MultiSelectCheckbox
                    options={SKILL_OPTIONS}
                    value={formData.areasForImprovement}
                    onChange={value => handleInputChange('areasForImprovement', value)}
                    label="Areas for Improvement"
                  />
                </div>

                {/* Motivation Section */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Motivation & Needs</h4>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Why are you studying English?
                    </label>
                    <textarea
                      value={formData.studyReason}
                      onChange={e => handleInputChange('studyReason', e.target.value)}
                      placeholder="Main reasons for learning English..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Specific Needs</label>
                    <textarea
                      value={formData.specificNeeds}
                      onChange={e => handleInputChange('specificNeeds', e.target.value)}
                      placeholder="Work, travel, exams, etc..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[60px]"
                    />
                  </div>
                </div>

                {/* Commitments Section */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Commitments</h4>
                  <CommitmentSlider
                    value={formData.attendanceCommitment}
                    onChange={value => handleInputChange('attendanceCommitment', value)}
                    label="Attendance Commitment"
                  />
                  <CommitmentSlider
                    value={formData.homeworkCommitment}
                    onChange={value => handleInputChange('homeworkCommitment', value)}
                    label="Homework Commitment"
                  />
                  <CommitmentSlider
                    value={formData.participationCommitment}
                    onChange={value => handleInputChange('participationCommitment', value)}
                    label="Participation Commitment"
                  />
                </div>

                {/* Expectations from School */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Expectations from School</h4>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Classroom Expectations
                    </label>
                    <textarea
                      value={formData.classroomExpectations}
                      onChange={e => handleInputChange('classroomExpectations', e.target.value)}
                      placeholder="What do you expect from classes?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Teacher Support Needed
                    </label>
                    <textarea
                      value={formData.teacherSupport}
                      onChange={e => handleInputChange('teacherSupport', e.target.value)}
                      placeholder="What type of support do you need?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Feedback Preference
                    </label>
                    <select
                      value={formData.feedbackPreference}
                      onChange={e => handleInputChange('feedbackPreference', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select preference</option>
                      {FEEDBACK_PREFERENCES.map(pref => (
                        <option key={pref} value={pref.toLowerCase().replace(/ /g, '-')}>
                          {pref}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingRecord ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            No expectations records have been added for this student yet.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Add First Record
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map(record => (
            <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-base font-medium text-gray-900">
                    {record.primaryGoal || 'Expectations Record'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Created {new Date(record.createdAt).toLocaleDateString()}
                    {record.targetCefrLevel && ` | Target: ${record.targetCefrLevel}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(record)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Skills Summary */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Priority Skills</p>
                  <p className="text-sm text-gray-900">
                    {(record.prioritySkills ?? [])
                      .map(s => SKILL_OPTIONS.find(o => o.value === s)?.label || s)
                      .join(', ') || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Study Commitment</p>
                  <p className="text-sm text-gray-900">
                    {record.weeklyStudyHours ? `${record.weeklyStudyHours}h/week in class` : ''}
                    {record.weeklyStudyHours && record.selfStudyHours ? ', ' : ''}
                    {record.selfStudyHours ? `${record.selfStudyHours}h/week self-study` : ''}
                    {!record.weeklyStudyHours && !record.selfStudyHours ? 'Not specified' : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Commitments</p>
                  <p className="text-sm text-gray-900">
                    Attendance: {record.attendanceCommitment || '-'}/5, Homework:{' '}
                    {record.homeworkCommitment || '-'}/5, Participation:{' '}
                    {record.participationCommitment || '-'}/5
                  </p>
                </div>
                {record.studyReason && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Study Reason</p>
                    <p className="text-sm text-gray-900">{record.studyReason}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
