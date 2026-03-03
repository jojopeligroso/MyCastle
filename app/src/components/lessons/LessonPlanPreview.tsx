'use client';

import { useState } from 'react';
import type { LessonPlan } from '@/lib/lessons/schemas';
import type { ApprovalStatus } from '@/lib/lessons/chat-types';

interface LessonPlanPreviewProps {
  plan: LessonPlan;
  planId: string;
  approvalStatus: ApprovalStatus;
  onSaveDraft: () => void;
  onPublish: () => void;
  onRequestApproval: () => void;
  onAddFieldTrip: () => void;
  isSaving?: boolean;
}

export default function LessonPlanPreview({
  plan,
  planId,
  approvalStatus,
  onSaveDraft,
  onPublish,
  onRequestApproval,
  onAddFieldTrip,
  isSaving = false,
}: LessonPlanPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['objectives', 'activities'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getStatusBadge = () => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels = {
      draft: 'Draft',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[approvalStatus]}`}
      >
        {labels[approvalStatus]}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{plan.title}</h2>
            <div className="mt-1 flex items-center space-x-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {plan.cefr_level}
              </span>
              <span className="text-sm text-gray-500">{plan.duration_minutes} minutes</span>
              <span className="text-sm text-gray-500">|</span>
              <span className="text-sm text-gray-500">{plan.topic}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">{getStatusBadge()}</div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {/* Objectives */}
        <Section
          title="Learning Objectives"
          isExpanded={expandedSections.has('objectives')}
          onToggle={() => toggleSection('objectives')}
        >
          <ul className="space-y-2">
            {plan.objectives.map((obj, idx) => (
              <li key={idx} className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full text-xs font-medium mr-3">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm text-gray-900">{obj.description}</p>
                  {obj.cefr_alignment && (
                    <p className="text-xs text-gray-500 mt-0.5">CEFR: {obj.cefr_alignment}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Activities */}
        <Section
          title="Activities"
          isExpanded={expandedSections.has('activities')}
          onToggle={() => toggleSection('activities')}
        >
          <div className="space-y-3">
            {plan.activities.map((activity, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{activity.name}</h4>
                  <span className="text-sm text-gray-500">{activity.duration_minutes} min</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                <div className="flex flex-wrap gap-2">
                  {activity.interaction_pattern && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      {activity.interaction_pattern.replace('_', ' ')}
                    </span>
                  )}
                  {activity.materials?.map((material, mIdx) => (
                    <span
                      key={mIdx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                    >
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Materials */}
        {plan.materials && plan.materials.length > 0 && (
          <Section
            title="Materials Required"
            isExpanded={expandedSections.has('materials')}
            onToggle={() => toggleSection('materials')}
          >
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {plan.materials.map((material, idx) => (
                <li key={idx} className="flex items-center text-sm text-gray-600">
                  <svg
                    className="w-4 h-4 mr-2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {material}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Assessment */}
        {plan.assessment && plan.assessment.length > 0 && (
          <Section
            title="Assessment"
            isExpanded={expandedSections.has('assessment')}
            onToggle={() => toggleSection('assessment')}
          >
            <div className="space-y-3">
              {plan.assessment.map((assess, idx) => (
                <div key={idx} className="border-l-2 border-indigo-200 pl-4">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
                      {assess.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{assess.description}</p>
                  {assess.success_criteria && assess.success_criteria.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {assess.success_criteria.map((criterion, cIdx) => (
                        <li key={cIdx} className="text-xs text-gray-500 flex items-center">
                          <svg
                            className="w-3 h-3 mr-1 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Homework */}
        {plan.homework && (
          <Section
            title="Homework"
            isExpanded={expandedSections.has('homework')}
            onToggle={() => toggleSection('homework')}
          >
            <p className="text-sm text-gray-600">{plan.homework}</p>
          </Section>
        )}

        {/* Notes */}
        {plan.notes && (
          <Section
            title="Teacher Notes"
            isExpanded={expandedSections.has('notes')}
            onToggle={() => toggleSection('notes')}
          >
            <p className="text-sm text-gray-600 italic">{plan.notes}</p>
          </Section>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">Plan ID: {planId.substring(0, 8)}...</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSaveDraft}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={onPublish}
              disabled={isSaving || approvalStatus === 'pending_approval'}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              onClick={onRequestApproval}
              disabled={
                isSaving || approvalStatus === 'pending_approval' || approvalStatus === 'approved'
              }
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              Get DoS Approval
            </button>
            <button
              onClick={onAddFieldTrip}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
            >
              Add Field Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collapsible section component
function Section({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? 'transform rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && <div className="p-4">{children}</div>}
    </div>
  );
}
