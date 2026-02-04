/**
 * Bulk Upload Page - Full Drag-and-Drop ETL Implementation
 * Supports .xlsx, .csv files with validation and preview
 */

import { requireAuth } from '@/lib/auth/utils';
import BulkUploadClient from './BulkUploadClient';

export default async function BulkUploadPage() {
  await requireAuth(['admin']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Data Upload</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import students, classes, and enrollments via CSV or Excel files
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Upload Section */}
        <div className="lg:col-span-2">
          <BulkUploadClient />
        </div>

        {/* Instructions Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow sm:rounded-lg sticky top-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Field Reference</h3>

              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">File Format</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>CSV or Excel (.xlsx, .xls)</li>
                    <li>First row must contain headers</li>
                    <li>UTF-8 encoding recommended</li>
                    <li>Maximum 10MB file size</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Students Columns</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>
                      <strong>name</strong> (required) - Full name
                    </li>
                    <li>
                      <strong>email</strong> (required, unique)
                    </li>
                    <li>dateOfBirth (YYYY-MM-DD)</li>
                    <li>nationality</li>
                    <li>phone</li>
                    <li>studentNumber (optional)</li>
                    <li>isVisaStudent (true/false)</li>
                    <li>visaType</li>
                    <li>visaExpiryDate (YYYY-MM-DD)</li>
                    <li>emergencyContactName</li>
                    <li>emergencyContactPhone</li>
                    <li>emergencyContactRelationship</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Classes Columns</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>
                      <strong>name</strong> (required, unique)
                    </li>
                    <li>
                      <strong>level</strong> (required: A1, A2, B1, B2, C1, C2)
                    </li>
                    <li>startDate (YYYY-MM-DD)</li>
                    <li>endDate (YYYY-MM-DD)</li>
                    <li>capacity (number)</li>
                    <li>teacherEmail</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Enrollments Columns</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>
                      <strong>studentEmail</strong> (required)
                    </li>
                    <li>
                      <strong>className</strong> (required)
                    </li>
                    <li>enrollmentDate (YYYY-MM-DD, defaults to today)</li>
                    <li>expectedEndDate (YYYY-MM-DD, optional)</li>
                    <li>bookedWeeks (number, optional)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Bookings Columns (Full Format)</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>
                      <strong>Sale Date</strong> (required, YYYY-MM-DD)
                    </li>
                    <li>
                      <strong>Name</strong> (required)
                    </li>
                    <li>Source (agency name, defaults to &quot;Direct&quot;)</li>
                    <li>Visa Type</li>
                    <li>Nationality</li>
                    <li>DOB (YYYY-MM-DD)</li>
                    <li>
                      <strong>Course</strong> (required, must exist)
                    </li>
                    <li>
                      <strong>Weeks</strong> (required, number)
                    </li>
                    <li>
                      <strong>Start date</strong> (required, YYYY-MM-DD)
                    </li>
                    <li>
                      <strong>End date</strong> (required, YYYY-MM-DD)
                    </li>
                    <li>Level/Class</li>
                    <li>Placement test score</li>
                    <li>Accom Type (accommodation, must exist)</li>
                    <li>Deposit Paid (EUR)</li>
                    <li>Paid (total paid, EUR)</li>
                    <li>Course Fee Due (EUR)</li>
                    <li>Accomodation (fee, EUR)</li>
                    <li>Transfer (EUR)</li>
                    <li>Exam Fee (EUR)</li>
                    <li>Registration Fee (EUR)</li>
                    <li>Learner Protection (EUR)</li>
                    <li>Medical Insurance (EUR)</li>
                    <li>Total Booking (EUR)</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="rounded-md bg-blue-50 p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> Column names are case-sensitive and must match exactly.
                      Dates must use YYYY-MM-DD format.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
