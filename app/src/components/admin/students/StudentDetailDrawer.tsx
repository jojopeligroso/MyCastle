'use client';

import { useEffect, useState } from 'react';
import { type User } from '@/db/schema/core';
import {
  PersonalInfoTab,
  CourseHistoryTab,
  AttendanceSummaryTab,
  AssessmentsTab,
  NotesTab,
  DocumentsTab,
} from './tabs';

interface StudentDetailDrawerProps {
  student: User | null;
  isOpen: boolean;
  onClose: () => void;
  onApproveLevel?: (studentId: string) => Promise<void>;
  canApproveLevel?: boolean;
  canViewSensitiveNotes?: boolean;
}

type TabId = 'personal' | 'courses' | 'attendance' | 'assessments' | 'notes' | 'documents';

const TABS = [
  { id: 'personal' as TabId, label: 'Personal Info', icon: '👤' },
  { id: 'courses' as TabId, label: 'Course History', icon: '📚' },
  { id: 'attendance' as TabId, label: 'Attendance', icon: '📋' },
  { id: 'assessments' as TabId, label: 'Assessments', icon: '✅' },
  { id: 'notes' as TabId, label: 'Notes', icon: '📝' },
  { id: 'documents' as TabId, label: 'Documents', icon: '📎' },
];

export function StudentDetailDrawer({
  student,
  isOpen,
  onClose,
  onApproveLevel,
  canApproveLevel = false,
  canViewSensitiveNotes = false,
}: StudentDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [isApproving, setIsApproving] = useState(false);

  // Reset to personal tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('personal');
    }
  }, [isOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleApproveLevel = async () => {
    if (!student || !onApproveLevel) return;

    setIsApproving(true);
    try {
      await onApproveLevel(student.id);
    } catch (error) {
      console.error('Failed to approve level:', error);
    } finally {
      setIsApproving(false);
    }
  };

  if (!student) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-gray-900 transition-opacity z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Side drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-purple-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {student.avatar_url ? (
                <img
                  src={student.avatar_url}
                  alt={student.name}
                  className="h-16 w-16 rounded-full border-2 border-white"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
                  <span className="text-2xl font-bold">{student.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{student.name}</h2>
                <p className="text-purple-100 text-sm">{student.email}</p>
                {student.current_level && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-white/20 rounded">
                      CEFR {student.current_level}
                      {student.level_status === 'provisional' && ' (Provisional)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-100 transition-colors"
              aria-label="Close drawer"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <nav className="flex overflow-x-auto -mb-px px-6" aria-label="Tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto h-[calc(100vh-200px)] p-6">
          {activeTab === 'personal' && (
            <PersonalInfoTab
              student={student}
              onApproveLevel={canApproveLevel ? handleApproveLevel : undefined}
              isApproving={isApproving}
              canApproveLevel={canApproveLevel}
            />
          )}
          {activeTab === 'courses' && <CourseHistoryTab studentId={student.id} />}
          {activeTab === 'attendance' && <AttendanceSummaryTab studentId={student.id} />}
          {activeTab === 'assessments' && <AssessmentsTab studentId={student.id} />}
          {activeTab === 'notes' && (
            <NotesTab studentId={student.id} canViewSensitiveNotes={canViewSensitiveNotes} />
          )}
          {activeTab === 'documents' && <DocumentsTab studentId={student.id} />}
        </div>
      </div>
    </>
  );
}
