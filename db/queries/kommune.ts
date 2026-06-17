import { db } from '@/db';
import { kommune } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { Kommunetype } from '@/lib/kataloger/kommunetype';

export async function getAllKommuner() {
  return db.query.kommune.findMany({ orderBy: asc(kommune.navn) });
}

export async function getKommuneById(id: string) {
  return db.query.kommune.findFirst({ where: eq(kommune.id, id) });
}

export async function getKommuneBySubdomain(subdomain: string) {
  return db.query.kommune.findFirst({ where: eq(kommune.subdomain, subdomain) });
}

export async function createKommune(data: {
  navn: string;
  kommunekode: string;
  subdomain: string;
  kommunetype?: Kommunetype;
}) {
  const [created] = await db.insert(kommune).values(data).returning();
  return created;
}

export async function deleteKommune(id: string) {
  await db.delete(kommune).where(eq(kommune.id, id));
}
