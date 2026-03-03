'use client';

import { useState } from 'react';
import SpeakoutSelector from './SpeakoutSelector';
import TeacherIntentSelector from './TeacherIntentSelector';
import LessonChatInterface from './LessonChatInterface';
import LessonPlanPreview from './LessonPlanPreview';
import FieldTripForm from './FieldTripForm';
import type {
  SpeakoutContext,
  TeacherIntent,
  ChatContext,
  ApprovalStatus,
  FieldTrip,
} from '@/lib/lessons/chat-types';
import type { LessonPlan } from '@/lib/lessons/schemas';

type WizardPhase = 'speakout' | 'intent' | 'chat' | 'preview';

interface GeneratedPlan {
  id: string;
  plan: LessonPlan;
  approvalStatus: ApprovalStatus;
}

export default function LessonPlannerWizard() {
  const [phase, setPhase] = useState<WizardPhase>('speakout');
  const [speakoutContext, setSpeakoutContext] = useState<SpeakoutContext | null>(null);
  const [intent, setIntent] = useState<TeacherIntent | null>(null);
  const [_chatContext, setChatContext] = useState<ChatContext | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFieldTripModal, setShowFieldTripModal] = useState(false);

  // Phase navigation
  const canProceed = {
    speakout: speakoutContext !== null,
    intent: intent !== null,
    chat: true, // Can always proceed from chat
    preview: true,
  };

  const goToPhase = (newPhase: WizardPhase) => {
    setPhase(newPhase);
    setError(null);
  };

  const goNext = () => {
    const phases: WizardPhase[] = ['speakout', 'intent', 'chat', 'preview'];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      goToPhase(phases[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const phases: WizardPhase[] = ['speakout', 'intent', 'chat', 'preview'];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phases[currentIndex - 1]);
    }
  };

  // Handle Speakout selection
  const handleSpeakoutSelect = (context: SpeakoutContext) => {
    setSpeakoutContext(context);
  };

  // Handle intent selection
  const handleIntentSelect = (selectedIntent: TeacherIntent) => {
    setIntent(selectedIntent);
  };

  // Generate lesson plan
  const handleGeneratePlan = async (context: ChatContext) => {
    setChatContext(context);
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cefr_level: speakoutContext?.level || 'B1',
          topic: speakoutContext?.lesson || 'General English',
          duration_minutes: 60,
          additional_context: JSON.stringify({
            speakout: speakoutContext,
            intent,
            conversation: context.messages.filter(m => m.role === 'user').map(m => m.content),
          }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate lesson plan');
      }

      const data = await response.json();
      setGeneratedPlan({
        id: data.id,
        plan: data.plan,
        approvalStatus: 'draft',
      });
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate lesson plan');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!generatedPlan) return;
    setIsSaving(true);
    // The plan is already saved when generated, this could update it
    // For MVP, we just show feedback
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  // Publish
  const handlePublish = async () => {
    if (!generatedPlan) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${generatedPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish lesson plan');
      }

      setGeneratedPlan(prev => (prev ? { ...prev, approvalStatus: 'draft' } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsSaving(false);
    }
  };

  // Request approval
  const handleRequestApproval = async () => {
    if (!generatedPlan) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${generatedPlan.id}/request-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to submit for approval');
      }

      setGeneratedPlan(prev => (prev ? { ...prev, approvalStatus: 'pending_approval' } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSaving(false);
    }
  };

  // Add field trip
  const handleAddFieldTrip = () => {
    setShowFieldTripModal(true);
  };

  const handleFieldTripSave = async (fieldTrip: FieldTrip) => {
    if (!generatedPlan) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${generatedPlan.id}/field-trip`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldTrip),
      });

      if (!response.ok) {
        throw new Error('Failed to save field trip');
      }

      setShowFieldTripModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save field trip');
    } finally {
      setIsSaving(false);
    }
  };

  // Phase indicators
  const phases: { key: WizardPhase; label: string }[] = [
    { key: 'speakout', label: 'Select Lesson' },
    { key: 'intent', label: 'Choose Approach' },
    { key: 'chat', label: 'Refine Plan' },
    { key: 'preview', label: 'Review' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center justify-center" aria-label="Progress">
            <ol className="flex items-center space-x-4 md:space-x-8">
              {phases.map((p, idx) => {
                const isCurrent = phase === p.key;
                const isCompleted = phases.findIndex(x => x.key === phase) > idx;

                return (
                  <li key={p.key} className="flex items-center">
                    <button
                      onClick={() => {
                        // Allow going back but not forward unless completed
                        if (isCompleted || isCurrent) {
                          goToPhase(p.key);
                        }
                      }}
                      disabled={!isCompleted && !isCurrent}
                      className="flex items-center group"
                    >
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                          isCurrent
                            ? 'bg-indigo-600 text-white'
                            : isCompleted
                              ? 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'
                              : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span
                        className={`hidden md:block ml-2 text-sm font-medium ${
                          isCurrent
                            ? 'text-indigo-600'
                            : isCompleted
                              ? 'text-gray-900'
                              : 'text-gray-500'
                        }`}
                      >
                        {p.label}
                      </span>
                    </button>
                    {idx < phases.length - 1 && (
                      <svg
                        className="ml-4 md:ml-8 w-5 h-5 text-gray-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Phase 1: Speakout Selection */}
        {phase === 'speakout' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select a Speakout Lesson</h2>
            <SpeakoutSelector onSelect={handleSpeakoutSelect} selectedContext={speakoutContext} />
            <div className="mt-6 flex justify-end">
              <button
                onClick={goNext}
                disabled={!canProceed.speakout}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Intent Selection */}
        {phase === 'intent' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <TeacherIntentSelector selectedIntent={intent} onSelect={handleIntentSelect} />
            <div className="mt-6 flex justify-between">
              <button
                onClick={goBack}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={goNext}
                disabled={!canProceed.intent}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Continue to Chat
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Chat Interface */}
        {phase === 'chat' && (
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                <p className="mt-4 text-gray-600">Generating your lesson plan...</p>
              </div>
            ) : (
              <LessonChatInterface
                speakoutContext={speakoutContext}
                intent={intent}
                onGeneratePlan={handleGeneratePlan}
                onContextUpdate={setChatContext}
              />
            )}
          </div>
        )}

        {/* Phase 4: Preview */}
        {phase === 'preview' && generatedPlan && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <button
                onClick={goBack}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back to Chat
              </button>
              <button
                onClick={() => {
                  // Reset wizard
                  setPhase('speakout');
                  setSpeakoutContext(null);
                  setIntent(null);
                  setChatContext(null);
                  setGeneratedPlan(null);
                }}
                className="px-4 py-2 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
              >
                Create New Lesson
              </button>
            </div>
            <LessonPlanPreview
              plan={generatedPlan.plan}
              planId={generatedPlan.id}
              approvalStatus={generatedPlan.approvalStatus}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              onRequestApproval={handleRequestApproval}
              onAddFieldTrip={handleAddFieldTrip}
              isSaving={isSaving}
            />
          </div>
        )}
      </div>

      {/* Field Trip Modal */}
      {showFieldTripModal && (
        <FieldTripForm
          onSave={handleFieldTripSave}
          onCancel={() => setShowFieldTripModal(false)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
