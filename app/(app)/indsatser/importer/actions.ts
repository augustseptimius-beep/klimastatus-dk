'use server';

import { verifySession } from '@/lib/dal';
import { db } from '@/db';
import { indsatsOmraade, tiltag } from '@/db/schema';
import { redirect } from 'next/navigation';

type ImportHandling = {
  titel: string;
  type: 'reduction' | 'adaptation' | 'both';
  status: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  beskrivelse?: string;
};

type ImportIndsats = {
  navn: string;
  type: 'ghg_reduction' | 'adaptation' | 'consumption' | 'just_transition' | 'cross_cutting';
  sektor: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  beskrivelse?: string;
  handlinger: ImportHandling[];
};

export async function bulkImportAction(indsatser: ImportIndsats[]): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');

  for (const io of indsatser) {
    const [created] = await db
      .insert(indsatsOmraade)
      .values({
        kommuneId: session.kommuneId,
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
          kommuneId: session.kommuneId!,
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

  redirect('/indsatser');
}
