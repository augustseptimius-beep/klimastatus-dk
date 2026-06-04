'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { kommune as kommuneSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { saneerWidgets } from '@/lib/widgets/validering';
import { DEFINITIONER } from '@/lib/widgets/definitioner';
import type { WidgetInstans } from '@/lib/widgets/types';

export async function updateDashboardWidgets(
  slug: string,
  widgets: WidgetInstans[],
): Promise<{ ok: boolean; error?: string }> {
  const { kommune } = await requireKommuneContext(slug);
  const saneret = saneerWidgets(widgets, DEFINITIONER);
  await db
    .update(kommuneSchema)
    .set({ publicWidgets: saneret, updatedAt: new Date() })
    .where(eq(kommuneSchema.id, kommune.id));
  return { ok: true };
}
