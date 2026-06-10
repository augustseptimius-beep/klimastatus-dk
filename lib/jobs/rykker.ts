import { db } from '@/db';
import { magicLink, tovholder, tovholderRapport } from '@/db/schema';
import { eq, gt, and } from 'drizzle-orm';
import { refreshMagicLink } from '@/db/queries/magic-link';
import { sendRykkerEmail } from '@/lib/email';
import { getKommuneById } from '@/db/queries';

/** Tovholdere er kollegaer: maks. 2 rykkere pr. runde, og aldrig tættere end 7 dage. */
export const MAX_RYKKERE = 2;
export const RYKKER_INTERVAL_DAGE = 7;

export type RykkerKandidat = {
  createdAt: Date;
  rykkerAntal: number;
  sidstRykketAt: Date | null;
};

/** Skal der sendes en rykker for dette link nu? (om der er svaret tjekkes separat) */
export function skalRykkes(link: RykkerKandidat, now: Date): boolean {
  if (link.rykkerAntal >= MAX_RYKKERE) return false;
  const sidstKontakt = link.sidstRykketAt ?? link.createdAt;
  const tidligst = sidstKontakt.getTime() + RYKKER_INTERVAL_DAGE * 24 * 60 * 60 * 1000;
  return now.getTime() >= tidligst;
}

export async function handleRykker(): Promise<void> {
  const now = new Date();

  const activeLinks = await db
    .select({
      id: magicLink.id,
      tovholderId: magicLink.tovholderId,
      createdAt: magicLink.createdAt,
      rykkerAntal: magicLink.rykkerAntal,
      sidstRykketAt: magicLink.sidstRykketAt,
    })
    .from(magicLink)
    .where(and(gt(magicLink.expiresAt, now), eq(magicLink.used, false)));

  // Deduplicate: keep most recent link per tovholder
  const latestByTovholder = new Map<string, (typeof activeLinks)[number]>();
  for (const link of activeLinks) {
    const existing = latestByTovholder.get(link.tovholderId);
    if (!existing || link.createdAt > existing.createdAt) {
      latestByTovholder.set(link.tovholderId, link);
    }
  }

  for (const link of latestByTovholder.values()) {
    if (!skalRykkes(link, now)) continue;

    const rapport = await db.query.tovholderRapport.findFirst({
      where: and(
        eq(tovholderRapport.tovholderId, link.tovholderId),
        gt(tovholderRapport.createdAt, link.createdAt),
      ),
    });
    if (rapport) continue;

    const th = await db.query.tovholder.findFirst({
      where: and(eq(tovholder.id, link.tovholderId), eq(tovholder.aktiv, true)),
    });
    if (!th) continue;

    const kommune = await getKommuneById(th.kommuneId);
    if (!kommune) continue;

    // Genbrug samme link-række, så rykker-tælleren følger runden.
    const token = await refreshMagicLink(link.id);
    const base = process.env.NODE_ENV === 'production'
      ? `https://${kommune.subdomain}.klimastatus.dk`
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

    await sendRykkerEmail(th.email, `${base}/rapport/${token}`, kommune.navn);
  }
}
