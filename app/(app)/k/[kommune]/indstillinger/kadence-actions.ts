'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { kommune as kommuneSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const Schema = z.object({
  indhentningsKadence: z.enum(['maanedlig', 'kvartalsvis', 'halvaarlig', 'aarlig', 'manuel']),
});

export async function updateKadenceAction(slug: string, formData: FormData): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const parsed = Schema.safeParse({ indhentningsKadence: formData.get('indhentningsKadence') });
  if (!parsed.success) throw new Error('Ugyldig kadence');

  await db
    .update(kommuneSchema)
    .set({ indhentningsKadence: parsed.data.indhentningsKadence, updatedAt: new Date() })
    .where(eq(kommuneSchema.id, kommune.id));

  revalidatePath(`/k/${slug}/indstillinger`);
}
