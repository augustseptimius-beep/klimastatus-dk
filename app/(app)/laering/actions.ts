'use server';
import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createLaeringspost, deleteLaeringspost } from '@/db/queries/laeringspost';
import type { LaeringsBeslutning, LaeringsKnytning } from '@/lib/merl/laeringspost-types';
import { BESLUTNINGER } from '@/lib/merl/laeringspost-types';

const KNYTNINGER: LaeringsKnytning[] = ['tiltag', 'indsatsomraade', 'maal'];

export async function opretLaeringspostAction(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const knyttetTilType = formData.get('knyttetTilType') as string;
  const beslutning = formData.get('beslutning') as string;
  const knyttetTilId = (formData.get('knyttetTilId') as string) ?? '';
  const observation = ((formData.get('observation') as string) ?? '').trim();
  const dato = (formData.get('dato') as string) ?? '';

  // Validering — afvis ugyldige enum-værdier og tomme påkrævede felter
  if (!KNYTNINGER.includes(knyttetTilType as LaeringsKnytning)) return;
  if (!BESLUTNINGER.includes(beslutning as LaeringsBeslutning)) return;
  if (!knyttetTilId || !observation || !dato) return;

  const rapportRaw = (formData.get('tovholderRapportId') as string) ?? '';
  const fortolkningRaw = ((formData.get('fortolkning') as string) ?? '').trim();
  const beslutningstagerRaw = ((formData.get('beslutningstager') as string) ?? '').trim();

  await createLaeringspost({
    kommuneId: session.kommuneId,
    knyttetTilType: knyttetTilType as LaeringsKnytning,
    knyttetTilId,
    observation,
    fortolkning: fortolkningRaw || null,
    beslutning: beslutning as LaeringsBeslutning,
    beslutningstager: beslutningstagerRaw || null,
    dato,
    tovholderRapportId: rapportRaw || null,
  });

  revalidatePath('/laering');
}

export async function sletLaeringspostAction(id: string): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');
  await deleteLaeringspost(id, session.kommuneId);
  revalidatePath('/laering');
}
