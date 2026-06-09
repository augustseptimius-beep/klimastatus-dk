'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { revalidatePath } from 'next/cache';
import { createLaeringspost } from '@/db/queries/laeringspost';
import { getTiltagById } from '@/db/queries/tiltag';
import { BESLUTNINGER } from '@/lib/merl/laeringspost-types';
import type { LaeringsBeslutning } from '@/lib/merl/laeringspost-types';

export async function opretLaeringspostForTiltagAction(
  slug: string,
  tiltagId: string,
  formData: FormData,
): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  // Sikr at tiltaget tilhører kommunen — ellers no-op.
  const t = await getTiltagById(tiltagId);
  if (!t || t.kommuneId !== kommune.id) return;

  const beslutning = formData.get('beslutning') as string;
  const observation = ((formData.get('observation') as string) ?? '').trim();
  const dato = (formData.get('dato') as string) ?? '';
  if (!BESLUTNINGER.includes(beslutning as LaeringsBeslutning)) return;
  if (!observation || !dato) return;

  const fortolkning = ((formData.get('fortolkning') as string) ?? '').trim();
  const beslutningstager = ((formData.get('beslutningstager') as string) ?? '').trim();

  await createLaeringspost({
    kommuneId: kommune.id,
    knyttetTilType: 'tiltag',
    knyttetTilId: tiltagId,
    observation,
    fortolkning: fortolkning || null,
    beslutning: beslutning as LaeringsBeslutning,
    beslutningstager: beslutningstager || null,
    dato,
    tovholderRapportId: null,
  });

  revalidatePath(`/k/${slug}/tiltag/${tiltagId}`);
}
