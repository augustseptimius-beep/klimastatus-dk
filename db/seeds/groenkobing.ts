import { hash } from '@node-rs/argon2';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import {
  kommune,
  user,
  indsatsOmraade,
  maal,
  tiltag,
  tovholder,
  tovholderTiltag,
  indikator,
  indikatorMaaling,
  indikatorTiltag,
  indikatorIndsatsOmraade,
  kommuneIndikator,
  indikatorTemplate,
  monitoreringscyklus,
} from '../schema';

export async function seedGroenkobing() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  try {
    // Idempotency: spring over hvis allerede seeded
    const existing = await db.select().from(kommune).where(eq(kommune.kommunekode, '0999')).limit(1);
    if (existing.length > 0) {
      console.log('Grønkøbing Kommune allerede seeded — springer over.');
      return;
    }

    console.log('Seeder Grønkøbing Kommune...');

    // 1. Kommune
    const [groenkobing] = await db.insert(kommune).values({
      kommunekode: '0999',
      navn: 'Grønkøbing Kommune',
      befolkningstal: 51200,
      arealKm2: 1085,
      klimakommitmentDato: '2021-06-01',
      klimakommitmentTekst:
        'Grønkøbing Kommune forpligter sig til at opnå 70% CO₂e-reduktion inden 2030 og klimaneutralitet inden 2045 i overensstemmelse med Parisaftalens 1,5°C-ambition.',
      primaryColor: '#1a5c38',
      secondaryColor: '#e8f5e9',
      subdomain: 'groenkobing',
    }).returning();

    // 2. Koordinator-bruger
    const passwordHash = await hash(process.env.SEED_PASSWORD ?? 'klimastatus2026!');
    await db.insert(user).values({
      kommuneId: groenkobing.id,
      email: 'koordinator@groenkobing.dk',
      passwordHash,
      navn: 'Maja Vestergaard',
      role: 'koordinator',
    }).onConflictDoNothing();

    // 3. Indsatsområder
    const [io1, io2, io3, io4, io5] = await db.insert(indsatsOmraade).values([
      {
        kommuneId: groenkobing.id,
        navn: 'Vedvarende energi og udfasning af fossiler',
        type: 'ghg_reduction' as const,
        sektor: 'energy' as const,
        ansvarligForvaltning: 'Teknik & Miljø',
        beskrivelse:
          'Udbygning af sol- og vindenergi samt udfasning af fossile brændsler i varme- og elproduktion. Sektoren udgør ca. 11% af kommunens samlede CO₂e-udledning.',
        aktiv: true,
      },
      {
        kommuneId: groenkobing.id,
        navn: 'Transport og mobilitet',
        type: 'ghg_reduction' as const,
        sektor: 'transport' as const,
        ansvarligForvaltning: 'Vej & Park',
        beskrivelse:
          'Grøn omstilling af transport med fokus på kollektiv trafik, cyklisme og elektrifisering. Transport udgør ca. 26% af kommunens samlede udledning.',
        aktiv: true,
      },
      {
        kommuneId: groenkobing.id,
        navn: 'Landbrug, natur og lavbundsarealer',
        type: 'ghg_reduction' as const,
        sektor: 'agriculture' as const,
        ansvarligForvaltning: 'Natur & Landbrug',
        beskrivelse:
          'Reduktion af landbrugets drivhusgasudledning via udtag af lavbundsarealer, skovrejsning og biogas. Den største sektor med ca. 55% af kommunens samlede CO₂e-udledning.',
        aktiv: true,
      },
      {
        kommuneId: groenkobing.id,
        navn: 'Bygninger og bæredygtigt forbrug',
        type: 'cross_cutting' as const,
        sektor: 'buildings' as const,
        ansvarligForvaltning: 'Ejendomsservice',
        beskrivelse:
          'Renovering af boliger og kommunale bygninger samt grønne indkøb. Udgør ca. 8% af kommunens samlede udledning.',
        aktiv: true,
      },
      {
        kommuneId: groenkobing.id,
        navn: 'Klimatilpasning',
        type: 'adaptation' as const,
        sektor: 'adaptation' as const,
        ansvarligForvaltning: 'Teknik & Miljø',
        beskrivelse:
          'Sikring af kommunen mod stigende klimarisici: oversvømmelse, ekstremregn, hedebølger og tørke.',
        aktiv: true,
      },
    ]).returning();

    // 4. Tiltag (22 stk.)
    const insertedTiltag = await db.insert(tiltag).values([
      // --- Indsats 1: Vedvarende energi (5 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: 'Etablering af solpark Nordmark (85 ha)',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Anlæg af 85 ha solcellepark nord for Grønkøbing by. Forventet kapacitet: 85 MW. Samarbejde med lokalt energiselskab.',
        forventetEffektCo2Ton: 42000,
        tidsrammeStart: '2024-01-01',
        tidsrammeSlut: '2026-12-31',
        ansvarligOrganisation: 'Grønkøbing Energi A/S',
        barrierer:
          'Naboklager om landskabspåvirkning. Netkapacitet begrænset — afventer Energinet-opgradering.',
        prioriteretTiltag: true,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: 'Repowering af ældre vindmøller',
        type: 'reduction' as const,
        status: 'planned' as const,
        beskrivelse:
          'Udskiftning af 12 ældre vindmøller (2–3 MW) med moderne møller (5+ MW). Øger samlet kapacitet fra ~30 MW til ~65 MW.',
        forventetEffektCo2Ton: 28000,
        tidsrammeStart: '2026-01-01',
        tidsrammeSlut: '2029-12-31',
        ansvarligOrganisation: 'Teknik & Miljø',
        barrierer: 'Afventer opdateret kommuneplan. Finansieringsmodel ikke afklaret.',
        prioriteretTiltag: true,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: 'Udfasning af oliefyr i kommunale bygninger',
        type: 'reduction' as const,
        status: 'completed' as const,
        beskrivelse:
          'Alle 23 kommunale bygninger med oliefyr er overgået til varmepumpe eller fjernvarme.',
        forventetEffektCo2Ton: 1200,
        tidsrammeStart: '2022-01-01',
        tidsrammeSlut: '2024-06-30',
        ansvarligOrganisation: 'Ejendomsservice',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: 'Fjernvarmeudvidelse til Grønkøbing Vest',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Udvidelse af fjernvarmenettet til 1.200 boliger i Grønkøbing Vest der i dag opvarmes med naturgas.',
        forventetEffektCo2Ton: 8500,
        tidsrammeStart: '2024-06-01',
        tidsrammeSlut: '2027-06-30',
        ansvarligOrganisation: 'Grønkøbing Energi A/S',
        barrierer:
          'Gravearbejde forsinket pga. ledningsanlæg. Tilslutningsprocent lavere end forventet.',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: 'Power-to-X forundersøgelse med lokalt energiselskab',
        type: 'reduction' as const,
        status: 'planned' as const,
        beskrivelse:
          'Forundersøgelse af brintanlæg til lagring og konvertering af overskudsstrøm fra vedvarende energi.',
        tidsrammeStart: '2025-01-01',
        tidsrammeSlut: '2030-12-31',
        ansvarligOrganisation: 'Teknik & Miljø',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },

      // --- Indsats 2: Transport (5 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: 'El-busser på 3 kommunale ruter',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Indkøb og idriftsættelse af 8 el-busser på de 3 mest trafikerede lokalruter.',
        forventetEffektCo2Ton: 950,
        tidsrammeStart: '2024-01-01',
        tidsrammeSlut: '2025-12-31',
        ansvarligOrganisation: 'Vej & Park',
        barrierer: 'Levering af busser forsinket 6 måneder pga. forsyningsproblemer.',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: 'Pendlercykelstier (15 km ny infrastruktur)',
        type: 'reduction' as const,
        status: 'planned' as const,
        beskrivelse:
          'Anlæg af 15 km forbedrede pendlercykelruter mellem de 3 største bysamfund i kommunen.',
        forventetEffektCo2Ton: 600,
        tidsrammeStart: '2025-01-01',
        tidsrammeSlut: '2028-12-31',
        ansvarligOrganisation: 'Vej & Park',
        barrierer:
          'Jordkøb i forhandling. Finansiering delvis afhængig af statslig cykelstipulje.',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: 'Kommunal køretøjsflåde 100% el inden 2027',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Udskiftning af 47 kommunale benzin-/dieselkøretøjer med elbiler. 22 er udskiftet pr. 2024.',
        forventetEffektCo2Ton: 420,
        tidsrammeStart: '2023-01-01',
        tidsrammeSlut: '2027-12-31',
        ansvarligOrganisation: 'Ejendomsservice',
        barrierer:
          'Rækkevidde utilstrækkelig til visse tekniske køretøjer. Afventer bedre markedstilbud.',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: 'Samkørselsprogram for virksomheder',
        type: 'reduction' as const,
        status: 'planned' as const,
        beskrivelse:
          'Etablering af digital samkørselsplatform i samarbejde med 15 store lokale virksomheder.',
        forventetEffektCo2Ton: 300,
        tidsrammeStart: '2025-01-01',
        tidsrammeSlut: '2027-12-31',
        ansvarligOrganisation: 'Vej & Park',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: 'Ladestandere på kommunale p-pladser (40 stk.)',
        type: 'reduction' as const,
        status: 'completed' as const,
        beskrivelse:
          '40 ladestander-punkter opstillet på 12 kommunale parkeringspladser i kommunen.',
        forventetEffektCo2Ton: 180,
        tidsrammeStart: '2022-06-01',
        tidsrammeSlut: '2023-12-31',
        ansvarligOrganisation: 'Vej & Park',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },

      // --- Indsats 3: Landbrug (5 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: 'Udtagning af lavbundsarealer (450 ha)',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Frivillig udtagning af 450 ha lavbundsjord fra omdrift for at reducere metan- og lattergas-udledning fra drænet tørv.',
        forventetEffektCo2Ton: 112500,
        tidsrammeStart: '2023-01-01',
        tidsrammeSlut: '2030-12-31',
        ansvarligOrganisation: 'Natur & Landbrug',
        barrierer:
          'Lodsejeraftaler tager tid. Kompensationsniveau opfattes for lavt af mange landmænd.',
        prioriteretTiltag: true,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: 'Klimaskov — skovrejsning 120 ha',
        type: 'reduction' as const,
        status: 'planned' as const,
        beskrivelse:
          'Skovrejsning på 120 ha landbrugsjord. Øger CO₂-optag og styrker biodiversiteten.',
        forventetEffektCo2Ton: 18000,
        tidsrammeStart: '2025-01-01',
        tidsrammeSlut: '2035-12-31',
        ansvarligOrganisation: 'Natur & Landbrug',
        barrierer:
          'Svært at finde egnede arealer — landbrugsjord efterspurgt. Statsstøtteansøgning under behandling.',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: 'Biogasfacilitet til husdyrgødning',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Fælles biogasanlæg for 8 kvægbrug. Reducerer metan fra gødningshåndtering og erstatter naturgas i fjernvarmen.',
        forventetEffektCo2Ton: 21000,
        tidsrammeStart: '2024-01-01',
        tidsrammeSlut: '2026-06-30',
        ansvarligOrganisation: 'Natur & Landbrug',
        barrierer: 'Byggetilladelse forsinket 4 måneder. En deltager trukket sig.',
        prioriteretTiltag: true,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: 'Frivillig omlægning til vedvarende vegetation',
        type: 'reduction' as const,
        status: 'planned' as const,
        beskrivelse:
          'Rådgivningsforløb og tilskud til landmænd der omlægger marginale dyrkningsarealer til vedvarende vegetation.',
        forventetEffektCo2Ton: 8000,
        tidsrammeStart: '2025-01-01',
        tidsrammeSlut: '2030-12-31',
        ansvarligOrganisation: 'Natur & Landbrug',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: 'Partnerskab med landboforening om klimavenlig drift',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Forpligtende partnerskab med Østjyllands Landboforening om klimarådgivning til 200 lokale landmænd.',
        forventetEffektCo2Ton: 5000,
        tidsrammeStart: '2024-01-01',
        tidsrammeSlut: '2030-12-31',
        ansvarligOrganisation: 'Natur & Landbrug',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },

      // --- Indsats 4: Bygninger (4 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io4.id,
        titel: 'Renoveringspulje til private boliger (5 mio. kr.)',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Kommunal medfinansieringspulje til energirenovering. Støtter op til 30% af renoveringsomkostninger for lavindkomstboliger.',
        forventetEffektCo2Ton: 4200,
        tidsrammeStart: '2024-01-01',
        tidsrammeSlut: '2026-12-31',
        ansvarligOrganisation: 'Ejendomsservice',
        barrierer:
          'Ansøgningsprocessen opfattes som besværlig. Mange ansøgninger udenfor målgruppen.',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: true,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io4.id,
        titel: 'ESCO-renovering af 8 kommunale skoler',
        type: 'reduction' as const,
        status: 'completed' as const,
        beskrivelse:
          'Energioptimering af 8 skoler via ESCO-kontrakt. Opnået 38% energibesparelse i gennemsnit.',
        forventetEffektCo2Ton: 2100,
        tidsrammeStart: '2021-01-01',
        tidsrammeSlut: '2023-12-31',
        ansvarligOrganisation: 'Ejendomsservice',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io4.id,
        titel: 'Grønne indkøbskrav i kommunens udbud',
        type: 'reduction' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Integration af klimakrav i alle kommunale udbud over 500.000 kr. Mål: 80% af udbud har klimakriterier inden 2026.',
        forventetEffektCo2Ton: 3500,
        tidsrammeStart: '2024-01-01',
        tidsrammeSlut: '2026-12-31',
        ansvarligOrganisation: 'Ejendomsservice',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io4.id,
        titel: 'Vejledning til borgere om varmepumper',
        type: 'reduction' as const,
        status: 'planned' as const,
        beskrivelse:
          'Opsøgende rådgivning og informationskampagne til 3.000 naturgasbrugere om overgang til varmepumpe.',
        forventetEffektCo2Ton: 6800,
        tidsrammeStart: '2025-01-01',
        tidsrammeSlut: '2028-12-31',
        ansvarligOrganisation: 'Teknik & Miljø',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false,
      },

      // --- Indsats 5: Klimatilpasning (3 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io5.id,
        titel: 'Klimasikring af Grønkøbing Å (oversvømmelse)',
        type: 'adaptation' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Forhøjelse og forstærkning af ådiger ved Grønkøbing Å. Sikrer 2.200 boliger mod 100-årsflod.',
        tidsrammeStart: '2024-06-01',
        tidsrammeSlut: '2027-12-31',
        ansvarligOrganisation: 'Grønkøbing Energi A/S',
        barrierer:
          'Koordinering med Kystdirektoratet tager tid. Statslig medfinansiering ikke frigivet endnu.',
        prioriteretTiltag: true,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io5.id,
        titel: 'Varmeplan for udsatte boligområder',
        type: 'adaptation' as const,
        status: 'planned' as const,
        beskrivelse:
          'Kortlægning og forebyggende indsats i 4 boligområder med høj risiko for hedebølgepåvirkning.',
        tidsrammeStart: '2025-01-01',
        tidsrammeSlut: '2027-12-31',
        ansvarligOrganisation: 'Teknik & Miljø',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: true,
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io5.id,
        titel: 'Skybrudsplan for bymidten',
        type: 'adaptation' as const,
        status: 'in_progress' as const,
        beskrivelse:
          'Anlæg af forsinkelsesbassin og grønne friarealer til håndtering af ekstremregn i bymidten.',
        tidsrammeStart: '2024-01-01',
        tidsrammeSlut: '2026-12-31',
        ansvarligOrganisation: 'Grønkøbing Energi A/S',
        barrierer: 'Ekspropriering af 2 ejendomme nødvendig — klagesag verserer.',
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false,
      },
    ]).returning();

    // 5. Mål (3 stk. — linket til relevante indsatsområder)
    await db.insert(maal).values([
      {
        indsatsOmraadeId: io1.id,
        type: 'smart' as const,
        tidsramme: 'short' as const,
        maalAar: 2030,
        maalVaerdi: 154800,
        enhed: 'ton CO₂e/år',
        baselineVaerdi: 516000,
        baselineAar: 2018,
        beskrivelse:
          '70% reduktion af kommunens samlede CO₂e-udledning ift. 2018-niveau inden 2030 (fra 516.000 til 154.800 ton CO₂e/år). Baseret på Herning-profil skaleret til 51.200 indb.',
        kategori: 'reduction' as const,
      },
      {
        indsatsOmraadeId: io5.id,
        type: 'smart' as const,
        tidsramme: 'medium' as const,
        maalAar: 2035,
        maalVaerdi: 60,
        enhed: '% reduktion i klimaskadeomkostninger',
        baselineVaerdi: 100,
        baselineAar: 2020,
        beskrivelse:
          'Reducere de samlede skadeomkostninger fra klimahændelser (oversvømmelse, hedebølge, tørke) med 60% inden 2035 ift. 2020-niveau.',
        kategori: 'adaptation' as const,
      },
      {
        indsatsOmraadeId: io4.id,
        type: 'qualitative' as const,
        tidsramme: 'long' as const,
        beskrivelse:
          'Sikre at klimaomstillingen er retfærdig — ingen borgere, virksomheder eller lokalsamfund lades uforholdsmæssigt tilbage. Særlig opmærksomhed på lavindkomstgrupper og periferområder.',
        kategori: 'co_benefits' as const,
      },
    ]);

    // 6. Tovholdere (5 stk.)
    const [th1, th2, th3, th4, th5] = await db.insert(tovholder).values([
      {
        kommuneId: groenkobing.id,
        navn: 'Søren Kjeldgaard',
        forvaltning: 'Teknik & Miljø',
        email: 'skj@groenkobing.dk',
        aktiv: true,
      },
      {
        kommuneId: groenkobing.id,
        navn: 'Birgitte Møller',
        forvaltning: 'Vej & Park',
        email: 'bmo@groenkobing.dk',
        aktiv: true,
      },
      {
        kommuneId: groenkobing.id,
        navn: 'Hans Erik Christensen',
        forvaltning: 'Natur & Landbrug',
        email: 'hec@groenkobing.dk',
        aktiv: true,
      },
      {
        kommuneId: groenkobing.id,
        navn: 'Lene Stubkjær',
        forvaltning: 'Ejendomsservice',
        email: 'lst@groenkobing.dk',
        aktiv: true,
      },
      {
        kommuneId: groenkobing.id,
        navn: 'Grønkøbing Energi A/S',
        forvaltning: 'Forsyning (ekstern)',
        email: 'klima@energigroenkobing.dk',
        aktiv: true,
      },
    ]).returning();

    // Link tovholdere til deres indsatsområdes tiltag
    const tovholderLinks = [
      ...insertedTiltag.filter(t => t.indsatsOmraadeId === io1.id).map(t => ({ tovholderId: th1.id, tiltagId: t.id })),
      ...insertedTiltag.filter(t => t.indsatsOmraadeId === io2.id).map(t => ({ tovholderId: th2.id, tiltagId: t.id })),
      ...insertedTiltag.filter(t => t.indsatsOmraadeId === io3.id).map(t => ({ tovholderId: th3.id, tiltagId: t.id })),
      ...insertedTiltag.filter(t => t.indsatsOmraadeId === io4.id).map(t => ({ tovholderId: th4.id, tiltagId: t.id })),
      ...insertedTiltag.filter(t => t.indsatsOmraadeId === io5.id).map(t => ({ tovholderId: th5.id, tiltagId: t.id })),
    ];
    await db.insert(tovholderTiltag).values(tovholderLinks);

    // 7. Manuelle indikatorer (4 stk.) med historiske målinger
    const [iCoFjernvarme, iElbiler, iLavbund, iHaendelser] = await db.insert(indikator).values([
      {
        niveau: 'outcome' as const,
        beskrivelse: 'Andel af boliger tilsluttet fjernvarme',
        enhed: '%',
        datakildeType: 'manual' as const,
      },
      {
        niveau: 'output' as const,
        beskrivelse: 'Antal registrerede elbiler i kommunen',
        enhed: 'antal',
        datakildeType: 'manual' as const,
      },
      {
        niveau: 'output' as const,
        beskrivelse: 'Lavbundsarealer udtaget fra omdrift',
        enhed: 'ha',
        datakildeType: 'manual' as const,
      },
      {
        niveau: 'outcome' as const,
        beskrivelse: 'Registrerede klimahændelser (oversvømmelse, ekstremvarme, tørke)',
        enhed: 'antal/år',
        datakildeType: 'manual' as const,
      },
    ]).returning();

    // Årlige monitoreringscyklusser for de historiske år.
    // onConflictDoNothing + efterfølgende opslag gør seed'en robust mod gen-kørsel
    // efter en delvis fejl (hvor kommunen blev committet men cyklusserne ikke).
    const cyklusRows = await db.insert(monitoreringscyklus).values(
      [2021, 2022, 2023, 2024].map((aar) => ({
        kommuneId: groenkobing.id,
        aar,
        type: 'aarlig' as const,
        navn: `Årsstatus ${aar}`,
        status: 'rapporteret' as const,
      })),
    ).onConflictDoNothing().returning();
    const alleCyklusser = cyklusRows.length < 4
      ? await db.select().from(monitoreringscyklus).where(
          and(eq(monitoreringscyklus.kommuneId, groenkobing.id), eq(monitoreringscyklus.type, 'aarlig')),
        )
      : cyklusRows;
    const cyklusByAar = Object.fromEntries(alleCyklusser.map((c) => [c.aar, c.id]));

    await db.insert(indikatorMaaling).values([
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2021], aar: 2021, vaerdi: 58, kilde: 'Grønkøbing Energi A/S årsrapport' },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2022], aar: 2022, vaerdi: 61, kilde: 'Grønkøbing Energi A/S årsrapport' },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 64, kilde: 'Grønkøbing Energi A/S årsrapport' },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 67, kilde: 'Grønkøbing Energi A/S årsrapport' },
      { indikatorId: iElbiler.id, monitoreringscyklusId: cyklusByAar[2021], aar: 2021, vaerdi: 312, kilde: 'Motorregistret via DST' },
      { indikatorId: iElbiler.id, monitoreringscyklusId: cyklusByAar[2022], aar: 2022, vaerdi: 589, kilde: 'Motorregistret via DST' },
      { indikatorId: iElbiler.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 1124, kilde: 'Motorregistret via DST' },
      { indikatorId: iElbiler.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 1897, kilde: 'Motorregistret via DST' },
      { indikatorId: iLavbund.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 85, kilde: 'Natur & Landbrug intern opgørelse' },
      { indikatorId: iLavbund.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 210, kilde: 'Natur & Landbrug intern opgørelse' },
      { indikatorId: iHaendelser.id, monitoreringscyklusId: cyklusByAar[2021], aar: 2021, vaerdi: 3, kilde: 'Beredskabsrapport' },
      { indikatorId: iHaendelser.id, monitoreringscyklusId: cyklusByAar[2022], aar: 2022, vaerdi: 5, kilde: 'Beredskabsrapport' },
      { indikatorId: iHaendelser.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 7, kilde: 'Beredskabsrapport' },
      { indikatorId: iHaendelser.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 4, kilde: 'Beredskabsrapport' },
    ]).onConflictDoNothing();

    // Link manuelle indikatorer til indsatsområder
    await db.insert(indikatorIndsatsOmraade).values([
      { indikatorId: iCoFjernvarme.id, indsatsOmraadeId: io1.id },
      { indikatorId: iElbiler.id, indsatsOmraadeId: io2.id },
      { indikatorId: iLavbund.id, indsatsOmraadeId: io3.id },
      { indikatorId: iHaendelser.id, indsatsOmraadeId: io5.id },
    ]);

    // Link lavbunds-indikator til det konkrete tiltag
    const tiltagLavbund = insertedTiltag.find(t => t.titel.includes('Udtagning af lavbundsarealer'));
    if (tiltagLavbund) {
      await db.insert(indikatorTiltag).values({ indikatorId: iLavbund.id, tiltagId: tiltagLavbund.id });
    }

    // 8. Automatiske indikatorer via kommuneIndikator (linker til eksisterende templates)
    const templates = await db.select().from(indikatorTemplate).where(eq(indikatorTemplate.aktiv, true));

    for (const template of templates) {
      const [autoInd] = await db.insert(indikator).values({
        niveau: 'impact' as const,
        beskrivelse: template.titel,
        enhed: template.enhed,
        datakildeType: 'api' as const,
        apiKilde: template.kilde,
        apiQuery: template.apiQuery,
      }).returning();

      // Link til io1 (energi) for klimaregnskab og energidataservice, intet link for DST/befolkning
      if (template.kilde === 'klimaregnskab' || template.kilde === 'energidataservice') {
        await db.insert(indikatorIndsatsOmraade).values({
          indikatorId: autoInd.id,
          indsatsOmraadeId: io1.id,
        });
      }

      await db.insert(kommuneIndikator).values({
        kommuneId: groenkobing.id,
        templateId: template.id,
        indikatorId: autoInd.id,
        aktiv: true,
      }).onConflictDoNothing();
    }

    console.log(
      `✓ Grønkøbing Kommune seeded: 5 indsatsområder, 22 tiltag, 3 mål, 5 tovholdere, ${4 + templates.length} indikatorer`,
    );
  } finally {
    await client.end();
  }
}
