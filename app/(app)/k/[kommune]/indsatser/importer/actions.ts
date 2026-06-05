'use server';

import type { ImportIndsats } from '@/lib/import/types';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { indsatsOmraade, tiltag } from '@/db/schema';
import { redirect } from 'next/navigation';

export async function bulkImportAction(slug: string, indsatser: ImportIndsats[]): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  for (const io of indsatser) {
    const [created] = await db
      .insert(indsatsOmraade)
      .values({
        kommuneId: kommune.id,
        navn: io.navn,
        type: io.type,
        sektor: io.sektor,
        beskrivelse: io.beskrivelse ?? null,
        aktiv: true,
      })
      .returning({ id: indsatsOmraade.id });

    if (io.handlinger.length > 0) {
      await db.insert(tiltag).values(
        io.handlinger.map((h) => ({
          kommuneId: kommune.id,
          indsatsOmraadeId: created.id,
          titel: h.titel,
          type: h.type,
          status: h.status ?? 'planned',
          beskrivelse: h.beskrivelse ?? null,
          prioriteretTiltag: false,
        })),
      );
    }
  }

  redirect(`/k/${slug}/indsatser`);
}
