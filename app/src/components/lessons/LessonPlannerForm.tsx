/**
 * Lesson Planner Form Component
 * AI-assisted lesson plan generation interface for teachers
 */

'use client';

import { useState } from 'react';
import type { CefrLevel, LessonPlan } from '@/lib/lessons/schemas';

interface LessonPlannerFormProps {
  onPlanGenerated?: (plan: LessonPlan) => void;
}

export function LessonPlannerForm({ onPlanGenerated }: LessonPlannerFormProps) {
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>('B1');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedPlan(null);

    try {
      const response = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cefr_level: cefrLevel,
          topic,
          duration_minutes: duration,
          additional_context: additionalContext || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate lesson plan');
      }

      const data = await response.json();
      setGeneratedPlan(data.plan);
      setGenerationTime(data.generation_time_ms);
      onPlanGenerated?.(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          AI-Assisted Lesson Planner
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CEFR Level */}
          <div>
            <label
              htmlFor="cefr-level"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              CEFR Level
            </label>
            <select
              id="cefr-level"
              value={cefrLevel}
              onChange={e => setCefrLevel(e.target.value as CefrLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
              <option value="B2">B2 - Upper Intermediate</option>
              <option value="C1">C1 - Advanced</option>
              <option value="C2">C2 - Proficiency</option>
            </select>
          </div>

          {/* Topic */}
          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Lesson Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Daily Routines, Travel, Food and Cooking"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min="30"
              max="240"
              step="15"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Additional Context */}
          <div>
            <label
              htmlFor="context"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Additional Context (Optional)
            </label>
            <textarea
              id="context"
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="Any specific requirements, vocabulary focus, or student needs..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating lesson plan...
              </span>
            ) : (
              'Generate Lesson Plan'
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Generated Plan */}
        {generatedPlan && (
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Generated Lesson Plan
              </h3>
              {generationTime && (
                <span className="text-sm text-gray-500">
                  Generated in {(generationTime / 1000).toFixed(2)}s
                </span>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-6">
              {/* Title and Basics */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {generatedPlan.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {generatedPlan.cefr_level} • {generatedPlan.duration_minutes} minutes
                </p>
              </div>

              {/* Objectives */}
              {generatedPlan.objectives && generatedPlan.objectives.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">
                    Learning Objectives
                  </h5>
                  <ul className="list-disc list-inside space-y-1">
                    {generatedPlan.objectives.map((obj, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        {obj.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Activities */}
              {generatedPlan.activities && generatedPlan.activities.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Activities</h5>
                  <div className="space-y-4">
                    {generatedPlan.activities.map((activity, idx) => (
                      <div key={idx} className="bg-white rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h6 className="font-medium text-gray-900">
                            {activity.name}
                          </h6>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {activity.duration_minutes} min
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {activity.description}
                        </p>
                        {activity.materials && activity.materials.length > 0 && (
                          <p className="text-xs text-gray-500">
                            Materials: {activity.materials.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials */}
              {generatedPlan.materials && generatedPlan.materials.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Materials Needed</h5>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {generatedPlan.materials.map((material, idx) => (
                      <li key={idx}>{material}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assessment */}
              {generatedPlan.assessment && generatedPlan.assessment.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Assessment</h5>
                  {generatedPlan.assessment.map((assess, idx) => (
                    <div key={idx} className="text-sm text-gray-700">
                      <span className="font-medium capitalize">{assess.type}:</span>{' '}
                      {assess.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Homework */}
              {generatedPlan.homework && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Homework</h5>
                  <p className="text-sm text-gray-700">{generatedPlan.homework}</p>
                </div>
              )}

              {/* Notes */}
              {generatedPlan.notes && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Teacher Notes</h5>
                  <p className="text-sm text-gray-700">{generatedPlan.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
