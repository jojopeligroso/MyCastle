/**
 * Feature Card Component
 * Clickable card for dashboard features
 */

import Link from 'next/link';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

const colorClasses = {
  blue: 'bg-blue-500 hover:bg-blue-600',
  green: 'bg-green-500 hover:bg-green-600',
  purple: 'bg-purple-500 hover:bg-purple-600',
  orange: 'bg-orange-500 hover:bg-orange-600',
};

export function FeatureCard({
  title,
  description,
  href,
  icon,
  badge,
  color = 'blue',
}: FeatureCardProps) {
  return (
    <Link href={href} className="block group">
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden">
        {/* Color bar */}
        <div className={`h-2 ${colorClasses[color]}`}></div>

        <div className="p-6">
          {/* Header with icon */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {title}
              </h3>
              {badge && (
                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {badge}
                </span>
              )}
            </div>
            {icon && (
              <div className="flex-shrink-0 ml-4 text-gray-400 group-hover:text-blue-500 transition-colors">
                {icon}
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4">{description}</p>

          {/* Arrow indicator */}
          <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
            <span>Get started</span>
            <svg
              className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
