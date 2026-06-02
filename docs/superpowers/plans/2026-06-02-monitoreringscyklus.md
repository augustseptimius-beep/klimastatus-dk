# Monitoreringscyklus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Indfør en `monitoreringscyklus`-tabel, kobl alle `indikator_maaling`-rækker til en cyklus via en sikker breaking migration med backfill, og opret årlige cyklusser automatisk når data skrives.

**Architecture:** Ny tabel `monitoreringscyklus` (per kommune, per runde). `indikator_maaling` får en NOT NULL FK `monitoreringscyklus_id`; den gamle unique-constraint `(indikator_id, aar)` erstattes af `(indikator_id, monitoreringscyklus_id)`. Migrationen genereres med drizzle-kit og hand-redigeres så den kører i sikker rækkefølge (tilføj nullable → backfill → sæt NOT NULL → byt constraint), atomisk i én transaktion. En idempotent helper `ensureAarligCyklus` opretter/genbruger den årlige cyklus og kaldes fra de tre fetch-jobs og seed.

**Tech Stack:** Next.js 16, Drizzle ORM 0.45 (postgres-js), PostgreSQL 18, Vitest (mockede db-tests), drizzle-kit til migrationer.

**Spec:** `docs/superpowers/specs/2026-06-02-monitoreringscyklus-design.md`

**Forudsætninger for eksekvering:**
- Arbejd på branchen `feat/monitoreringscyklus` (allerede oprettet).
- Lokal Postgres kører på `localhost:5432/klimastatus` (se `.env.local`).
- Kør `npm test` for hele suiten; enkelt-test: `npx vitest run <sti>`.

---

### Task 1: Tilføj enums + `monitoreringscyklus`-tabel til schema

**Files:**
- Modify: `db/schema/enums.ts`
- Create: `db/schema/monitorering.ts`
- Modify: `db/schema/index.ts:14` (tilføj export)
- Test: `db/schema/monitorering.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

Testen bruger Drizzles `getTableConfig` til at inspicere tabellens kolonner og constraints — en rigtig, kørbar test uden DB.

```ts
// db/schema/monitorering.test.ts
import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { monitoreringscyklus } from './monitorering';

describe('monitoreringscyklus schema', () => {
  const cfg = getTableConfig(monitoreringscyklus);
  const colNames = cfg.columns.map((c) => c.name);

  it('har de forventede kolonner', () => {
    expect(colNames).toEqual(
      expect.arrayContaining([
        'id', 'kommune_id', 'navn', 'periode_start', 'periode_slut',
        'type', 'aar', 'status', 'created_at', 'updated_at',
      ]),
    );
  });

  it('har kommune_id og navn og type som NOT NULL', () => {
    const byName = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));
    expect(byName['kommune_id'].notNull).toBe(true);
    expect(byName['navn'].notNull).toBe(true);
    expect(byName['type'].notNull).toBe(true);
    expect(byName['status'].notNull).toBe(true);
  });

  it('har aar som nullable', () => {
    const byName = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));
    expect(byName['aar'].notNull).toBe(false);
  });

  it('har unik constraint på (kommune_id, type, aar)', () => {
    const uniqueCols = cfg.uniqueConstraints.map((u) => u.columns.map((c) => c.name).sort());
    expect(uniqueCols).toContainEqual(['aar', 'kommune_id', 'type'].sort());
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run db/schema/monitorering.test.ts`
Expected: FAIL — "Cannot find module './monitorering'".

- [ ] **Step 3: Tilføj enums**

I `db/schema/enums.ts`, tilføj nederst (efter `laeringsKnytningEnum`):

```ts
export const monitoreringsTypeEnum = pgEnum('monitorerings_type', [
  'aarlig', 'kvartal', 'ad_hoc',
]);
export const monitoreringsStatusEnum = pgEnum('monitorerings_status', [
  'aaben', 'lukket', 'rapporteret',
]);
```

- [ ] **Step 4: Opret tabellen**

```ts
// db/schema/monitorering.ts
import { pgTable, uuid, text, integer, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { monitoreringsTypeEnum, monitoreringsStatusEnum } from './enums';

export const monitoreringscyklus = pgTable('monitoreringscyklus', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  navn: text('navn').notNull(),
  periodeStart: date('periode_start'),
  periodeSlut: date('periode_slut'),
  type: monitoreringsTypeEnum('type').notNull(),
  aar: integer('aar'),
  status: monitoreringsStatusEnum('status').notNull().default('aaben'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('monitoreringscyklus_kommune_type_aar_unique').on(t.kommuneId, t.type, t.aar),
]);
```

- [ ] **Step 5: Eksportér fra schema-index**

I `db/schema/index.ts`, tilføj efter linje 14 (`export * from './laeringspost';`):

```ts
export * from './monitorering';
```

- [ ] **Step 6: Kør testen og bekræft at den passerer**

Run: `npx vitest run db/schema/monitorering.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add db/schema/enums.ts db/schema/monitorering.ts db/schema/index.ts db/schema/monitorering.test.ts
git commit -m "feat: monitoreringscyklus schema + enums"
```

---

### Task 2: Kobl `indikator_maaling` til cyklus (schema = ønsket slut-tilstand)

Schemaet beskriver slut-tilstanden (NOT NULL + ny unique). Selve den sikre migrations-rækkefølge hand-redigeres i Task 3.

**Files:**
- Modify: `db/schema/indikator.ts:19-31`
- Test: `db/schema/indikator-maaling.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// db/schema/indikator-maaling.test.ts
import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { indikatorMaaling } from './indikator';

describe('indikator_maaling cyklus-kobling', () => {
  const cfg = getTableConfig(indikatorMaaling);
  const byName = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));

  it('har monitoreringscyklus_id som NOT NULL', () => {
    expect(byName['monitoreringscyklus_id']).toBeDefined();
    expect(byName['monitoreringscyklus_id'].notNull).toBe(true);
  });

  it('beholder aar-kolonnen', () => {
    expect(byName['aar']).toBeDefined();
  });

  it('har unik constraint på (indikator_id, monitoreringscyklus_id)', () => {
    const uniqueCols = cfg.uniqueConstraints.map((u) => u.columns.map((c) => c.name).sort());
    expect(uniqueCols).toContainEqual(['indikator_id', 'monitoreringscyklus_id'].sort());
  });

  it('har IKKE længere unik constraint på (indikator_id, aar)', () => {
    const uniqueCols = cfg.uniqueConstraints.map((u) => u.columns.map((c) => c.name).sort());
    expect(uniqueCols).not.toContainEqual(['aar', 'indikator_id'].sort());
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run db/schema/indikator-maaling.test.ts`
Expected: FAIL — `monitoreringscyklus_id` er undefined.

- [ ] **Step 3: Opdatér schemaet**

Erstat `indikatorMaaling`-definitionen i `db/schema/indikator.ts` (linje 19-31). Tilføj først importen af `monitoreringscyklus` øverst i filen:

```ts
import { monitoreringscyklus } from './monitorering';
```

Erstat derefter blokken:

```ts
export const indikatorMaaling = pgTable('indikator_maaling', {
  id: uuid('id').primaryKey().defaultRandom(),
  indikatorId: uuid('indikator_id').references(() => indikator.id, { onDelete: 'cascade' }).notNull(),
  monitoreringscyklusId: uuid('monitoreringscyklus_id')
    .references(() => monitoreringscyklus.id, { onDelete: 'cascade' }).notNull(),
  dato: date('dato'),
  aar: integer('aar'),
  vaerdi: real('vaerdi').notNull(),
  kilde: text('kilde'),
  bemaerkning: text('bemaerkning'),
  autoHentet: boolean('auto_hentet').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('indikator_maaling_indikator_cyklus_unique').on(t.indikatorId, t.monitoreringscyklusId),
]);
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npx vitest run db/schema/indikator-maaling.test.ts`
Expected: PASS (4 tests).

> Bemærk: Andre filer (jobs, seed, queries) er endnu ikke opdateret, så `npx tsc --noEmit` vil have type-fejl på de steder der inserter `indikatorMaaling` uden `monitoreringscyklusId`. Det er forventet og rettes i Task 4-6. Commit alligevel — schemaet er korrekt isoleret.

- [ ] **Step 5: Commit**

```bash
git add db/schema/indikator.ts db/schema/indikator-maaling.test.ts
git commit -m "feat: kobl indikator_maaling til monitoreringscyklus (schema)"
```

---

### Task 3: Generér og hand-redigér den sikre migration + verificér backfill

**Files:**
- Create (genereres): `db/migrations/0007_*.sql` (filnavn auto-genereres)
- Modify: `db/migrations/meta/*` (genereres automatisk — rør ikke manuelt)
- Create: `scripts/verify-monitoreringscyklus-backfill.mjs`

- [ ] **Step 1: Generér migrationen**

Run: `npx drizzle-kit generate`
Expected: En ny fil `db/migrations/0007_<navn>.sql` oprettes, og `meta/_journal.json` opdateres. Noter filnavnet.

- [ ] **Step 2: Erstat migrationens indhold med den sikre rækkefølge**

Åbn den nye `0007_*.sql`. Drizzle har genereret DDL i forkert rækkefølge til live-data (den tilføjer kolonnen som NOT NULL i ét hug, hvilket fejler på eksisterende rækker). **Erstat hele filens indhold** med følgende. Brug de constraint-/FK-navne drizzle genererede hvor de afviger fra nedenstående — strukturen skal matche, navnene er drizzles defaults:

```sql
-- Enums
CREATE TYPE "public"."monitorerings_type" AS ENUM('aarlig', 'kvartal', 'ad_hoc');--> statement-breakpoint
CREATE TYPE "public"."monitorerings_status" AS ENUM('aaben', 'lukket', 'rapporteret');--> statement-breakpoint

-- Tabel
CREATE TABLE "monitoreringscyklus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"navn" text NOT NULL,
	"periode_start" date,
	"periode_slut" date,
	"type" "monitorerings_type" NOT NULL,
	"aar" integer,
	"status" "monitorerings_status" DEFAULT 'aaben' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoreringscyklus_kommune_type_aar_unique" UNIQUE("kommune_id","type","aar")
);--> statement-breakpoint
ALTER TABLE "monitoreringscyklus" ADD CONSTRAINT "monitoreringscyklus_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 1) Tilføj kolonnen som NULLABLE først
ALTER TABLE "indikator_maaling" ADD COLUMN "monitoreringscyklus_id" uuid;--> statement-breakpoint

-- 2) Backfill: opret én årlig cyklus pr. (kommune, aar) og kobl målingerne.
--    Kommunen udledes via kommune_indikator (API-indikatorer) eller
--    indikator_indsats_omraade / indikator_maal (manuelle indikatorer).
WITH maaling_kommune AS (
	SELECT m.id AS maaling_id, m.aar AS aar,
		COALESCE(
			(SELECT ki.kommune_id FROM kommune_indikator ki
				WHERE ki.indikator_id = m.indikator_id LIMIT 1),
			(SELECT io.kommune_id FROM indikator_indsats_omraade iio
				JOIN indsats_omraade io ON io.id = iio.indsats_omraade_id
				WHERE iio.indikator_id = m.indikator_id LIMIT 1),
			(SELECT io.kommune_id FROM indikator_maal im
				JOIN maal ma ON ma.id = im.maal_id
				JOIN indsats_omraade io ON io.id = ma.indsats_omraade_id
				WHERE im.indikator_id = m.indikator_id LIMIT 1)
		) AS kommune_id
	FROM indikator_maaling m
),
distinct_cyklus AS (
	SELECT DISTINCT kommune_id, aar
	FROM maaling_kommune
	WHERE kommune_id IS NOT NULL AND aar IS NOT NULL
),
inserted AS (
	INSERT INTO monitoreringscyklus (kommune_id, navn, type, aar, status)
	SELECT kommune_id, 'Årsstatus ' || aar, 'aarlig', aar, 'rapporteret'
	FROM distinct_cyklus
	RETURNING id, kommune_id, aar
)
UPDATE indikator_maaling m
SET monitoreringscyklus_id = c.id
FROM maaling_kommune mk
JOIN inserted c ON c.kommune_id = mk.kommune_id AND c.aar = mk.aar
WHERE m.id = mk.maaling_id;--> statement-breakpoint

-- 3) Vagt: fejl højlydt hvis nogen måling ikke kunne kobles (frem for at tabe data)
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM indikator_maaling WHERE monitoreringscyklus_id IS NULL) THEN
		RAISE EXCEPTION 'Backfill ufuldstændig: % maaling(er) uden monitoreringscyklus_id (kommune/aar kunne ikke udledes)',
			(SELECT count(*) FROM indikator_maaling WHERE monitoreringscyklus_id IS NULL);
	END IF;
END $$;--> statement-breakpoint

-- 4) Sæt NOT NULL + FK
ALTER TABLE "indikator_maaling" ALTER COLUMN "monitoreringscyklus_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indikator_maaling" ADD CONSTRAINT "indikator_maaling_monitoreringscyklus_id_monitoreringscyklus_id_fk" FOREIGN KEY ("monitoreringscyklus_id") REFERENCES "public"."monitoreringscyklus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 5) Byt unique-constraint
ALTER TABLE "indikator_maaling" DROP CONSTRAINT "indikator_maaling_indikator_aar_unique";--> statement-breakpoint
ALTER TABLE "indikator_maaling" ADD CONSTRAINT "indikator_maaling_indikator_cyklus_unique" UNIQUE("indikator_id","monitoreringscyklus_id");
```

> Vigtigt: Rør IKKE `meta/_journal.json` eller snapshot-filen — de skal blive som drizzle-kit skrev dem (slut-tilstand), så fremtidige `generate`-kald er rene.

- [ ] **Step 3: Skriv verifikations-scriptet (replay i rullet-tilbage transaktion)**

Dette script kører backfill-SQL'en mod en isoleret syntetisk fixture i den lokale DB og ruller alt tilbage — det rører ingen rigtige data. Det kører EFTER migrationen er anvendt (Step 4), hvor kolonnen findes.

```js
// scripts/verify-monitoreringscyklus-backfill.mjs
// Verificerer backfill-logikken mod syntetiske fixtures i en rullet-tilbage transaktion.
// Kør: node scripts/verify-monitoreringscyklus-backfill.mjs
import postgres from 'postgres';
import { loadEnvConfig } from '@next/env';

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

    // --- Kør den SAMME backfill-SQL som migrationen ---
    await tx.unsafe(`
      WITH maaling_kommune AS (
        SELECT m.id AS maaling_id, m.aar AS aar,
          COALESCE(
            (SELECT ki.kommune_id FROM kommune_indikator ki WHERE ki.indikator_id = m.indikator_id LIMIT 1),
            (SELECT io.kommune_id FROM indikator_indsats_omraade iio JOIN indsats_omraade io ON io.id = iio.indsats_omraade_id WHERE iio.indikator_id = m.indikator_id LIMIT 1),
            (SELECT io.kommune_id FROM indikator_maal im JOIN maal ma ON ma.id = im.maal_id JOIN indsats_omraade io ON io.id = ma.indsats_omraade_id WHERE im.indikator_id = m.indikator_id LIMIT 1)
          ) AS kommune_id
        FROM indikator_maaling m
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
```

> Note: Hvis `indsats_omraade` eller `kommune` har flere NOT NULL-kolonner end brugt her, justér fixture-INSERTs så de matcher skemaet (kør scriptet; en fejl viser hvilken kolonne der mangler).

- [ ] **Step 4: Anvend migrationen på den lokale DB (real backfill på seed-data)**

```bash
node scripts/migrate.mjs
```
Expected: `[migrate] Færdig.` uden fejl. Hvis DB'en ikke har seed-data, kør `npx tsx db/seed.ts` først (eller hvad projektets seed-kommando er) — backfill skal have målinger at arbejde på, men tom DB er også gyldig (0 cyklusser).

- [ ] **Step 5: Kør verifikations-scriptet**

Run: `node scripts/verify-monitoreringscyklus-backfill.mjs`
Expected: `ALLE TESTS BESTÅET` (4 PASS), exit 0.

- [ ] **Step 6: Bekræft real-data integritet på lokal DB**

```bash
psql "$DATABASE_URL" -c "SELECT count(*) AS uden_cyklus FROM indikator_maaling WHERE monitoreringscyklus_id IS NULL;"
```
Expected: `uden_cyklus = 0`.

- [ ] **Step 7: Commit**

```bash
git add db/migrations scripts/verify-monitoreringscyklus-backfill.mjs
git commit -m "feat: sikker backfill-migration for monitoreringscyklus"
```

---

### Task 4: `ensureAarligCyklus`-helper

**Files:**
- Create: `db/queries/monitorering.ts`
- Modify: `db/queries/index.ts` (tilføj export)
- Test: `db/queries/monitorering.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

Følger samme mock-mønster som `db/queries/kommune-indikator.test.ts`.

```ts
// db/queries/monitorering.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const onConflictDoNothing = vi.fn().mockReturnValue({
  returning: vi.fn().mockResolvedValue([]),
});
const insertValues = vi.fn().mockReturnValue({ onConflictDoNothing });
const insert = vi.fn().mockReturnValue({ values: insertValues });
const findFirst = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: (...a) => insert(...a),
    query: { monitoreringscyklus: { findFirst: (...a) => findFirst(...a) } },
  },
}));

import { ensureAarligCyklus } from './monitorering';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ensureAarligCyklus', () => {
  it('returnerer eksisterende cyklus uden at oprette en ny', async () => {
    const existing = { id: 'c1', kommuneId: 'k1', aar: 2025, type: 'aarlig' };
    findFirst.mockResolvedValueOnce(existing);

    const result = await ensureAarligCyklus('k1', 2025);

    expect(result.id).toBe('c1');
    expect(insert).not.toHaveBeenCalled();
  });

  it('opretter en ny cyklus når ingen findes, med korrekt navn/type/status', async () => {
    findFirst.mockResolvedValueOnce(undefined);
    onConflictDoNothing.mockReturnValueOnce({
      returning: vi.fn().mockResolvedValue([{ id: 'c2', kommuneId: 'k1', aar: 2026 }]),
    });

    const result = await ensureAarligCyklus('k1', 2026);

    expect(insert).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        kommuneId: 'k1', aar: 2026, type: 'aarlig',
        navn: 'Årsstatus 2026', status: 'aaben',
      }),
    );
    expect(result.id).toBe('c2');
  });

  it('håndterer race: hvis insert intet returnerer (konflikt), slår op igen', async () => {
    findFirst.mockResolvedValueOnce(undefined); // første opslag: ingen
    onConflictDoNothing.mockReturnValueOnce({
      returning: vi.fn().mockResolvedValue([]), // konflikt → tom
    });
    findFirst.mockResolvedValueOnce({ id: 'c3', kommuneId: 'k1', aar: 2027 }); // andet opslag

    const result = await ensureAarligCyklus('k1', 2027);

    expect(result.id).toBe('c3');
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run db/queries/monitorering.test.ts`
Expected: FAIL — "Cannot find module './monitorering'".

- [ ] **Step 3: Implementér helperen**

```ts
// db/queries/monitorering.ts
import { db } from '@/db';
import { monitoreringscyklus } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export type Monitoreringscyklus = typeof monitoreringscyklus.$inferSelect;

/**
 * Returnerer den årlige monitoreringscyklus for (kommune, aar) — opretter den hvis
 * den ikke findes. Idempotent og race-sikker via unik-constrainten
 * (kommune_id, type, aar).
 */
export async function ensureAarligCyklus(kommuneId: string, aar: number): Promise<Monitoreringscyklus> {
  const eksisterende = await db.query.monitoreringscyklus.findFirst({
    where: and(
      eq(monitoreringscyklus.kommuneId, kommuneId),
      eq(monitoreringscyklus.type, 'aarlig'),
      eq(monitoreringscyklus.aar, aar),
    ),
  });
  if (eksisterende) return eksisterende;

  const [oprettet] = await db
    .insert(monitoreringscyklus)
    .values({
      kommuneId,
      aar,
      type: 'aarlig',
      navn: `Årsstatus ${aar}`,
      status: 'aaben',
    })
    .onConflictDoNothing()
    .returning();

  if (oprettet) return oprettet;

  // Konflikt (en parallel skrivning vandt) — slå op igen.
  const efterKonflikt = await db.query.monitoreringscyklus.findFirst({
    where: and(
      eq(monitoreringscyklus.kommuneId, kommuneId),
      eq(monitoreringscyklus.type, 'aarlig'),
      eq(monitoreringscyklus.aar, aar),
    ),
  });
  if (!efterKonflikt) throw new Error(`Kunne ikke oprette eller finde årlig cyklus for kommune ${kommuneId}, år ${aar}`);
  return efterKonflikt;
}
```

- [ ] **Step 4: Eksportér fra queries-index**

I `db/queries/index.ts`, tilføj (alfabetisk hvor det passer, eller nederst):

```ts
export * from './monitorering';
```

Bekræft at der ikke opstår navnekonflikt: `grep -n "monitorering" db/queries/index.ts`.

- [ ] **Step 5: Kør testen og bekræft at den passerer**

Run: `npx vitest run db/queries/monitorering.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add db/queries/monitorering.ts db/queries/monitorering.test.ts db/queries/index.ts
git commit -m "feat: ensureAarligCyklus query-helper"
```

---

### Task 5: Indkobl cyklus i de tre fetch-jobs

Hvert job har allerede `aar` pr. måling og kommunen via `ki.kommuneId`. Vi kalder `ensureAarligCyklus`, sætter `monitoreringscyklusId`, og opdaterer `onConflictDoUpdate`-targetet til den nye constraint.

**Files:**
- Modify: `lib/jobs/fetch-dst.ts:97-110`
- Modify: `lib/jobs/fetch-klimaregnskabet.ts:64-75`
- Modify: `lib/jobs/fetch-energidataservice.ts:71-86`
- Test: opdatér `lib/jobs/fetch-dst.test.ts`, `lib/jobs/fetch-klimaregnskabet.test.ts`, `lib/jobs/fetch-energidataservice.test.ts`

- [ ] **Step 1: Opdatér fetch-dst.ts**

Tilføj import øverst:

```ts
import { ensureAarligCyklus } from '@/db/queries/monitorering';
```

Erstat insert-løkken (linje 97-110) med:

```ts
      for (const [yearStr, vaerdi] of Object.entries(byYear)) {
        if (vaerdi === null) continue;
        const aar = Number(yearStr);
        const cyklus = await ensureAarligCyklus(ki.kommuneId, aar);
        await db.insert(indikatorMaaling).values({
          indikatorId: ki.indikatorId,
          monitoreringscyklusId: cyklus.id,
          aar,
          vaerdi,
          kilde: 'dst',
          autoHentet: true,
        }).onConflictDoUpdate({
          target: [indikatorMaaling.indikatorId, indikatorMaaling.monitoreringscyklusId],
          set: { vaerdi, kilde: 'dst' },
        });
      }
```

- [ ] **Step 2: Opdatér fetch-klimaregnskabet.ts**

Tilføj import øverst:

```ts
import { ensureAarligCyklus } from '@/db/queries/monitorering';
```

Erstat insert-løkken (linje 64-75) med:

```ts
  for (const [yearStr, vaerdi] of Object.entries(co2eByYear)) {
    const aar = Number(yearStr);
    const cyklus = await ensureAarligCyklus(ki.kommuneId, aar);
    await db.insert(indikatorMaaling).values({
      indikatorId: ki.indikatorId,
      monitoreringscyklusId: cyklus.id,
      aar,
      vaerdi,
      kilde: 'klimaregnskab',
      autoHentet: true,
    }).onConflictDoUpdate({
      target: [indikatorMaaling.indikatorId, indikatorMaaling.monitoreringscyklusId],
      set: { vaerdi, kilde: 'klimaregnskab' },
    });
  }
```

- [ ] **Step 3: Opdatér fetch-energidataservice.ts**

Tilføj import øverst:

```ts
import { ensureAarligCyklus } from '@/db/queries/monitorering';
```

Erstat insert-blokken (linje 71-86) med:

```ts
    const aar = Number(latest.Month.slice(0, 4));
    const totalMW = latest.OnshoreWindMW + latest.SolarPowerMW;

    try {
      const cyklus = await ensureAarligCyklus(ki.kommuneId, aar);
      await db.insert(indikatorMaaling).values({
        indikatorId: ki.indikatorId,
        monitoreringscyklusId: cyklus.id,
        aar,
        vaerdi: totalMW,
        kilde: 'energidataservice',
        autoHentet: true,
      }).onConflictDoUpdate({
        target: [indikatorMaaling.indikatorId, indikatorMaaling.monitoreringscyklusId],
        set: { vaerdi: totalMW, kilde: 'energidataservice' },
      });
      await updateSidstHentet(ki.id, new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fetch-energidataservice] Error for ${kommunekode}: ${msg}`);
      await updateSidsteFejl(ki.id, msg);
    }
```

- [ ] **Step 4: Opdatér jobbenes tests så de mocker `ensureAarligCyklus`**

Hver af de tre test-filer mocker `@/db`. Tilføj i hver fil en mock af cyklus-helperen, så insert-stien ikke fejler. Tilføj øverst (efter de eksisterende `vi.mock`-kald):

```ts
vi.mock('@/db/queries/monitorering', () => ({
  ensureAarligCyklus: vi.fn().mockResolvedValue({ id: 'cyklus-test', kommuneId: 'k1', aar: 2024 }),
}));
```

Hvis en test asserterer på `onConflictDoUpdate`-targetet eller på de indsatte værdier, opdatér forventningen til at inkludere `monitoreringscyklusId: 'cyklus-test'` og target `[indikatorMaaling.indikatorId, indikatorMaaling.monitoreringscyklusId]`. Læs hver testfil og justér de relevante `expect`-kald.

- [ ] **Step 5: Kør jobbenes tests**

Run: `npx vitest run lib/jobs/`
Expected: PASS (alle job-tests grønne).

- [ ] **Step 6: Commit**

```bash
git add lib/jobs/
git commit -m "feat: fetch-jobs opretter/genbruger årlig cyklus pr. måling"
```

---

### Task 6: Opdatér seed til den nye struktur

**Files:**
- Modify: `db/seeds/oesterby.ts:582-624` (manuelle indikatorer + målinger)

- [ ] **Step 1: Importér cyklus-tabellen i seed**

I `db/seeds/oesterby.ts`, tilføj `monitoreringscyklus` til schema-importen (linje ~13-18, hvor `indikatorMaaling` allerede importeres).

- [ ] **Step 2: Opret årlige cyklusser før målingerne indsættes**

Lige før `await db.insert(indikatorMaaling).values([...])` (linje ~609), indsæt oprettelse af de årlige cyklusser for de år seed bruger (2021-2024) for Østerby-kommunen, og byg et opslag:

```ts
    // Årlige monitoreringscyklusser for de historiske år
    const cyklusRows = await db.insert(monitoreringscyklus).values(
      [2021, 2022, 2023, 2024].map((aar) => ({
        kommuneId: oesterby.id,
        aar,
        type: 'aarlig' as const,
        navn: `Årsstatus ${aar}`,
        status: 'rapporteret' as const,
      })),
    ).returning();
    const cyklusByAar = Object.fromEntries(cyklusRows.map((c) => [c.aar, c.id]));
```

- [ ] **Step 3: Tilføj `monitoreringscyklusId` til hver måling**

Opdatér `db.insert(indikatorMaaling).values([...])`-arrayet (linje 609-623) så hvert objekt får `monitoreringscyklusId: cyklusByAar[<aar>]`. Eksempel for de første rækker:

```ts
    await db.insert(indikatorMaaling).values([
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2021], aar: 2021, vaerdi: 58, kilde: 'Energi Østerby A/S årsrapport' },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2022], aar: 2022, vaerdi: 61, kilde: 'Energi Østerby A/S årsrapport' },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 64, kilde: 'Energi Østerby A/S årsrapport' },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 67, kilde: 'Energi Østerby A/S årsrapport' },
      // ... gentag mønstret for iElbiler, iLavbund, iHaendelser med matchende cyklusByAar[aar]
    ]);
```

Opdatér ALLE 14 måle-rækker tilsvarende med det rette `cyklusByAar[aar]`.

- [ ] **Step 4: Verificér seed mod lokal DB**

```bash
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
node scripts/migrate.mjs
npx tsx db/seed.ts
psql "$DATABASE_URL" -c "SELECT count(*) AS uden_cyklus FROM indikator_maaling WHERE monitoreringscyklus_id IS NULL;"
```
Expected: migration + seed kører fejlfrit; `uden_cyklus = 0`.

> Hvis projektets seed-entry ikke er `db/seed.ts`, så tjek `db/seed.ts` for den korrekte kommando.

- [ ] **Step 5: Commit**

```bash
git add db/seeds/oesterby.ts
git commit -m "feat: seed opretter monitoreringscyklusser for historiske målinger"
```

---

### Task 7: Fuld verifikation + typecheck + build

**Files:** ingen ændringer — kun verifikation.

- [ ] **Step 1: Kør hele testsuiten**

Run: `npm test`
Expected: alle tests grønne, inkl. eksisterende `public-dashboard.test.ts` m.fl.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl. (Alle insert-steder for `indikatorMaaling` sætter nu `monitoreringscyklusId`.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: ingen nye fejl.

- [ ] **Step 4: Production build (fanger Next.js-specifikke fejl)**

Run: `npm run build`
Expected: build lykkes.

- [ ] **Step 5: Bekræft branch-tilstand**

```bash
git log --oneline main..HEAD
git status
```
Expected: 6 feature-commits oven på `main`, ren working tree.

---

## Self-Review Notes

- **Spec-dækning:** Tabel (Task 1), `indikator_maaling`-kobling + constraint-swap (Task 2-3), backfill med kommune-udledning + vagt-tjek (Task 3), auto-årlig helper (Task 4), indkobling i jobs (Task 5) og seed (Task 6). Bevidst udskudt (UI, tovholder_rapport, laeringspost) er IKKE i planen — korrekt.
- **Migrationssikkerhed:** nullable → backfill → guard → NOT NULL → constraint-swap, atomisk i postgres-js-migratorens transaktion.
- **Test-realisme:** schema-tests via `getTableConfig`, query/job-tests mocket (matcher repo-mønster), backfill verificeret mod rigtig lokal Postgres (replay-script + real seed-data).
- **Deploy:** Migrationen kører ved container-opstart i prod. Verificér frisk backup (`docs/backup-runbook.md`) før push til main.
