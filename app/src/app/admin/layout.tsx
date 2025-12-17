/**
 * Admin Layout - Navigation and structure for admin section
 * Protected route - requires admin role
 */

import { requireAuth } from '@/lib/auth/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/admin/Sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth().catch(() => {
    redirect('/login');
  });

  const userRole = user.user_metadata?.role || user.app_metadata?.role || 'student';

  // Check admin authorization
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole.startsWith('admin_');

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">MyCastle Admin</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                {userRole}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-gray-700 hover:text-gray-900 bg-transparent border-0 cursor-pointer"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
