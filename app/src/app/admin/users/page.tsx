/**
 * Users List Page - View and manage all users
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { UserList } from '@/components/admin/UserList';

async function getUsers(tenantId: string) {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      created_at: users.created_at,
      last_login: users.last_login,
    })
    .from(users)
    .where(eq(users.tenant_id, tenantId))
    .orderBy(users.created_at);

  return allUsers;
}

async function getUserStats(tenantId: string) {
  const allUsers = await db
    .select({
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.tenant_id, tenantId));

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(u => u.status === 'active').length;
  const studentCount = allUsers.filter(u => u.role === 'student').length;
  const teacherCount = allUsers.filter(u => u.role === 'teacher').length;
  const adminCount = allUsers.filter(u => u.role?.includes('admin')).length;

  return {
    totalUsers,
    activeUsers,
    studentCount,
    teacherCount,
    adminCount,
  };
}

export default async function UsersPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const users = await getUsers(tenantId);
  const stats = await getUserStats(tenantId);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-2 text-gray-600">Manage students, teachers, and administrators</p>
        </div>
        <Link
          href="/admin/users/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
        >
          + Add User
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.activeUsers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Students</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{stats.studentCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Teachers</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{stats.teacherCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Admins</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">{stats.adminCount}</div>
        </div>
      </div>

      {/* Users List */}
      <UserList
        users={users.map(u => ({
          ...u,
          created_at: u.created_at.toISOString(),
          last_login: u.last_login?.toISOString() || null,
        }))}
      />
    </div>
  );
}
