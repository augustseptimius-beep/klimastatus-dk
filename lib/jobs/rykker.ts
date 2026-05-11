import { db } from '@/db';
import { magicLink, tovholder, tovholderRapport } from '@/db/schema';
import { eq, gt, and } from 'drizzle-orm';
import { createMagicLink } from '@/db/queries/magic-link';
import { sendRykkerEmail } from '@/lib/email';
import { getKommuneById } from '@/db/queries';

export async function handleRykker(): Promise<void> {
  const now = new Date();

  const activeLinks = await db
    .select({
      tovholderId: magicLink.tovholderId,
      createdAt: magicLink.createdAt,
    })
    .from(magicLink)
    .where(and(gt(magicLink.expiresAt, now), eq(magicLink.used, false)));

  // Deduplicate: keep most recent link per tovholder
  const latestByTovholder = new Map<string, Date>();
  for (const link of activeLinks) {
    const existing = latestByTovholder.get(link.tovholderId);
    if (!existing || link.createdAt > existing) {
      latestByTovholder.set(link.tovholderId, link.createdAt);
    }
  }

  for (const [tovholderId, linkCreatedAt] of latestByTovholder) {
    const rapport = await db.query.tovholderRapport.findFirst({
      where: and(
        eq(tovholderRapport.tovholderId, tovholderId),
        gt(tovholderRapport.createdAt, linkCreatedAt),
      ),
    });
    if (rapport) continue;

    const th = await db.query.tovholder.findFirst({
      where: and(eq(tovholder.id, tovholderId), eq(tovholder.aktiv, true)),
    });
    if (!th) continue;

    const kommune = await getKommuneById(th.kommuneId);
    if (!kommune) continue;

    const token = await createMagicLink(tovholderId);
    const base = process.env.NODE_ENV === 'production'
      ? `https://${kommune.subdomain}.klimastatus.dk`
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

    await sendRykkerEmail(th.email, `${base}/rapport/${token}`, kommune.navn);
  }
}
