import { db } from '@/db';
import { indikatorTemplate } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function getAllTemplates() {
  return db.query.indikatorTemplate.findMany({ orderBy: asc(indikatorTemplate.titel) });
}

export async function getActiveTemplates() {
  return db.query.indikatorTemplate.findMany({
    where: eq(indikatorTemplate.aktiv, true),
    orderBy: asc(indikatorTemplate.titel),
  });
}

export async function getTemplateById(id: string) {
  return db.query.indikatorTemplate.findFirst({ where: eq(indikatorTemplate.id, id) });
}

export async function createTemplate(data: {
  titel: string;
  enhed: string;
  beskrivelse: string;
  cctfKriterier: number[];
  kilde?: 'klimaregnskab' | 'energidataservice' | 'dst';
  apiQuery?: string;
  niveau?: 'output' | 'outcome' | 'impact';
  sektor?: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  nationalMaalvaerdi?: number;
  nationalMaalvaerdiNote?: string;
  dataProvenans?: 'top_down' | 'bottom_up';
  dataKarakter?: 'aggregeret' | 'operationel';
}) {
  const [created] = await db.insert(indikatorTemplate).values(data).returning();
  return created;
}

export async function setTemplateAktiv(id: string, aktiv: boolean) {
  const [updated] = await db
    .update(indikatorTemplate)
    .set({ aktiv, updatedAt: new Date() })
    .where(eq(indikatorTemplate.id, id))
    .returning();
  return updated;
}
