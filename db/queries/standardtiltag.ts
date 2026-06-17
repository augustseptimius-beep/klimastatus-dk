import { db } from '@/db';
import { standardtiltag } from '@/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

type Kategori = 'energi' | 'transport' | 'landbrug_areal' | 'scope3';

export async function getStandardtiltagKatalog(kategori?: Kategori) {
  return db.query.standardtiltag.findMany({
    where: kategori
      ? and(eq(standardtiltag.aktiv, true), eq(standardtiltag.kategori, kategori))
      : eq(standardtiltag.aktiv, true),
    orderBy: [asc(standardtiltag.kategori), desc(standardtiltag.udbredelsesProcent)],
  });
}
