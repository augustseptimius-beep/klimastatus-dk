'use server';
import { redirect } from 'next/navigation';
import { getMagicLinkByTokenHash, markMagicLinkUsed, hashToken } from '@/db/queries/magic-link';
import { getTovholderById } from '@/db/queries/tovholder';
import { createTovholderSession } from '@/lib/tovholder-session';
import { erMagicLinkGyldig } from '@/lib/magic-link-vurdering';

/**
 * Indløser et magic link: markerer det brugt og sætter tovholder-sessionen.
 * Kaldes fra bekræftelsessiden (POST) — aldrig fra GET, så mail-scannere
 * (Outlook SafeLinks m.fl.) ikke brænder engangslinket af før mennesket
 * når at klikke.
 *
 * Sessionen OVERSKRIVES altid ved gyldigt token, så en delt computer med en
 * gammel/fremmed tovholder-session ender med den rigtige identitet.
 */
export async function indloesMagicLinkAction(token: string): Promise<void> {
  const link = await getMagicLinkByTokenHash(hashToken(token));

  if (!erMagicLinkGyldig(link)) {
    redirect('/rapport/udloebet');
  }

  const tovholder = await getTovholderById(link!.tovholderId);
  if (!tovholder) {
    redirect('/rapport/udloebet');
  }

  await markMagicLinkUsed(link!.id);
  await createTovholderSession({
    tovholderId: tovholder!.id,
    kommuneId: tovholder!.kommuneId,
  });

  redirect('/rapport');
}
