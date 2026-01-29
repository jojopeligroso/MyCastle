import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { EmailLogsList, type EmailLog } from '@/components/admin/EmailLogsList';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { emailLogs } from '@/db/schema';
import { desc, eq, gte, ilike, lte, or } from 'drizzle-orm';

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

type EmailLogFilters = {
  search?: string;
  from?: string;
  to?: string;
  status?: string;
};

async function getEmailLogs(tenantId: string, filters: EmailLogFilters): Promise<EmailLog[]> {
  let query = db.select().from(emailLogs).where(eq(emailLogs.tenant_id, tenantId)).$dynamic();

  if (filters.search) {
    query = query.where(
      or(
        ilike(emailLogs.recipient, `%${filters.search}%`),
        ilike(emailLogs.subject, `%${filters.search}%`)
      )
    );
  }

  if (filters.status) {
    query = query.where(eq(emailLogs.status, filters.status));
  }

  if (filters.from) {
    const fromDate = new Date(filters.from);
    if (!Number.isNaN(fromDate.getTime())) {
      query = query.where(gte(emailLogs.sent_at, fromDate));
    }
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      query = query.where(lte(emailLogs.sent_at, toDate));
    }
  }

  return query.orderBy(desc(emailLogs.sent_at));
}

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const params = (await searchParams) || {};
  const filters: EmailLogFilters = {
    search: typeof params.search === 'string' ? params.search : undefined,
    from: typeof params.from === 'string' ? params.from : undefined,
    to: typeof params.to === 'string' ? params.to : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
  };

  const logs = await getEmailLogs(tenantId, filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
        <p className="mt-1 text-sm text-gray-500">View delivery logs</p>
      </div>

      <EmailLogsList logs={logs} filters={filters} />
    </div>
  );
}
