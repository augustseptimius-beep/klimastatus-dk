'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { createIndsatsOmraade, updateIndsatsOmraade, deleteIndsatsOmraade, getIndsatsOmraadeById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/lib/definitions';

const schema = z.object({
  navn: z.string().min(1, 'Navn er påkrævet'),
  type: z.enum(['ghg_reduction', 'adaptation', 'consumption', 'just_transition', 'cross_cutting']),
  sektor: z.enum(['energy', 'transport', 'buildings', 'food', 'agriculture', 'waste', 'adaptation', 'other']),
  beskrivelse: z.string().optional(),
  ansvarligForvaltning: z.string().optional(),
});

export async function createIndsatsOmraadeAction(
  slug: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await createIndsatsOmraade({ ...parsed.data, kommuneId: kommune.id });
  redirect(`/k/${slug}/indsatser`);
}

export async function updateIndsatsOmraadeAction(
  slug: string,
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const existing = await getIndsatsOmraadeById(id);
  if (!existing || existing.kommuneId !== kommune.id) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await updateIndsatsOmraade(id, parsed.data);
  redirect(`/k/${slug}/indsatser`);
}

export async function deleteIndsatsOmraadeAction(slug: string, id: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const existing = await getIndsatsOmraadeById(id);
  if (!existing || existing.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  await deleteIndsatsOmraade(id);
  redirect(`/k/${slug}/indsatser`);
}
