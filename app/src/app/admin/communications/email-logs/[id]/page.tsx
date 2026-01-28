import Link from 'next/link';
import { requireAuth } from '@/lib/auth/utils';

export default async function EmailLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Log Detail</h1>
          <p className="mt-1 text-sm text-gray-500">Log ID: {id}</p>
        </div>
        <Link
          href="/admin/communications/email-logs"
          className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to Email Logs
        </Link>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="h-64 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center flex-col gap-2">
            <span className="text-gray-400">Email detail view coming soon</span>
            <span className="text-xs text-gray-400">Headers and full body will appear here.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
