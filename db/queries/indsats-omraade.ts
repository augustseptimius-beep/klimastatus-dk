import { db } from '@/db';
import { indsatsOmraade } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

type IndsatsOmraadeData = {
  kommuneId: string;
  navn: string;
  type: 'ghg_reduction' | 'adaptation' | 'consumption' | 'just_transition' | 'cross_cutting';
  sektor: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  beskrivelse?: string;
  ansvarligForvaltning?: string;
};

export async function getAllIndsatsOmraader(kommuneId: string) {
  return db.query.indsatsOmraade.findMany({
    where: eq(indsatsOmraade.kommuneId, kommuneId),
    orderBy: asc(indsatsOmraade.navn),
  });
}

export async function getIndsatsOmraadeById(id: string) {
  return db.query.indsatsOmraade.findFirst({
    where: eq(indsatsOmraade.id, id),
  });
}

export async function createIndsatsOmraade(data: IndsatsOmraadeData) {
  const [created] = await db.insert(indsatsOmraade).values(data).returning();
  return created;
}

export async function updateIndsatsOmraade(
  id: string,
  data: Partial<Omit<IndsatsOmraadeData, 'kommuneId'>>,
) {
  const [updated] = await db
    .update(indsatsOmraade)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(indsatsOmraade.id, id))
    .returning();
  return updated;
}

export async function deleteIndsatsOmraade(id: string) {
  await db.delete(indsatsOmraade).where(eq(indsatsOmraade.id, id));
}
