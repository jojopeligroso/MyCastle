/**
 * Accommodation Presets Settings Page
 * Admin interface to manage accommodation type presets
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { accommodationPresets } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { AccommodationPresetsClient } from './AccommodationPresetsClient';

interface AccommodationPreset {
  id: string;
  name: string;
  description: string | null;
  pricePerWeekEur: string;
  depositEur: string | null;
  isDefault: boolean | null;
  sortOrder: number | null;
  isActive: boolean | null;
}

async function getAccommodationPresets(): Promise<AccommodationPreset[]> {
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      id: accommodationPresets.id,
      name: accommodationPresets.name,
      description: accommodationPresets.description,
      pricePerWeekEur: accommodationPresets.pricePerWeekEur,
      depositEur: accommodationPresets.depositEur,
      isDefault: accommodationPresets.isDefault,
      sortOrder: accommodationPresets.sortOrder,
      isActive: accommodationPresets.isActive,
    })
    .from(accommodationPresets)
    .where(eq(accommodationPresets.tenantId, tenantId))
    .orderBy(accommodationPresets.sortOrder);

  return result.map(p => ({
    ...p,
    pricePerWeekEur: p.pricePerWeekEur || '0',
    depositEur: p.depositEur || '0',
  }));
}

export default async function AccommodationPresetsSettingsPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return <div>Error: No tenant ID available</div>;
  }

  const presets = await getAccommodationPresets();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/admin/settings"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          &larr; Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Accommodation Presets</h1>
        <p className="mt-2 text-gray-600">
          Configure accommodation type options and pricing. These appear as dropdown options when
          creating or editing a booking.
        </p>
      </div>

      <AccommodationPresetsClient initialPresets={presets} tenantId={tenantId} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
