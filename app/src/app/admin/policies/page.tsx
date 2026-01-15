import { requireAuth } from '@/lib/auth/utils';

export default async function Page() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Access Policies</h1>
        <p className="mt-1 text-sm text-gray-500">Configure RBAC and policies</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="h-96 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center flex-col gap-4">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="text-gray-400 font-medium">Access Restricted</span>
            <span className="text-gray-400 text-sm">
              You do not have permission to view this resource.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
