'use server';

import { verifySession } from '@/lib/dal';
import { db } from '@/db';
import { kommune } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { saneerWidgets } from '@/lib/widgets/validering';
import { DEFINITIONER } from '@/lib/widgets/definitioner';
import type { WidgetInstans } from '@/lib/widgets/types';

export async function updateDashboardWidgets(
  widgets: WidgetInstans[],
): Promise<{ ok: boolean; error?: string }> {
  const session = await verifySession();
  if (!session?.kommuneId) return { ok: false, error: 'Ikke autoriseret' };

  const saneret = saneerWidgets(widgets, DEFINITIONER);

  await db
    .update(kommune)
    .set({ publicWidgets: saneret, updatedAt: new Date() })
    .where(eq(kommune.id, session.kommuneId));

  return { ok: true };
}
