'use server';

import { db } from '@/db';
import { accommodationPresets } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getTenantId } from '@/lib/auth/utils';

interface CreatePresetData {
  tenantId: string;
  name: string;
  description: string | null;
  pricePerWeekEur: string;
  depositEur: string;
}

export async function createAccommodationPreset(data: CreatePresetData) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId || tenantId !== data.tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get max sort order
    const maxSortResult = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(sort_order), 0)` })
      .from(accommodationPresets)
      .where(eq(accommodationPresets.tenantId, tenantId));

    const nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;

    await db.insert(accommodationPresets).values({
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      pricePerWeekEur: data.pricePerWeekEur,
      depositEur: data.depositEur,
      sortOrder: nextSortOrder,
      isDefault: false,
      isActive: true,
    });

    revalidatePath('/admin/settings/accommodation-presets');
    return { success: true };
  } catch (error) {
    console.error('Failed to create accommodation preset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create preset',
    };
  }
}

interface UpdatePresetData {
  name: string;
  description: string | null;
  pricePerWeekEur: string;
  depositEur: string;
}

export async function updateAccommodationPreset(id: string, data: UpdatePresetData) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    await db
      .update(accommodationPresets)
      .set({
        name: data.name,
        description: data.description,
        pricePerWeekEur: data.pricePerWeekEur,
        depositEur: data.depositEur,
        updatedAt: new Date(),
      })
      .where(and(eq(accommodationPresets.id, id), eq(accommodationPresets.tenantId, tenantId)));

    revalidatePath('/admin/settings/accommodation-presets');
    return { success: true };
  } catch (error) {
    console.error('Failed to update accommodation preset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preset',
    };
  }
}

export async function deleteAccommodationPreset(id: string) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Check if this is the default - don't allow deleting the default
    const [preset] = await db
      .select({ isDefault: accommodationPresets.isDefault })
      .from(accommodationPresets)
      .where(and(eq(accommodationPresets.id, id), eq(accommodationPresets.tenantId, tenantId)))
      .limit(1);

    if (preset?.isDefault) {
      return {
        success: false,
        error: 'Cannot delete the default preset. Set another as default first.',
      };
    }

    await db
      .delete(accommodationPresets)
      .where(and(eq(accommodationPresets.id, id), eq(accommodationPresets.tenantId, tenantId)));

    revalidatePath('/admin/settings/accommodation-presets');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete accommodation preset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete preset',
    };
  }
}

export async function setDefaultAccommodationPreset(id: string) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // First, unset current default
    await db
      .update(accommodationPresets)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(eq(accommodationPresets.tenantId, tenantId), eq(accommodationPresets.isDefault, true))
      );

    // Then set the new default
    await db
      .update(accommodationPresets)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(accommodationPresets.id, id), eq(accommodationPresets.tenantId, tenantId)));

    revalidatePath('/admin/settings/accommodation-presets');
    return { success: true };
  } catch (error) {
    console.error('Failed to set default accommodation preset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set default',
    };
  }
}
