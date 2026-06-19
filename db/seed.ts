import { hash } from '@node-rs/argon2';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, count, isNull, and } from 'drizzle-orm';
import { cctfKriterie, user, indikatorMaaling, kommuneIndikator, kommune } from './schema';
import { seedGroenkobing } from './seeds/groenkobing';
import { ALLE_KOMMUNER } from '../lib/kommuner-liste';
import { handleFetchKlimaregnskabet } from '../lib/jobs/fetch-klimaregnskabet';
import { handleFetchEnergidataservice } from '../lib/jobs/fetch-energidataservice';
import { handleFetchDst } from '../lib/jobs/fetch-dst';
import { STANDARDTILTAG_KATALOG } from '../lib/kataloger/standardtiltag-katalog';
import { OMSTILLINGSINDIKATORER } from '../lib/kataloger/omstillingsindikatorer';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const CCTF_V25_CRITERIA = [
  {
    version: '2.5',
    kriterieNr: 1,
    komponent: 'Forpligtelse, styring og mainstreaming',
    titel: 'Offentlig forpligtelse',
    beskrivelse: 'Offentlig forpligtelse fra siddende borgmester (eller kommunalbestyrelse) til at igangsætte hurtig, rimelig og retfærdig handling ved anvendelse af tilgængelige beføjelser og indflydelse til at opnå netto-nuludledning og styrke klimarobustheden i overensstemmelse med Parisaftalens højeste ambition (1.5°C).',
  },
  {
    version: '2.5',
    kriterieNr: 2,
    komponent: 'Forpligtelse, styring og mainstreaming',
    titel: 'Klimaintegration i styring',
    beskrivelse: 'Klimaforpligtelser og -hensyn er integreret i interne styrings- og beslutningsstrukturer, processer og funktioner, hvilket sikrer, at klimapåvirkningen overvejes og inkluderes som en del af kommunens øvrige prioriteter.',
  },
  {
    version: '2.5',
    kriterieNr: 3,
    komponent: 'Inkluderende inddragelse og kommunikation',
    titel: 'Inddragelse af interessenter',
    beskrivelse: 'Inddragelse af forskellige interessenter for at indsamle information til brug i klimaplanlægningen samt for at advokere for - og skabe opbakning til - klimaindsatsen. Interessenterne bør omfatte dem, der påvirkes mest af klimaforandringerne og klimatiltagene, samt dem, der har magt, indflydelse og potentiale til at reducere emissioner og klimarisici.',
  },
  {
    version: '2.5',
    kriterieNr: 4,
    komponent: 'Inkluderende inddragelse og kommunikation',
    titel: 'Kommunikation og samarbejde',
    beskrivelse: 'Kommunikation til og samarbejde med lokalsamfundet og andre interessenter som en del af klimaindsatsen.',
  },
  {
    version: '2.5',
    kriterieNr: 5,
    komponent: 'Viden som grundlag for mål, strategier og handlinger',
    titel: 'Klimarisici og sårbarhed',
    beskrivelse: 'Vidensgrundlag for klimatilpasning baseret på identificering af klimafarer, klimarelaterede risici og sårbarheder.',
  },
  {
    version: '2.5',
    kriterieNr: 6,
    komponent: 'Viden som grundlag for mål, strategier og handlinger',
    titel: 'Vidensgrundlag for reduktion',
    beskrivelse: 'Vidensgrundlag for reduktion af drivhusgasudledninger baseret på drivhusgasregnskab, fremskrivning og analyse af tilgængelige beføjelser.',
  },
  {
    version: '2.5',
    kriterieNr: 7,
    komponent: 'Viden som grundlag for mål, strategier og handlinger',
    titel: 'Retfærdighed og rimelighed',
    beskrivelse: 'Vidensgrundlag for retfærdighed og rimelighed, der identificerer sårbare og marginaliserede grupper og sociale konsekvenser af klimaforandringer og klimatiltag.',
  },
  {
    version: '2.5',
    kriterieNr: 8,
    komponent: 'Mål for hele kommunen, understøttet af sektorstrategier',
    titel: 'Reduktionsmål',
    beskrivelse: 'Mål for reduktion af drivhusgasudledninger på kort, mellemlang og lang sigt i overensstemmelse med Parisaftalens 1.5°C-ambition.',
  },
  {
    version: '2.5',
    kriterieNr: 9,
    komponent: 'Mål for hele kommunen, understøttet af sektorstrategier',
    titel: 'Tilpasningsmål',
    beskrivelse: 'Mål for klimatilpasning og øget klimarobusthed på kort, mellemlang og lang sigt.',
  },
  {
    version: '2.5',
    kriterieNr: 10,
    komponent: 'Mål for hele kommunen, understøttet af sektorstrategier',
    titel: 'Retfærdighedsmål',
    beskrivelse: 'Mål på kort, mellemlang og lang sigt, der skal sikre, at klimatiltag bidrager til at fremme social, miljømæssig og økonomisk rimelighed, retfærdighed og lighed.',
  },
  {
    version: '2.5',
    kriterieNr: 11,
    komponent: 'Mål for hele kommunen, understøttet af sektorstrategier',
    titel: 'Sektorstrategier',
    beskrivelse: 'Sektorspecifikke strategier, der tilsammen opfylder kommunens mål for klimatilpasning, netto-nuludledning samt rimelighed og retfærdighed.',
  },
  {
    version: '2.5',
    kriterieNr: 12,
    komponent: 'Handlinger og implementeringsplanlægning baseret på vidensgrundlaget',
    titel: 'Tiltag',
    beskrivelse: 'Tilpasnings- og reduktionstiltag, der er baseret på vidensgrundlaget, mål og delmål, som demonstrerer brug af alle tilgængelige beføjelser, partnerskaber og indflydelse.',
  },
  {
    version: '2.5',
    kriterieNr: 13,
    komponent: 'Handlinger og implementeringsplanlægning baseret på vidensgrundlaget',
    titel: 'Udfasning af fossile brændstoffer',
    beskrivelse: 'Kommunen skal bruge alle tilgængelige beføjelser til at stoppe brugen af og støtten til fossile brændstoffer. Dette omfatter at tage alle tilgængelige skridt for at sikre, at der ikke bygges/udvides/forlænges nye el- og varmeproduktionsanlæg eller udvindingsanlæg til fossile brændstoffer, og at alle kulfyrede kraftværker er udfaset inden 2030.',
  },
  {
    version: '2.5',
    kriterieNr: 14,
    komponent: 'Handlinger og implementeringsplanlægning baseret på vidensgrundlaget',
    titel: 'Implementeringsplanlægning',
    beskrivelse: 'Implementeringsplanlægning for prioriterede handlinger, der er blevet identificeret på kort sigt. Dette bør omfatte: understøttende tiltag, implementeringsplan, tidsramme og milepæle, berørte interessenter, detaljerede omkostninger, finansiering og finansieringsmetode, fordeling af merværdier, indikatorer.',
  },
  {
    version: '2.5',
    kriterieNr: 15,
    komponent: 'Monitorering, evaluering og rapportering af fremdrift med fokus på læring',
    titel: 'MERL-system',
    beskrivelse: 'Et system til monitorering, evaluering, rapportering og læring af erfaringer (MERL) fra implementering af klimatiltag, som omfatter et sæt indikatorer til at vurdere implementering af tiltag og fremskridt på output-, outcome- og impactniveau.',
  },
  {
    version: '2.5',
    kriterieNr: 16,
    komponent: 'Monitorering, evaluering og rapportering af fremdrift med fokus på læring',
    titel: 'Offentlig rapportering',
    beskrivelse: 'Løbende offentlig kommunikation og rapportering af status for implementering af klimaplanen og fremdrift mod klimamålene.',
  },
];

async function seed() {
  console.log('Seeding CCTF v2.5 criteria...');
  await db.insert(cctfKriterie).values(CCTF_V25_CRITERIA).onConflictDoNothing();
  console.log(`Seeded ${CCTF_V25_CRITERIA.length} criteria.`);

  console.log('Seeding admin user...');
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123!';
  const passwordHash = await hash(adminPassword);
  await db
    .insert(user)
    .values({
      email: 'augustseptimius@gmail.com',
      passwordHash,
      navn: 'August Septimius',
      role: 'admin',
    })
    .onConflictDoNothing();
  console.log('Admin user seeded (email: augustseptimius@gmail.com).');

  console.log('Backfilling kommunetype...');
  for (const k of ALLE_KOMMUNER) {
    await db.update(kommune)
      .set({ kommunetype: k.type })
      .where(and(eq(kommune.kommunekode, k.kode), isNull(kommune.kommunetype)));
  }
  console.log('Kommunetype backfill done.');

  console.log('Seeding indicator templates...');
  const { indikatorTemplate } = await import('./schema');
  await db.insert(indikatorTemplate).values([
    {
      titel: 'Samlet CO₂e pr. capita',
      kilde: 'klimaregnskab',
      apiQuery: JSON.stringify({ type: 'Nøgletal', sektor: 'Samlet' }),
      enhed: 'ton CO₂e/indb.',
      beskrivelse: 'Kommunens samlede drivhusgasudledning pr. indbygger. Kilde: Klimaregnskabet.dk.',
      cctfKriterier: [6, 11, 15],
      aktiv: true,
      dataProvenans: 'top_down' as const,
      dataKarakter: 'aggregeret' as const,
    },
    {
      titel: 'VE-kapacitet (vind + sol)',
      kilde: 'energidataservice',
      apiQuery: JSON.stringify({ dataset: 'CapacityPerMunicipality', fields: ['OnshoreWindMW', 'SolarPowerMW'] }),
      enhed: 'MW',
      beskrivelse: 'Samlet installeret kapacitet for landvind og solenergi i kommunen. Kilde: Energi Data Service.',
      cctfKriterier: [7, 11],
      aktiv: true,
      dataProvenans: 'top_down' as const,
      dataKarakter: 'aggregeret' as const,
    },
    {
      titel: 'Befolkningstal',
      kilde: 'dst',
      apiQuery: JSON.stringify({ tabel: 'FOLK1A', variabler: { KØN: 'TOT', ALDER: 'IALT' }, felt: 'INDHOLD' }),
      enhed: 'antal',
      beskrivelse: 'Kommunens samlede folketal. Bruges til beregning af pr.-capita-indikatorer. Kilde: Danmarks Statistik.',
      cctfKriterier: [],
      aktiv: true,
      dataProvenans: 'top_down' as const,
      dataKarakter: 'aggregeret' as const,
    },
  ] as const).onConflictDoUpdate({
    target: indikatorTemplate.titel,
    set: { updatedAt: new Date(), dataProvenans: 'top_down', dataKarakter: 'aggregeret' },
  });
  console.log('Seeded 3 indicator templates.');

  console.log('Seeding standardtiltag-katalog...');
  const { standardtiltag } = await import('./schema');
  await db.insert(standardtiltag).values(
    STANDARDTILTAG_KATALOG.map((t) => ({
      titel: t.titel,
      kategori: t.kategori,
      udbredelsesProcent: t.udbredelsesProcent,
    })),
  ).onConflictDoUpdate({
    target: standardtiltag.titel,
    set: { updatedAt: new Date() },
  });
  console.log(`Seeded ${STANDARDTILTAG_KATALOG.length} standardtiltag.`);

  console.log('Seeding omstillingsindikator-templates...');
  await db.insert(indikatorTemplate).values(
    OMSTILLINGSINDIKATORER.map((i) => ({
      titel: i.titel,
      enhed: i.enhed,
      beskrivelse: `National omstillingsindikator. Målværdi: ${i.nationalMaalvaerdiNote}. Kilde: CO₂-analysen (DK2020).`,
      cctfKriterier: [15],
      niveau: i.niveau,
      sektor: i.sektor,
      nationalMaalvaerdi: i.nationalMaalvaerdi,
      nationalMaalvaerdiNote: i.nationalMaalvaerdiNote,
      dataProvenans: 'top_down' as const,
      dataKarakter: 'aggregeret' as const,
    })),
  ).onConflictDoUpdate({
    target: indikatorTemplate.titel,
    set: { updatedAt: new Date(), dataProvenans: 'top_down', dataKarakter: 'aggregeret' },
  });
  console.log(`Seeded ${OMSTILLINGSINDIKATORER.length} omstillingsindikatorer.`);

  console.log('Seeding Grønkøbing Kommune...');
  await seedGroenkobing();

  // Hent API-data hvis der endnu ingen målinger er for API-indikatorer.
  // Kører kun ved første opstart (eller efter DB-reset) — idempotent.
  const [groenkobing] = await db.select().from(kommune).where(eq(kommune.kommunekode, '0657')).limit(1);
  if (groenkobing) {
    const [{ value: apiMaalingCount }] = await db
      .select({ value: count() })
      .from(indikatorMaaling)
      .innerJoin(kommuneIndikator, eq(indikatorMaaling.indikatorId, kommuneIndikator.indikatorId))
      .where(eq(kommuneIndikator.kommuneId, groenkobing.id));

    if (Number(apiMaalingCount) === 0) {
      console.log('[seed] Ingen API-målinger endnu — henter data fra externe kilder...');
      await handleFetchKlimaregnskabet({});
      await handleFetchEnergidataservice({});
      await handleFetchDst({});
      console.log('[seed] API-datahentning færdig.');
    }
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
