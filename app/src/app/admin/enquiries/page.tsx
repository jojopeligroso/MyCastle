/**
 * Enquiries List Page - View and manage student enquiries
 * MCP Resource: admin://enquiries
 * REQ: spec/01-admin-mcp.md §1.2.6
 * DESIGN: Task 1.10.1 - Enquiries List Page
 */

import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import { EnquiriesListPage } from './_components/EnquiriesListPage';
import { db } from '@/db';
import { enquiries } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  programmeInterest: string | null;
  levelEstimate: string | null;
  startDatePreference: Date | null;
  status: string;
  source: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

async function getEnquiries(tenantId: string | null): Promise<Enquiry[]> {
  try {
    // Set RLS context (super admin sees all tenants)
    await setRLSContext(db);

    // Query enquiries with tenant filtering (unless super admin)
    const result = await db
      .select()
      .from(enquiries)
      .where(tenantId ? eq(enquiries.tenantId, tenantId) : undefined)
      .orderBy(desc(enquiries.createdAt));

    return result.map(enquiry => ({
      id: enquiry.id,
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      programmeInterest: enquiry.programmeInterest,
      levelEstimate: enquiry.levelEstimate,
      startDatePreference: enquiry.startDatePreference ? new Date(enquiry.startDatePreference) : null,
      status: enquiry.status,
      source: enquiry.source,
      notes: enquiry.notes,
      createdAt: enquiry.createdAt,
      updatedAt: enquiry.updatedAt,
    }));
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return [];
  }
}

export default async function EnquiriesPage() {
  await requireAuth(['admin']);
  const tenantId = await getTenantId();

  // Super admins may have null tenantId (see all tenants)
  const enquiries = await getEnquiries(tenantId);

  // Stats calculations
  const totalEnquiries = enquiries.length;
  const newEnquiries = enquiries.filter(e => e.status === 'new').length;
  const contactedEnquiries = enquiries.filter(e => e.status === 'contacted').length;
  const convertedEnquiries = enquiries.filter(e => e.status === 'converted').length;
  const conversionRate =
    totalEnquiries > 0 ? Math.round((convertedEnquiries / totalEnquiries) * 100) : 0;

  return (
    <EnquiriesListPage
      initialEnquiries={enquiries}
      stats={{
        total: totalEnquiries,
        new: newEnquiries,
        contacted: contactedEnquiries,
        converted: convertedEnquiries,
        conversionRate,
      }}
    />
  );
}
