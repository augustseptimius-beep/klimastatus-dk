'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { createTiltag, updateTiltag, getTiltagById, getIndsatsOmraadeById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/lib/definitions';

const schema = z.object({
  indsatsOmraadeId: z.string().min(1, 'Indsatsområde er påkrævet'),
  titel: z.string().min(1, 'Titel er påkrævet'),
  type: z.enum(['reduction', 'adaptation', 'both']),
  status: z.enum(['planned', 'in_progress', 'completed', 'discontinued']).default('planned'),
  beskrivelse: z.string().optional(),
  tidsrammeStart: z.string().optional().transform((v) => v?.trim() || undefined),
  tidsrammeSlut: z.string().optional().transform((v) => v?.trim() || undefined),
  forventetEffektCo2Ton: z.string().optional().transform((v) => (v?.trim() ? parseFloat(v) : undefined)),
});

export async function createTiltagAction(slug: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const indsatsOmraade = await getIndsatsOmraadeById(parsed.data.indsatsOmraadeId);
  if (!indsatsOmraade || indsatsOmraade.kommuneId !== kommune.id) return { message: 'Ugyldigt indsatsområde' };

  await createTiltag({ ...parsed.data, kommuneId: kommune.id });
  redirect(`/k/${slug}/tiltag`);
}

export async function updateTiltagAction(
  slug: string,
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const existing = await getTiltagById(id);
  if (!existing || existing.kommuneId !== kommune.id) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const indsatsOmraade = await getIndsatsOmraadeById(parsed.data.indsatsOmraadeId);
  if (!indsatsOmraade || indsatsOmraade.kommuneId !== kommune.id) return { message: 'Ugyldigt indsatsområde' };

  await updateTiltag(id, parsed.data);
  redirect(`/k/${slug}/tiltag`);
}
