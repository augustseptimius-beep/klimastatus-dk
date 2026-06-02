// scripts/verify-monitoreringscyklus-backfill.mjs
// Verificerer backfill-logikken mod syntetiske fixtures i en rullet-tilbage transaktion.
// Kør: node scripts/verify-monitoreringscyklus-backfill.mjs
import postgres from 'postgres';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;

loadEnvConfig(process.cwd());
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

let ok = true;
function assert(cond, msg) {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) ok = false;
}

try {
  await sql.begin(async (tx) => {
    // Tillad midlertidigt NULL i transaktionen (rulles tilbage)
    await tx`ALTER TABLE indikator_maaling ALTER COLUMN monitoreringscyklus_id DROP NOT NULL`;

    // Fixture: 2 kommuner (subdomain er NOT NULL + unique)
    const [kA] = await tx`INSERT INTO kommune (kommunekode, navn, subdomain) VALUES ('9001','MCTEST A','mctest-a') RETURNING id`;
    const [kB] = await tx`INSERT INTO kommune (kommunekode, navn, subdomain) VALUES ('9002','MCTEST B','mctest-b') RETURNING id`;

    // API-indikator i kommune A (kobles via kommune_indikator)
    const [iApi] = await tx`INSERT INTO indikator (niveau, beskrivelse, datakilde_type) VALUES ('impact','mctest-api','api') RETURNING id`;
    const [tmpl] = await tx`INSERT INTO indikator_template (titel, kilde, api_query, enhed, beskrivelse) VALUES ('mctest','dst','q','t','b') RETURNING id`;
    await tx`INSERT INTO kommune_indikator (kommune_id, template_id, indikator_id) VALUES (${kA.id}, ${tmpl.id}, ${iApi.id})`;

    // Manuel indikator i kommune B (kobles via indsatsområde)
    const [iMan] = await tx`INSERT INTO indikator (niveau, beskrivelse, datakilde_type) VALUES ('output','mctest-man','manual') RETURNING id`;
    const [io] = await tx`INSERT INTO indsats_omraade (kommune_id, navn, type, sektor) VALUES (${kB.id}, 'mctest-io', 'ghg_reduction', 'energy') RETURNING id`;
    await tx`INSERT INTO indikator_indsats_omraade (indikator_id, indsats_omraade_id) VALUES (${iMan.id}, ${io.id})`;

    // Målinger: API-indikator 2022+2023, manuel 2023
    await tx`INSERT INTO indikator_maaling (indikator_id, aar, vaerdi) VALUES (${iApi.id}, 2022, 10), (${iApi.id}, 2023, 11), (${iMan.id}, 2023, 99)`;

    // --- Kør den SAMME backfill-SQL som migrationen, scopet til fixture-indikatorer ---
    // Scopingen sikrer at eksisterende data (fra migration) ikke forstyrrer — tester
    // præcis den samme logik (COALESCE-kommune-udledning, INSERT, UPDATE) men kun for
    // de rækker vi selv indsatte.
    await tx.unsafe(`
      WITH maaling_kommune AS (
        SELECT m.id AS maaling_id, m.aar AS aar,
          COALESCE(
            (SELECT ki.kommune_id FROM kommune_indikator ki WHERE ki.indikator_id = m.indikator_id LIMIT 1),
            (SELECT io.kommune_id FROM indikator_indsats_omraade iio JOIN indsats_omraade io ON io.id = iio.indsats_omraade_id WHERE iio.indikator_id = m.indikator_id LIMIT 1),
            (SELECT io.kommune_id FROM indikator_maal im JOIN maal ma ON ma.id = im.maal_id JOIN indsats_omraade io ON io.id = ma.indsats_omraade_id WHERE im.indikator_id = m.indikator_id LIMIT 1)
          ) AS kommune_id
        FROM indikator_maaling m
        WHERE m.monitoreringscyklus_id IS NULL
      ),
      distinct_cyklus AS (
        SELECT DISTINCT kommune_id, aar FROM maaling_kommune WHERE kommune_id IS NOT NULL AND aar IS NOT NULL
      ),
      inserted AS (
        INSERT INTO monitoreringscyklus (kommune_id, navn, type, aar, status)
        SELECT kommune_id, 'Årsstatus ' || aar, 'aarlig', aar, 'rapporteret' FROM distinct_cyklus
        RETURNING id, kommune_id, aar
      )
      UPDATE indikator_maaling m SET monitoreringscyklus_id = c.id
      FROM maaling_kommune mk JOIN inserted c ON c.kommune_id = mk.kommune_id AND c.aar = mk.aar
      WHERE m.id = mk.maaling_id;
    `);

    // --- Asserts (kun på fixture-kommuner) ---
    const [{ nuller }] = await tx`
      SELECT count(*)::int AS nuller FROM indikator_maaling m
      WHERE m.monitoreringscyklus_id IS NULL
        AND m.indikator_id IN (${iApi.id}, ${iMan.id})`;
    assert(nuller === 0, 'alle fixture-målinger fik en cyklus');

    const [{ antal }] = await tx`
      SELECT count(*)::int AS antal FROM monitoreringscyklus
      WHERE kommune_id IN (${kA.id}, ${kB.id})`;
    assert(antal === 3, 'der blev oprettet 3 cyklusser: A/2022, A/2023, B/2023');

    const [{ navn }] = await tx`
      SELECT mc.navn FROM indikator_maaling m
      JOIN monitoreringscyklus mc ON mc.id = m.monitoreringscyklus_id
      WHERE m.indikator_id = ${iMan.id} AND m.aar = 2023`;
    assert(navn === 'Årsstatus 2023', 'manuel indikator (kommune B) blev koblet til Årsstatus 2023');

    const [{ kid }] = await tx`
      SELECT mc.kommune_id AS kid FROM indikator_maaling m
      JOIN monitoreringscyklus mc ON mc.id = m.monitoreringscyklus_id
      WHERE m.indikator_id = ${iApi.id} AND m.aar = 2022`;
    assert(kid === kA.id, 'API-indikator 2022 blev koblet til kommune A');

    throw new Error('ROLLBACK'); // tving rollback — rør ingen rigtige data
  }).catch((e) => { if (e.message !== 'ROLLBACK') throw e; });
} finally {
  await sql.end();
}

console.log(ok ? '\nALLE TESTS BESTÅET' : '\nNOGLE TESTS FEJLEDE');
process.exit(ok ? 0 : 1);
