import { requireAuth } from '@/lib/auth/utils';
import Link from 'next/link';
import { Clock, Settings, CreditCard, Home } from 'lucide-react';

export default async function Page() {
  await requireAuth();

  const settingsCategories = [
    {
      title: 'Attendance',
      description: 'Configure late thresholds and cumulative lateness tracking',
      href: '/admin/settings/attendance',
      icon: Clock,
    },
    {
      title: 'Booking Fee Presets',
      description: 'Manage registration, learner protection, transfer, and exam fee options',
      href: '/admin/settings/booking-fees',
      icon: CreditCard,
    },
    {
      title: 'Accommodation Presets',
      description: 'Configure accommodation types and pricing',
      href: '/admin/settings/accommodation-presets',
      icon: Home,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure application settings</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map(category => (
          <Link
            key={category.href}
            href={category.href}
            className="bg-white shadow sm:rounded-lg p-6 hover:shadow-md transition-shadow group"
          >
            <div className="space-y-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <category.icon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                  {category.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{category.description}</p>
              </div>
            </div>
          </Link>
        ))}

        {/* Placeholder for future settings */}
        <div className="bg-white shadow sm:rounded-lg p-6 border-2 border-dashed border-gray-200">
          <div className="space-y-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Settings className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-400">More Settings</h3>
              <p className="mt-1 text-sm text-gray-400">Additional settings coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
