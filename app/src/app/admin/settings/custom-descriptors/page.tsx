/**
 * Custom Descriptors Settings Page
 * Allows admins to create and manage school-specific learning objectives
 */

import Link from 'next/link';
import { ChevronRight, BookOpen, Info, ExternalLink } from 'lucide-react';
import CustomDescriptorManager from '@/components/admin/settings/CustomDescriptorManager';

export const metadata = {
  title: 'Custom Descriptors | Settings',
  description: 'Create and manage school-specific learning objectives',
};

export default function CustomDescriptorsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700">
          Admin
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/admin/settings" className="hover:text-gray-700">
          Settings
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900">Custom Descriptors</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Custom Descriptors</h1>
            <p className="text-gray-600">
              Create school-specific learning objectives to supplement CEFR descriptors
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="text-sm text-blue-800">
          <p className="mb-2 font-medium">About Custom Descriptors</p>
          <ul className="list-inside list-disc space-y-1 text-blue-700">
            <li>
              Custom descriptors appear alongside official CEFR descriptors in the Learning
              Objectives selector
            </li>
            <li>They are visually distinguished with a &quot;Custom&quot; badge</li>
            <li>Teachers can use them in assessments just like official CEFR descriptors</li>
            <li>Custom descriptors are scoped to your school only</li>
            <li>Official CEFR descriptors remain read-only and cannot be modified</li>
          </ul>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/curriculum/cefr"
          className="flex items-center justify-between rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div>
            <h3 className="font-medium text-gray-900">CEFR Browser</h3>
            <p className="text-sm text-gray-500">View official descriptors</p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </Link>

        <Link
          href="/admin/settings/curriculum"
          className="flex items-center justify-between rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div>
            <h3 className="font-medium text-gray-900">Textbook Selection</h3>
            <p className="text-sm text-gray-500">Choose active textbooks</p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </Link>

        <Link
          href="/admin/settings/assessment-types"
          className="flex items-center justify-between rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div>
            <h3 className="font-medium text-gray-900">Assessment Types</h3>
            <p className="text-sm text-gray-500">Manage summative types</p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </Link>
      </div>

      {/* Main Content */}
      <CustomDescriptorManager />
    </div>
  );
}
