'use server';
import { verifySession } from '@/lib/dal';
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
  tidsrammeStart: z.string().optional(),
  tidsrammeSlut: z.string().optional(),
  forventetEffektCo2Ton: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
});

export async function createTiltagAction(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const indsatsOmraade = await getIndsatsOmraadeById(parsed.data.indsatsOmraadeId);
  if (!indsatsOmraade || indsatsOmraade.kommuneId !== session.kommuneId) return { message: 'Ugyldigt indsatsområde' };

  await createTiltag({ ...parsed.data, kommuneId: session.kommuneId });
  redirect('/tiltag');
}

export async function updateTiltagAction(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const existing = await getTiltagById(id);
  if (!existing || existing.kommuneId !== session.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const indsatsOmraade = await getIndsatsOmraadeById(parsed.data.indsatsOmraadeId);
  if (!indsatsOmraade || indsatsOmraade.kommuneId !== session.kommuneId) return { message: 'Ugyldigt indsatsområde' };

  await updateTiltag(id, parsed.data);
  redirect('/tiltag');
}
