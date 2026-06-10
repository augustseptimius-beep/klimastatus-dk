'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { revalidatePath } from 'next/cache';
import { createLaeringspost } from '@/db/queries/laeringspost';
import { getTiltagById } from '@/db/queries/tiltag';
import { BESLUTNINGER } from '@/lib/merl/laeringspost-types';
import type { LaeringsBeslutning } from '@/lib/merl/laeringspost-types';
import { getKommuneById } from '@/db/queries';
import { createForespoergsel, getTovholdereForTiltag } from '@/db/queries/forespoergsel';
import { createMagicLink } from '@/db/queries/magic-link';
import { sendMagicLinkEmail } from '@/lib/email';

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

export async function indhentStatusAction(
  slug: string,
  tiltagId: string,
  formData: FormData,
): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  const tiltag = await getTiltagById(tiltagId);
  if (!tiltag || tiltag.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');

  const spoergsmaal = ((formData.get('spoergsmaal') as string) || '').trim() || null;

  const [tovholdere, kommuneRow] = await Promise.all([
    getTovholdereForTiltag(tiltagId),
    getKommuneById(kommune.id),
  ]);
  if (!kommuneRow) throw new Error('Kommune ikke fundet');

  const base = process.env.NODE_ENV === 'production'
    ? `https://${kommuneRow.subdomain}.klimastatus.dk`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
  const kanSendeMail = !!process.env.BREVO_API_KEY;

  for (const th of tovholdere) {
    await createForespoergsel({
      kommuneId: kommune.id,
      tovholderId: th.id,
      tiltagId,
      spoergsmaal,
    });
    if (kanSendeMail) {
      const token = await createMagicLink(th.id);
      await sendMagicLinkEmail(th.email, `${base}/rapport/${token}`, kommuneRow.navn);
    }
  }

  revalidatePath(`/k/${slug}/tiltag/${tiltagId}`);
}
