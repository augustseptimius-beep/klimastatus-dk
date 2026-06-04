'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { kommune as kommuneSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const Schema = z.object({
  publicEnabled: z.boolean(),
  publicStaleDays: z.number().int().min(7).max(365),
  publicHighlights: z.array(z.string().uuid()).max(5),
});

export async function updatePublicConfig(
  slug: string,
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const { kommune } = await requireKommuneContext(slug);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' };

  await db
    .update(kommuneSchema)
    .set({
      publicEnabled: parsed.data.publicEnabled,
      publicStaleDays: parsed.data.publicStaleDays,
      publicHighlights: parsed.data.publicHighlights,
      updatedAt: new Date(),
    })
    .where(eq(kommuneSchema.id, kommune.id));

  return { ok: true };
}
