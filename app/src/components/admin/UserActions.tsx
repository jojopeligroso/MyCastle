'use client';

import { useState } from 'react';
import {
  changeUserRole,
  deactivateUser,
  reactivateUser,
  revokeUserSessions,
  resetUserMFA,
} from '@/app/admin/users/_actions/userActions';

interface UserActionsProps {
  userId: string;
  currentRole: string;
  currentStatus: string;
  userName: string;
}

export function UserActions({ userId, currentRole, currentStatus, userName }: UserActionsProps) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState(currentRole);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for the role change');
      return;
    }

    setLoading(true);
    const result = await changeUserRole(userId, newRole, reason);
    setLoading(false);

    if (result.success) {
      setShowRoleDialog(false);
      setReason('');
      alert('Role changed successfully');
      window.location.reload();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDeactivate = async () => {
    const reason = prompt(`Enter reason for deactivating ${userName}:`);
    if (!reason) return;

    if (!confirm(`Are you sure you want to deactivate ${userName}?`)) return;

    const result = await deactivateUser(userId, reason);
    if (result.success) {
      alert('User deactivated successfully');
      window.location.reload();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleReactivate = async () => {
    if (!confirm(`Are you sure you want to reactivate ${userName}?`)) return;

    const result = await reactivateUser(userId);
    if (result.success) {
      alert('User reactivated successfully');
      window.location.reload();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleRevokeSessions = async () => {
    if (!confirm(`This will force ${userName} to log out immediately. Continue?`)) return;

    const result = await revokeUserSessions(userId);
    if (result.success) {
      alert('All sessions revoked successfully');
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleResetMFA = async () => {
    if (!confirm(`This will reset MFA for ${userName}. Continue?`)) return;

    const result = await resetUserMFA(userId);
    if (result.success) {
      alert('MFA reset successfully');
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowRoleDialog(true)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Change Role
        </button>

        {currentStatus === 'active' ? (
          <button onClick={handleDeactivate} className="text-sm text-red-600 hover:text-red-800">
            Deactivate
          </button>
        ) : (
          <button
            onClick={handleReactivate}
            className="text-sm text-green-600 hover:text-green-800"
          >
            Reactivate
          </button>
        )}

        <button
          onClick={handleRevokeSessions}
          className="text-sm text-orange-600 hover:text-orange-800"
        >
          Revoke Sessions
        </button>

        <button onClick={handleResetMFA} className="text-sm text-purple-600 hover:text-purple-800">
          Reset MFA
        </button>
      </div>

      {/* Role Change Dialog */}
      {showRoleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change User Role</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Change *
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Explain why this role change is necessary..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowRoleDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {loading ? 'Changing...' : 'Change Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
