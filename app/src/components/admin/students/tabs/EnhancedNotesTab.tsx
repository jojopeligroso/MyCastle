'use client';

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';

interface StudentNote {
  id: string;
  content: string;
  noteType: 'general' | 'academic' | 'behavioral' | 'pastoral' | 'medical';
  visibility: 'private' | 'staff_only' | 'shareable';
  isSharedWithStudent: boolean;
  sharedAt: string | null;
  tags: string[];
  author: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  editedBy: { name: string } | null;
}

interface EnhancedNotesTabProps {
  studentId: string;
  currentUserId: string;
  currentUserRole: string;
  canViewSensitiveNotes?: boolean;
  canAddNotes?: boolean;
  canShareNotes?: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function EnhancedNotesTab({
  studentId,
  currentUserId,
  currentUserRole,
  canViewSensitiveNotes = false,
  canAddNotes = false,
  canShareNotes = false,
}: EnhancedNotesTabProps) {
  // Fetch notes
  const { data, isLoading, error } = useSWR<{ notes: StudentNote[] }>(
    studentId ? `/api/admin/students/${studentId}/notes` : null,
    fetcher
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [newNote, setNewNote] = useState({
    content: '',
    noteType: 'general' as StudentNote['noteType'],
    visibility: 'staff_only' as StudentNote['visibility'],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notes = data?.notes || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.content.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/students/${studentId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      // Refresh the notes list
      mutate(`/api/admin/students/${studentId}/notes`);

      // Reset form
      setNewNote({ content: '', noteType: 'general', visibility: 'staff_only' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWithStudent = async (noteId: string) => {
    if (!confirm('Share this note with the student? They will be notified.')) return;

    try {
      const response = await fetch(`/api/admin/students/${studentId}/notes/${noteId}/share`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to share note');
      }

      // Refresh the notes list
      mutate(`/api/admin/students/${studentId}/notes`);
    } catch (error) {
      console.error('Failed to share note:', error);
    }
  };

  const getNoteTypeColor = (type: StudentNote['noteType']): string => {
    const colors: Record<string, string> = {
      general: 'bg-gray-100 text-gray-800',
      academic: 'bg-blue-100 text-blue-800',
      behavioral: 'bg-amber-100 text-amber-800',
      pastoral: 'bg-purple-100 text-purple-800',
      medical: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getVisibilityIcon = (
    visibility: StudentNote['visibility'],
    isShared: boolean
  ): React.ReactNode => {
    if (isShared) {
      return (
        <span className="inline-flex items-center gap-1 text-green-600" title="Shared with student">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs">Shared</span>
        </span>
      );
    }

    const icons: Record<string, React.ReactNode> = {
      private: (
        <span
          className="inline-flex items-center gap-1 text-gray-400"
          title="Private - only you can see this"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="text-xs">Private</span>
        </span>
      ),
      staff_only: (
        <span
          className="inline-flex items-center gap-1 text-amber-600"
          title="Staff only - visible to teachers and admins"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="text-xs">Staff</span>
        </span>
      ),
      shareable: (
        <span
          className="inline-flex items-center gap-1 text-blue-600"
          title="Shareable - can be shared with student"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span className="text-xs">Shareable</span>
        </span>
      ),
    };
    return icons[visibility] || icons.private;
  };

  const filteredNotes = notes.filter((note: StudentNote) => {
    // Filter out medical notes if user can't view sensitive
    if (note.noteType === 'medical' && !canViewSensitiveNotes) {
      return false;
    }
    if (filter === 'all') return true;
    if (filter === 'shared') return note.isSharedWithStudent;
    return note.noteType === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <p className="text-sm text-red-600">Failed to load notes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Student Notes</h3>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Notes</option>
            <option value="general">General</option>
            <option value="academic">Academic</option>
            <option value="behavioral">Behavioral</option>
            <option value="pastoral">Pastoral</option>
            <option value="medical">Medical</option>
            <option value="shared">Shared with Student</option>
          </select>
          {canAddNotes && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
            >
              {showAddForm ? 'Cancel' : 'Add Note'}
            </button>
          )}
        </div>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note Content</label>
            <textarea
              value={newNote.content}
              onChange={e => setNewNote({ ...newNote, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Write your note here..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newNote.noteType}
                onChange={e =>
                  setNewNote({ ...newNote, noteType: e.target.value as StudentNote['noteType'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="general">General</option>
                <option value="academic">Academic</option>
                <option value="behavioral">Behavioral</option>
                <option value="pastoral">Pastoral</option>
                {canViewSensitiveNotes && <option value="medical">Medical</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
              <select
                value={newNote.visibility}
                onChange={e =>
                  setNewNote({
                    ...newNote,
                    visibility: e.target.value as StudentNote['visibility'],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="private">Private (only me)</option>
                <option value="staff_only">Staff Only</option>
                <option value="shareable">Shareable with Student</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newNote.content.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            {filter === 'all' ? 'No notes available' : `No ${filter} notes`}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {canAddNotes
              ? 'Click "Add Note" to create the first note for this student'
              : 'Notes added by teachers and admins will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note: StudentNote) => {
            const isOwnNote = note.author.id === currentUserId;
            const canEdit = isOwnNote || currentUserRole === 'admin';
            const canShare =
              canShareNotes && note.visibility === 'shareable' && !note.isSharedWithStudent;

            return (
              <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getNoteTypeColor(note.noteType)}`}
                    >
                      {note.noteType.charAt(0).toUpperCase() + note.noteType.slice(1)}
                    </span>
                    {getVisibilityIcon(note.visibility, note.isSharedWithStudent)}
                  </div>
                  <div className="flex items-center gap-2">
                    {canShare && (
                      <button
                        onClick={() => handleShareWithStudent(note.id)}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Share with Student
                      </button>
                    )}
                    {canEdit && (
                      <button className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {note.author.name} ({note.author.role})
                  </span>
                  <span>
                    {new Date(note.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {note.editedAt && <span className="ml-1 text-gray-400">(edited)</span>}
                  </span>
                </div>

                {note.isSharedWithStudent && note.sharedAt && (
                  <div className="mt-2 text-xs text-green-600">
                    Shared with student on {new Date(note.sharedAt).toLocaleDateString('en-GB')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Permission Notice */}
      {!canViewSensitiveNotes && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> You do not have permission to view medical notes. Only Directors
            of Studies and Administrators can access sensitive information.
          </p>
        </div>
      )}
    </div>
  );
}
