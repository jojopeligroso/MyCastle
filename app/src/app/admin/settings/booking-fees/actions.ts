'use server';

import { db } from '@/db';
import { bookingFeePresets } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getTenantId } from '@/lib/auth/utils';

interface CreatePresetData {
  tenantId: string;
  feeType: string;
  label: string;
  amountEur: string;
}

export async function createFeePreset(data: CreatePresetData) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId || tenantId !== data.tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get max sort order for this fee type
    const maxSortResult = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(sort_order), 0)` })
      .from(bookingFeePresets)
      .where(and(eq(bookingFeePresets.tenantId, tenantId), eq(bookingFeePresets.feeType, data.feeType)));

    const nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;

    await db.insert(bookingFeePresets).values({
      tenantId: data.tenantId,
      feeType: data.feeType,
      label: data.label,
      amountEur: data.amountEur,
      sortOrder: nextSortOrder,
      isDefault: false,
      isActive: true,
    });

    revalidatePath('/admin/settings/booking-fees');
    return { success: true };
  } catch (error) {
    console.error('Failed to create fee preset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create preset',
    };
  }
}

interface UpdatePresetData {
  label: string;
  amountEur: string;
}

export async function updateFeePreset(id: string, data: UpdatePresetData) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    await db
      .update(bookingFeePresets)
      .set({
        label: data.label,
        amountEur: data.amountEur,
        updatedAt: new Date(),
      })
      .where(and(eq(bookingFeePresets.id, id), eq(bookingFeePresets.tenantId, tenantId)));

    revalidatePath('/admin/settings/booking-fees');
    return { success: true };
  } catch (error) {
    console.error('Failed to update fee preset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preset',
    };
  }
}

export async function deleteFeePreset(id: string) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Check if this is the default - don't allow deleting the default
    const [preset] = await db
      .select({ isDefault: bookingFeePresets.isDefault })
      .from(bookingFeePresets)
      .where(and(eq(bookingFeePresets.id, id), eq(bookingFeePresets.tenantId, tenantId)))
      .limit(1);

    if (preset?.isDefault) {
      return { success: false, error: 'Cannot delete the default preset. Set another as default first.' };
    }

    await db
      .delete(bookingFeePresets)
      .where(and(eq(bookingFeePresets.id, id), eq(bookingFeePresets.tenantId, tenantId)));

    revalidatePath('/admin/settings/booking-fees');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete fee preset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete preset',
    };
  }
}

export async function setDefaultPreset(id: string, feeType: string) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // First, unset current default for this fee type
    await db
      .update(bookingFeePresets)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(bookingFeePresets.tenantId, tenantId),
          eq(bookingFeePresets.feeType, feeType),
          eq(bookingFeePresets.isDefault, true)
        )
      );

    // Then set the new default
    await db
      .update(bookingFeePresets)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(bookingFeePresets.id, id), eq(bookingFeePresets.tenantId, tenantId)));

    revalidatePath('/admin/settings/booking-fees');
    return { success: true };
  } catch (error) {
    console.error('Failed to set default preset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set default',
    };
  }
}
