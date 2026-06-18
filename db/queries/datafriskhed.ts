import { db } from '@/db';
import { kommune, kommuneIndikator, indikatorTemplate, indikatorMaaling, maal, indsatsOmraade } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { beregnIndsigter, type Indsigt, type IndikatorInput, type Kadence } from '@/lib/datafriskhed/motor';

export async function getDatafriskhed(kommuneId: string, nu: Date = new Date()): Promise<Indsigt[]> {
  const k = await db.query.kommune.findFirst({ where: eq(kommune.id, kommuneId) });
  if (!k) return [];

  // Aktive indikatorer + metadata
  const aktive = await db
    .select({
      kommuneIndikatorId: kommuneIndikator.id,
      visningsnavn: kommuneIndikator.visningsnavn,
      titel: indikatorTemplate.titel,
      kilde: indikatorTemplate.kilde,
      sidstHentet: kommuneIndikator.sidstHentet,
      sidsteFejl: kommuneIndikator.sidsteFejl,
      sidsteFejlBesked: kommuneIndikator.sidsteFejlBesked,
      indikatorId: kommuneIndikator.indikatorId,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(eq(kommuneIndikator.kommuneId, kommuneId), eq(kommuneIndikator.aktiv, true)));

  const indikatorer: IndikatorInput[] = [];
  let senesteEmissionsAar: number | null = null;
  let senesteDataopdatering: Date | null = null;

  for (const a of aktive) {
    // Seneste måling pr. indikator
    const [latest] = await db
      .select({ aar: indikatorMaaling.aar, dato: indikatorMaaling.dato })
      .from(indikatorMaaling)
      .where(eq(indikatorMaaling.indikatorId, a.indikatorId))
      .orderBy(desc(indikatorMaaling.aar))
      .limit(1);

    const maalDato = latest?.dato ? new Date(latest.dato) : null;
    indikatorer.push({
      kommuneIndikatorId: a.kommuneIndikatorId,
      visningsnavn: a.visningsnavn ?? a.titel,
      kilde: a.kilde,
      sidstHentet: a.sidstHentet,
      sidsteFejl: a.sidsteFejl,
      sidsteFejlBesked: a.sidsteFejlBesked,
      senesteMaalingDato: maalDato,
      senesteMaalingAar: latest?.aar ?? null,
    });

    // Emissions-friskhed: den klimaregnskab-sourcede indikators seneste år
    if (a.kilde === 'klimaregnskab' && latest?.aar != null) {
      senesteEmissionsAar = Math.max(senesteEmissionsAar ?? 0, latest.aar);
    }
    // Seneste dataopdatering på tværs (til kadence): nyeste sidstHentet eller målings-dato
    const opdat = a.sidstHentet ?? maalDato;
    if (opdat && (!senesteDataopdatering || opdat > senesteDataopdatering)) senesteDataopdatering = opdat;
  }

  // Reduktionsmål + antal (til delmål-tjek)
  const reduktionsMaalRows = await db
    .select({ id: maal.id })
    .from(maal)
    .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
    .where(and(eq(indsatsOmraade.kommuneId, kommuneId), eq(maal.kategori, 'reduction')));

  return beregnIndsigter(
    {
      senesteEmissionsAar,
      kadence: (k.indhentningsKadence as Kadence) ?? 'aarlig',
      senesteDataopdatering,
      indikatorer,
      harReduktionsMaal: reduktionsMaalRows.length > 0,
      antalReduktionsDelmaal: reduktionsMaalRows.length,
    },
    nu,
  );
}
