'use server';
import { verifySession } from '@/lib/dal';
import { createIndsatsOmraade, updateIndsatsOmraade, deleteIndsatsOmraade } from '@/db/queries';
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
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await createIndsatsOmraade({ ...parsed.data, kommuneId: session.kommuneId });
  redirect('/indsatser');
}

export async function updateIndsatsOmraadeAction(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await updateIndsatsOmraade(id, parsed.data);
  redirect('/indsatser');
}

export async function deleteIndsatsOmraadeAction(id: string): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');
  await deleteIndsatsOmraade(id);
  redirect('/indsatser');
}
