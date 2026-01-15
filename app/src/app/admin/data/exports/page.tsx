import { requireAuth } from '@/lib/auth/utils';

export default async function Page() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Exports</h1>
        <p className="mt-1 text-sm text-gray-500">Export system data</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="h-96 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center flex-col gap-4">
            <span className="text-gray-400">Content placeholder for Data Exports</span>
          </div>
        </div>
      </div>
    </div>
  );
}
