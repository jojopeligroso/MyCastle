'use client';

import type { TeacherIntent } from '@/lib/lessons/chat-types';

interface IntentOption {
  value: TeacherIntent;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const intentOptions: IntentOption[] = [
  {
    value: 'follow',
    label: 'Follow Speakout',
    description:
      'Use the textbook lesson as designed. Get tips for maximizing effectiveness and managing timing.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  {
    value: 'deviate',
    label: 'Deviate from Speakout',
    description:
      'Use Speakout objectives as a starting point but create custom activities tailored to your class.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    value: 'supplement',
    label: 'Supplement Speakout',
    description:
      'Enhance the textbook lesson with additional activities, materials, and extension tasks.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
    ),
  },
];

interface TeacherIntentSelectorProps {
  selectedIntent: TeacherIntent | null;
  onSelect: (intent: TeacherIntent) => void;
}

export default function TeacherIntentSelector({
  selectedIntent,
  onSelect,
}: TeacherIntentSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          How would you like to use this lesson?
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Choose how you want to work with the Speakout textbook content.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {intentOptions.map(option => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all ${
              selectedIntent === option.value
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {/* Radio indicator */}
            <div className="absolute top-4 right-4">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedIntent === option.value
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedIntent === option.value && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>

            {/* Icon */}
            <div
              className={`p-2 rounded-lg ${
                selectedIntent === option.value
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {option.icon}
            </div>

            {/* Content */}
            <h4
              className={`mt-3 font-medium ${
                selectedIntent === option.value
                  ? 'text-indigo-900'
                  : 'text-gray-900'
              }`}
            >
              {option.label}
            </h4>
            <p className="mt-1 text-sm text-gray-500">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
