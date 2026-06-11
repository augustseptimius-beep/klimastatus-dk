'use server';

import type { ImportIndsats } from '@/lib/import/types';
import {
  lavMergePlan,
  beregnImportDiff,
  type EksisterendeKatalog,
  type ImportDiff,
} from '@/lib/import/merge-katalog';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { indsatsOmraade, tiltag } from '@/db/schema';
import { getAllIndsatsOmraader, getAllTiltag } from '@/db/queries';
import { syncCctfMappings } from '@/db/queries/cctf';
import { kriterierForIndsatsOmraade, kriterierForTiltag } from '@/lib/cctf/auto-mapping';
import { redirect } from 'next/navigation';

async function hentEksisterendeKatalog(kommuneId: string): Promise<EksisterendeKatalog> {
  const [indsatser, alleTiltag] = await Promise.all([
    getAllIndsatsOmraader(kommuneId),
    getAllTiltag(kommuneId),
  ]);
  const tiltagTitler = new Map<string, string[]>();
  for (const t of alleTiltag) {
    const titler = tiltagTitler.get(t.indsatsOmraadeId) ?? [];
    titler.push(t.titel);
    tiltagTitler.set(t.indsatsOmraadeId, titler);
  }
  return {
    indsatser: indsatser.map((io) => ({ id: io.id, navn: io.navn })),
    tiltagTitler,
  };
}

/** Diff til review-skærmen: hvad findes allerede, inden der oprettes noget. */
export async function importDiffAction(slug: string, indsatser: ImportIndsats[]): Promise<ImportDiff> {
  const { kommune } = await requireKommuneContext(slug);
  const eksisterende = await hentEksisterendeKatalog(kommune.id);
  return beregnImportDiff(eksisterende, indsatser);
}

export async function bulkImportAction(slug: string, indsatser: ImportIndsats[]): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  const eksisterende = await hentEksisterendeKatalog(kommune.id);
  const plan = lavMergePlan(eksisterende, indsatser);

  await db.transaction(async (tx) => {
    for (const p of plan.indsatser) {
      let indsatsId = p.eksisterendeId;

      if (!indsatsId) {
        const [created] = await tx
          .insert(indsatsOmraade)
          .values({
            kommuneId: kommune.id,
            navn: p.indsats.navn,
            type: p.indsats.type,
            sektor: p.indsats.sektor,
            beskrivelse: p.indsats.beskrivelse ?? null,
            aktiv: true,
          })
          .returning({ id: indsatsOmraade.id });
        indsatsId = created.id;
        await syncCctfMappings('indsatsomraade', indsatsId, kriterierForIndsatsOmraade(), tx);
      }

      if (p.nyeHandlinger.length > 0) {
        const oprettede = await tx.insert(tiltag).values(
          p.nyeHandlinger.map((h) => ({
            kommuneId: kommune.id,
            indsatsOmraadeId: indsatsId,
            titel: h.titel,
            type: h.type,
            status: h.status ?? 'planned',
            beskrivelse: h.beskrivelse ?? null,
            prioriteretTiltag: false,
          })),
        ).returning({ id: tiltag.id });
        for (const t of oprettede) {
          await syncCctfMappings('tiltag', t.id, kriterierForTiltag({ prioriteretTiltag: false }), tx);
        }
      }
    }
  });

  redirect(`/k/${slug}/indsatser`);
}
