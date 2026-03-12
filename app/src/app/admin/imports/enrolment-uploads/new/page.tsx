/**
 * New Import Wizard Page
 * Entry point for the 6-step import wizard
 */

import ImportWizard from '../_components/ImportWizard';

export default function NewImportPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Enrolment Import</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload and import student enrolment data from an Excel file
        </p>
      </div>

      {/* Wizard */}
      <ImportWizard />
    </div>
  );
}
