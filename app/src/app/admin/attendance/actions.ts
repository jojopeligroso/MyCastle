'use server';

import { db } from '@/db';
import { attendance } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { revalidatePath } from 'next/cache';

export type AttendanceRecord = {
  studentId: string;
  status: string; // 'present', 'absent', 'late', 'excused'
  notes?: string;
};

export async function saveAttendance(sessionId: string, records: AttendanceRecord[]) {
  const user = await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) throw new Error('No tenant context');

  // Process regular upserts
  // In a real app with the "hash-chain" requirement, we'd need sequential inserting.
  // For this prototype, we'll just upsert current state.

  for (const record of records) {
    // Check if exists
    const existing = await db.query.attendance.findFirst({
      where: and(
        eq(attendance.classSessionId, sessionId),
        eq(attendance.studentId, record.studentId)
      ),
    });

    if (existing) {
      if (existing.status !== record.status || existing.notes !== record.notes) {
        await db
          .update(attendance)
          .set({
            status: record.status,
            notes: record.notes,
            updatedAt: new Date(),
            recordedBy: user.id,
          })
          .where(eq(attendance.id, existing.id));
      }
    } else {
      await db.insert(attendance).values({
        tenantId: tenantId,
        classSessionId: sessionId,
        studentId: record.studentId,
        status: record.status,
        notes: record.notes,
        recordedBy: user.id,
      });
    }
  }

  revalidatePath(`/admin/attendance/${sessionId}`);
  revalidatePath(`/admin/attendance`);
}
