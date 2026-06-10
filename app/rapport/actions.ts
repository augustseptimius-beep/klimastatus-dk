'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { decryptTovholder } from '@/lib/tovholder-session';
import { upsertRapport } from '@/db/queries/rapport';
import { getForespoergselById, markForespoergselBesvaret } from '@/db/queries/forespoergsel';
import type { FormState } from '@/lib/definitions';

export async function besvarForespoergselAction(
  forespoergselId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tovholder-session')?.value;
  if (!token) return { message: 'Ikke autoriseret — brug linket fra din email.' };

  const session = await decryptTovholder(token);
  if (!session || new Date(session.expiresAt) < new Date()) {
    return { message: 'Session udløbet — brug linket fra din email igen.' };
  }

  const forespoergsel = await getForespoergselById(forespoergselId);
  if (!forespoergsel || forespoergsel.tovholderId !== session.tovholderId) {
    return { message: 'Forespørgslen kunne ikke findes.' };
  }
  if (forespoergsel.status === 'besvaret') {
    return { message: 'Allerede besvaret.' };
  }

  const dato = new Date().toISOString().split('T')[0];
  await upsertRapport(session.tovholderId, forespoergsel.tiltagId, dato, {
    statusImplementering: (formData.get('statusImplementering') as string) || undefined,
    barrierer: (formData.get('barrierer') as string) || undefined,
    forespoergselId,
  });
  await markForespoergselBesvaret(forespoergselId);

  revalidatePath('/rapport');
  return { message: 'Tak — status er sendt ✓' };
}
