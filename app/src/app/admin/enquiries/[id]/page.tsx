/**
 * Enquiry Detail Page - View and manage individual enquiry
 * REQ: ROADMAP.md §1.10.2 - Enquiry Detail View
 * DESIGN: Task 1.10.2 - Display full enquiry details with status management
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { enquiries } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import EnquiryDetail from '@/components/admin/enquiries/EnquiryDetail';

async function getEnquiry(enquiryId: string) {
  await requireAuth(['admin']);
  const tenantId = await getTenantId();

  if (!tenantId) {
    return null;
  }

  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  // Fetch enquiry
  const [enquiry] = await db
    .select()
    .from(enquiries)
    .where(and(eq(enquiries.id, enquiryId), eq(enquiries.tenantId, tenantId)))
    .limit(1);

  return enquiry || null;
}

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enquiry = await getEnquiry(id);

  if (!enquiry) {
    notFound();
  }

  return <EnquiryDetail enquiry={enquiry} />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
