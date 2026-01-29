/**
 * Enquiries List Page - View and manage student enquiries
 * MCP Resource: admin://enquiries
 * REQ: spec/01-admin-mcp.md §1.2.6
 * DESIGN: Task 1.10.1 - Enquiries List Page
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import { EnquiriesListPage } from './_components/EnquiriesListPage';

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

async function getEnquiries(tenantId: string): Promise<Enquiry[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/enquiries`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch enquiries:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.enquiries || [];
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return [];
  }
}

export default async function EnquiriesPage() {
  await requireAuth(['admin']);
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

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
