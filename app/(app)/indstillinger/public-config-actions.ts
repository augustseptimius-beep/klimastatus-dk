'use server';

import { verifySession } from '@/lib/dal';
import { db } from '@/db';
import { kommune } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const Schema = z.object({
  publicEnabled: z.boolean(),
  publicStaleDays: z.number().int().min(7).max(365),
  publicHighlights: z.array(z.string().uuid()).max(5),
});

export async function updatePublicConfig(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await verifySession();
  if (!session?.kommuneId) return { ok: false, error: 'Ikke autoriseret' };

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' };

  await db
    .update(kommune)
    .set({
      publicEnabled: parsed.data.publicEnabled,
      publicStaleDays: parsed.data.publicStaleDays,
      publicHighlights: parsed.data.publicHighlights,
      updatedAt: new Date(),
    })
    .where(eq(kommune.id, session.kommuneId));

  return { ok: true };
}
