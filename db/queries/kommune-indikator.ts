import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, kommune } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getKommuneIndikatorById(id: string) {
  return db.query.kommuneIndikator.findFirst({ where: eq(kommuneIndikator.id, id) });
}

export async function getKommuneIndikatorer(kommuneId: string) {
  return db.query.kommuneIndikator.findMany({
    where: eq(kommuneIndikator.kommuneId, kommuneId),
  });
}

export type ActiveKommuneIndikator = {
  id: string;
  kommuneId: string;
  indikatorId: string;
  templateId: string;
  sidstHentet: Date | null;
  template: { kilde: string | null; apiQuery: string | null };
  kommune: { kommunekode: string };
};

export async function getActiveKommuneIndikatorer(kilde: 'klimaregnskab' | 'energidataservice' | 'dst'): Promise<ActiveKommuneIndikator[]> {
  return db
    .select({
      id: kommuneIndikator.id,
      kommuneId: kommuneIndikator.kommuneId,
      indikatorId: kommuneIndikator.indikatorId,
      templateId: kommuneIndikator.templateId,
      sidstHentet: kommuneIndikator.sidstHentet,
      template: {
        kilde: indikatorTemplate.kilde,
        apiQuery: indikatorTemplate.apiQuery,
      },
      kommune: {
        kommunekode: kommune.kommunekode,
      },
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .innerJoin(kommune, eq(kommuneIndikator.kommuneId, kommune.id))
    .where(and(eq(kommuneIndikator.aktiv, true), eq(indikatorTemplate.kilde, kilde)));
}

export async function createKommuneIndikator(data: {
  kommuneId: string;
  templateId: string;
  indikatorId: string;
}) {
  const [created] = await db.insert(kommuneIndikator).values(data).returning();
  return created;
}

export async function setKommuneIndikatorAktiv(id: string, aktiv: boolean) {
  await db.update(kommuneIndikator).set({ aktiv }).where(eq(kommuneIndikator.id, id));
}

export async function updateSidstHentet(id: string, tidspunkt: Date) {
  await db
    .update(kommuneIndikator)
    .set({ sidstHentet: tidspunkt, sidsteFejl: null, sidsteFejlBesked: null })
    .where(eq(kommuneIndikator.id, id));
}

export async function updateSidsteFejl(id: string, besked: string) {
  await db
    .update(kommuneIndikator)
    .set({ sidsteFejl: new Date(), sidsteFejlBesked: besked })
    .where(eq(kommuneIndikator.id, id));
}
