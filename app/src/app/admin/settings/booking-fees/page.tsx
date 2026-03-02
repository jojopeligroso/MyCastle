/**
 * Booking Fee Presets Settings Page
 * Admin interface to manage fee presets for bookings
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { bookingFeePresets } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { BookingFeePresetsClient } from './BookingFeePresetsClient';

interface FeePreset {
  id: string;
  feeType: string;
  label: string;
  amountEur: string;
  isDefault: boolean | null;
  sortOrder: number | null;
  isActive: boolean | null;
}

async function getFeePresets(): Promise<FeePreset[]> {
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      id: bookingFeePresets.id,
      feeType: bookingFeePresets.feeType,
      label: bookingFeePresets.label,
      amountEur: bookingFeePresets.amountEur,
      isDefault: bookingFeePresets.isDefault,
      sortOrder: bookingFeePresets.sortOrder,
      isActive: bookingFeePresets.isActive,
    })
    .from(bookingFeePresets)
    .where(eq(bookingFeePresets.tenantId, tenantId))
    .orderBy(bookingFeePresets.feeType, bookingFeePresets.sortOrder);

  return result.map(p => ({
    ...p,
    amountEur: p.amountEur || '0',
  }));
}

export default async function BookingFeesSettingsPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return <div>Error: No tenant ID available</div>;
  }

  const presets = await getFeePresets();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/admin/settings"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          &larr; Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Booking Fee Presets</h1>
        <p className="mt-2 text-gray-600">
          Configure preset fee options for bookings. These appear as dropdown options when creating
          or editing a booking.
        </p>
      </div>

      <BookingFeePresetsClient initialPresets={presets} tenantId={tenantId} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
