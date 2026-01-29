'use client';

/**
 * EnquiryDetail Component - Display and manage individual enquiry
 * REQ: ROADMAP.md §1.10.2 - Enquiry Detail View
 * DESIGN: Task 1.10.2 - Full enquiry details with status management
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Enquiry } from '@/db/schema';

interface EnquiryDetailProps {
  enquiry: Enquiry;
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  converted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  referral: 'Referral',
  agent: 'Agent',
  social: 'Social Media',
  phone: 'Phone',
  walk_in: 'Walk-in',
};

const LEVEL_STYLES: Record<string, string> = {
  A1: 'bg-green-100 text-green-800',
  A2: 'bg-green-100 text-green-800',
  B1: 'bg-blue-100 text-blue-800',
  B2: 'bg-blue-100 text-blue-800',
  C1: 'bg-purple-100 text-purple-800',
  C2: 'bg-purple-100 text-purple-800',
};

export default function EnquiryDetail({ enquiry }: EnquiryDetailProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(enquiry.notes || '');
  const [status, setStatus] = useState(enquiry.status);

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === status) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/enquiries/${enquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setStatus(newStatus);
      alert('Status updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotesUpdate = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/enquiries/${enquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      setEditingNotes(false);
      alert('Notes updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Failed to update notes. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this enquiry? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/enquiries/${enquiry.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete enquiry');
      }

      alert('Enquiry deleted successfully');
      router.push('/admin/enquiries');
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      alert('Failed to delete enquiry. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleConvertToStudent = () => {
    alert(
      'Convert to Student feature coming soon!\n\nThis will create a new student record with the enquiry information and mark this enquiry as converted.'
    );
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Breadcrumb */}
      <div className="mb-8">
        <nav className="mb-4">
          <Link
            href="/admin/enquiries"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Enquiries
          </Link>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enquiry from {enquiry.name}</h1>
            <p className="mt-2 text-sm text-gray-600">Submitted {formatDate(enquiry.createdAt)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleConvertToStudent}
              className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
              disabled={status === 'converted' || status === 'rejected'}
            >
              Convert to Student
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{enquiry.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <a
                  href={`mailto:${enquiry.email}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {enquiry.email}
                </a>
              </dd>
            </div>
            {enquiry.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`tel:${enquiry.phone}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {enquiry.phone}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Enquiry Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(enquiry.createdAt)}</dd>
            </div>
            {enquiry.updatedAt && enquiry.updatedAt !== enquiry.createdAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(enquiry.updatedAt)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Programme Interest */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Programme Interest</h2>
          <dl className="space-y-3">
            {enquiry.programmeInterest && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Programme</dt>
                <dd className="mt-1 text-sm text-gray-900">{enquiry.programmeInterest}</dd>
              </div>
            )}
            {enquiry.levelEstimate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Estimated Level</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                      LEVEL_STYLES[enquiry.levelEstimate] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {enquiry.levelEstimate}
                  </span>
                </dd>
              </div>
            )}
            {enquiry.startDatePreference && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Preferred Start Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(enquiry.startDatePreference)}
                </dd>
              </div>
            )}
            {!enquiry.programmeInterest &&
              !enquiry.levelEstimate &&
              !enquiry.startDatePreference && (
                <p className="text-sm text-gray-500 italic">No programme information provided</p>
              )}
          </dl>
        </div>

        {/* Status Management */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Status & Source</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-2">Current Status</dt>
              <dd>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                    STATUS_STYLES[status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-2">Update Status</dt>
              <dd>
                <select
                  value={status}
                  onChange={e => handleStatusUpdate(e.target.value)}
                  disabled={isUpdating}
                  className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500 disabled:opacity-50"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </dd>
            </div>
            {enquiry.source && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Source</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {SOURCE_LABELS[enquiry.source] || enquiry.source}
                </dd>
              </div>
            )}
            {enquiry.externalId && (
              <div>
                <dt className="text-sm font-medium text-gray-500">External ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{enquiry.externalId}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Notes */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Notes</h2>
            {!editingNotes ? (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingNotes(false);
                    setNotes(enquiry.notes || '');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleNotesUpdate}
                  disabled={isUpdating}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          {editingNotes ? (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={6}
              className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="Add notes about this enquiry..."
            />
          ) : (
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {enquiry.notes || <span className="text-gray-500 italic">No notes added yet</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
