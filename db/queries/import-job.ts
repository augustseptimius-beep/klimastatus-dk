import { db } from '@/db';
import { importJob } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type NewImportJob = {
  kommuneId: string;
  filnavn: string;
  filtype: string;
  filindhold: string;
};

export type ImportJobRow = typeof importJob.$inferSelect;

export async function createImportJob(data: NewImportJob): Promise<ImportJobRow> {
  const [row] = await db.insert(importJob).values(data).returning();
  return row;
}

export async function getImportJob(id: string): Promise<ImportJobRow | undefined> {
  const rows = await db.select().from(importJob).where(eq(importJob.id, id)).limit(1);
  return rows[0];
}

export async function updateImportJobStatus(
  id: string,
  status: 'processing' | 'complete' | 'failed',
  opts?: { resultat?: unknown; fejl?: string },
): Promise<void> {
  await db
    .update(importJob)
    .set({
      status,
      resultat: opts?.resultat ?? null,
      fejl: opts?.fejl ?? null,
      opdateret: new Date(),
    })
    .where(eq(importJob.id, id));
}
