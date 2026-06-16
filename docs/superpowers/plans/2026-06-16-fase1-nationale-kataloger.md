# Fase 1 — Nationale kataloger + kommunetype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed tre nationale CCTF-kataloger (kommunetype-mapping for alle 98 kommuner, 46 navngivne standardtiltag med udbredelses-%, 9 omstillingsindikatorer med national målværdi) og koble dem til onboarding, så en ny kommune starter fra et kurateret udgangspunkt frem for et blankt ark.

**Architecture:** Tre uafhængige datalag oven på den eksisterende Drizzle/postgres-stack. Kommunetypen bor som nullable enum-felt på `kommune` og udfyldes fra den eksisterende onboarding-liste (`lib/kommuner-liste.ts`). Tiltagskataloget er en ny national template-tabel (`standardtiltag`) — adskilt fra den per-kommune `tiltag`-tabel. Indikatorkataloget genbruger den eksisterende `indikator_template`-tabel, udvidet med benchmark-felter; de 9 indikatorer seedes som rene benchmark-templates uden live API-kilde (kilder wires i Fase 2). Katalogerne vises read-only på en admin-side; den per-kommune "adoptér tiltag"-flow er bevidst Fase 1b (se Out of Scope).

**Tech Stack:** Next.js 16 (App Router, server components + server actions), Drizzle ORM 0.45 + postgres.js, Postgres, Zod, Vitest. Migrationer genereres med `drizzle-kit generate` og køres ved container-opstart via `scripts/migrate.mjs`. Seed køres ved opstart via `db/seed.ts` (idempotent, `onConflict*`).

---

## Kildegrundlag (citatnøgle → `docs/superpowers/specs/2026-06-16-cctf-evidensgrundlag.md`)

- **Kommunetyper:** §6.1 `[D2 s.31, Figur 10]` — fuld kommune→type-mapping (5 typer: land/oplands/provinsby/storby/hovedstad).
- **Tiltagskatalog:** §6.3 `[D2 s.28–37]` — 46 navngivne tiltag med udbredelses-%.
- **Omstillingsindikatorer:** §6.4 `[D2 s.35, Tabel 13]` — 9 indikatorer med enhed + national målværdi.
- **Plan-afsnit:** `docs/superpowers/specs/2026-06-15-datadrevet-cctf-platform-design.md`, Fase 1.

**Evidens-disciplin:** Kilden giver kun *nationale* udbredelses-% pr. tiltag — IKKE en per-kommunetype-opdeling. Vi opdigter ikke per-type-tal. "Foreslåede tiltag for din kommunetype" leveres derfor i denne fase som det nationale katalog sorteret efter udbredelse; egentlig per-type-filtrering kræver data vi ikke har endnu og er ude af scope.

## Forudgående fund (verificeret mod koden 2026-06-16)

- `lib/kommuner-liste.ts` indeholder kun **97** kommuner — **Morsø (773) mangler**. Danmark har 98. Denne plan tilføjer Morsø som en del af "kommunetype på alle 98".
- `tiltag`-tabellen er per-kommune (`kommuneId` + `indsatsOmraadeId` påkrævet) — derfor kan kataloget IKKE bo der; det får sin egen `standardtiltag`-tabel.
- `indikator_template.kilde` (apiKildeEnum) og `apiQuery` er i dag `notNull`. De 9 benchmark-indikatorer har ingen live kilde endnu → vi gør begge nullable. Fetch-jobbene filtrerer på en konkret `kilde` (`getActiveKommuneIndikatorer('energidataservice'|...)`), så benchmark-templates (null kilde) plukkes aldrig op — sikkert. Den eksplicitte type `ActiveKommuneIndikator` skal dog opdateres (Task C2).
- Seedede templates er inerte indtil en kommune adopterer dem via `kommune_indikator` — seeding udløser ingen fetch.
- Migration-nr.: seneste er `0014_*`. Nye migrationer bliver `0015`, `0016`, `0017` (drizzle-kit nummererer selv).

## Out of Scope (bevidst — næste increment / Fase 1b)

- Per-kommune "adoptér standardtiltag → opret `tiltag`-rækker"-flow (kræver kobling til `indsats_omraade`).
- Per-kommunetype-filtrering/ranking af tiltag (mangler data).
- Live datakilder for de 9 indikatorer (Fase 2 — datahub).
- Redigering af katalogerne via admin-UI (kun read-only visning her).

---

## File Structure

**Nye filer:**
- `db/schema/standardtiltag.ts` — national tiltagskatalog-tabel.
- `lib/kataloger/standardtiltag-katalog.ts` — de 46 tiltag som typet konstant (seed-kilde + test-kilde).
- `lib/kataloger/omstillingsindikatorer.ts` — de 9 indikatorer som typet konstant.
- `lib/kataloger/kommunetype.ts` — kommunetype-union + label-map (delt mellem schema-enum og liste).
- `db/queries/standardtiltag.ts` — læs-queries for kataloget.
- `app/admin/katalog/page.tsx` — read-only visning af begge kataloger.
- Tests: `lib/kommuner-liste.test.ts`, `lib/kataloger/standardtiltag-katalog.test.ts`, `lib/kataloger/omstillingsindikatorer.test.ts`, `db/queries/standardtiltag.test.ts`.

**Ændrede filer:**
- `db/schema/enums.ts` — `kommunetypeEnum`, `standardtiltagKategoriEnum`.
- `db/schema/kommune.ts` — `kommunetype`-kolonne.
- `db/schema/indikator-template.ts` — benchmark-felter + nullable kilde/apiQuery.
- `db/schema/index.ts` — eksportér `standardtiltag`.
- `lib/kommuner-liste.ts` — tilføj Morsø + `type` på alle 98.
- `db/queries/kommune.ts` — `createKommune` gemmer `kommunetype`.
- `db/queries/indikator-template.ts` — `createTemplate` håndterer nye/nullable felter.
- `db/queries/kommune-indikator.ts` — `ActiveKommuneIndikator`-type nullable.
- `db/queries/index.ts` — eksportér standardtiltag-queries (hvis barrel findes; ellers spring over).
- `app/admin/kommuner/actions.ts` — sæt `kommunetype` ved oprettelse.
- `lib/jobs/fetch-dst.ts`, `lib/jobs/fetch-klimaregnskabet.ts` — null-guard på apiQuery.
- `db/seed.ts` — seed 46 tiltag + 9 indikatorer + backfill kommunetype.

---

# DEL A — Kommunetype

### Task A1: Kommunetype-enum + delt union-type

**Files:**
- Create: `lib/kataloger/kommunetype.ts`
- Modify: `db/schema/enums.ts`
- Test: `lib/kataloger/kommunetype.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/kataloger/kommunetype.test.ts
import { describe, it, expect } from 'vitest';
import { KOMMUNETYPER, KOMMUNETYPE_LABEL, type Kommunetype } from './kommunetype';

describe('kommunetype', () => {
  it('har præcis de 5 Danmarks-Statistik-typer', () => {
    expect([...KOMMUNETYPER]).toEqual(['land', 'oplands', 'provinsby', 'storby', 'hovedstad']);
  });

  it('har en dansk label for hver type', () => {
    for (const t of KOMMUNETYPER) {
      expect(KOMMUNETYPE_LABEL[t]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/kataloger/kommunetype.test.ts`
Expected: FAIL — "Cannot find module './kommunetype'".

- [ ] **Step 3: Implement the constant**

```typescript
// lib/kataloger/kommunetype.ts
// Danmarks Statistiks 5 kommunetyper. Kilde: evidensgrundlag §6.1 [D2 s.31, Figur 10].
export const KOMMUNETYPER = ['land', 'oplands', 'provinsby', 'storby', 'hovedstad'] as const;

export type Kommunetype = typeof KOMMUNETYPER[number];

export const KOMMUNETYPE_LABEL: Record<Kommunetype, string> = {
  land: 'Landkommune',
  oplands: 'Oplandskommune',
  provinsby: 'Provinsbykommune',
  storby: 'Storbykommune',
  hovedstad: 'Hovedstadskommune',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/kataloger/kommunetype.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the pgEnum (reuses the same string list)**

Tilføj i `db/schema/enums.ts` (efter `indhentningsKadenceEnum`):

```typescript
export const kommunetypeEnum = pgEnum('kommunetype', [
  'land', 'oplands', 'provinsby', 'storby', 'hovedstad',
]);
```

(`standardtiltagKategoriEnum` deklareres i Task B1 sammen med tabellen der bruger den — så `drizzle-kit generate` emitterer dens `CREATE TYPE` deterministisk i samme migration som tabellen.)

- [ ] **Step 6: Commit**

```bash
git add lib/kataloger/kommunetype.ts lib/kataloger/kommunetype.test.ts db/schema/enums.ts
git commit -m "feat(fase1): kommunetype-enum + delt union-type"
```

---

### Task A2: `kommunetype`-kolonne på kommune + migration

**Files:**
- Modify: `db/schema/kommune.ts`
- Create: `db/migrations/0015_*.sql` (genereret)

- [ ] **Step 1: Tilføj kolonnen i schema**

I `db/schema/kommune.ts`: importér enum og tilføj feltet (nullable — demo-kommuner og ukendte koder kan stå tomme).

Ændr importlinjen:
```typescript
import { indhentningsKadenceEnum, kommunetypeEnum } from './enums';
```
Tilføj feltet (efter `indhentningsKadence`-linjen, før `createdAt`):
```typescript
  kommunetype: kommunetypeEnum('kommunetype'),
```

- [ ] **Step 2: Generér migration**

Run: `npx drizzle-kit generate`
Expected: Ny fil `db/migrations/0015_*.sql` der indeholder `CREATE TYPE "public"."kommunetype" ...` og `ALTER TABLE "kommune" ADD COLUMN "kommunetype" "kommunetype";`

- [ ] **Step 3: Verificér migration-SQL**

Run: `cat db/migrations/0015_*.sql`
Expected: Indeholder `CREATE TYPE "kommunetype"` og `ALTER TABLE "kommune" ADD COLUMN "kommunetype"`. Ingen `DROP`/ændring af `NOT NULL` på eksisterende kolonner.

- [ ] **Step 4: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: Ingen fejl.

- [ ] **Step 5: Commit**

```bash
git add db/schema/kommune.ts db/migrations
git commit -m "feat(fase1): kommunetype-kolonne paa kommune + migration"
```

---

### Task A3: Komplettér kommune-listen til 98 + kommunetype pr. kommune

**Files:**
- Modify: `lib/kommuner-liste.ts`
- Test: `lib/kommuner-liste.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/kommuner-liste.test.ts
import { describe, it, expect } from 'vitest';
import { ALLE_KOMMUNER, findKommune } from './kommuner-liste';
import { KOMMUNETYPER } from './kataloger/kommunetype';

describe('ALLE_KOMMUNER', () => {
  it('indeholder alle 98 kommuner', () => {
    expect(ALLE_KOMMUNER).toHaveLength(98);
  });

  it('inkluderer Morsø (773)', () => {
    expect(findKommune('773')?.navn).toBe('Morsø');
  });

  it('har en gyldig kommunetype på hver kommune', () => {
    for (const k of ALLE_KOMMUNER) {
      expect(KOMMUNETYPER).toContain(k.type);
    }
  });

  it('har korrekt typefordeling (31/24/16/3/24)', () => {
    const count = (t: string) => ALLE_KOMMUNER.filter((k) => k.type === t).length;
    expect(count('land')).toBe(31);
    expect(count('oplands')).toBe(24);
    expect(count('provinsby')).toBe(16);
    expect(count('storby')).toBe(3);
    expect(count('hovedstad')).toBe(24);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/kommuner-liste.test.ts`
Expected: FAIL — length 97, og `k.type` findes ikke.

- [ ] **Step 3: Tilføj Morsø + `type` på alle entries**

Erstat hele `ALLE_KOMMUNER`-arrayet i `lib/kommuner-liste.ts` med nedenstående (Morsø `773` indsat i kodeorden mellem `760` og `779`; `type` tilføjet på hver). Importér typen øverst:

```typescript
import type { Kommunetype } from './kataloger/kommunetype';

export const ALLE_KOMMUNER = [
  { kode: '101', navn: 'København', type: 'hovedstad' },
  { kode: '147', navn: 'Frederiksberg', type: 'hovedstad' },
  { kode: '151', navn: 'Ballerup', type: 'hovedstad' },
  { kode: '153', navn: 'Brøndby', type: 'hovedstad' },
  { kode: '155', navn: 'Dragør', type: 'hovedstad' },
  { kode: '157', navn: 'Gentofte', type: 'hovedstad' },
  { kode: '159', navn: 'Gladsaxe', type: 'hovedstad' },
  { kode: '161', navn: 'Glostrup', type: 'hovedstad' },
  { kode: '163', navn: 'Herlev', type: 'hovedstad' },
  { kode: '165', navn: 'Albertslund', type: 'hovedstad' },
  { kode: '167', navn: 'Hvidovre', type: 'hovedstad' },
  { kode: '169', navn: 'Høje-Taastrup', type: 'hovedstad' },
  { kode: '173', navn: 'Lyngby-Taarbæk', type: 'hovedstad' },
  { kode: '175', navn: 'Rødovre', type: 'hovedstad' },
  { kode: '183', navn: 'Ishøj', type: 'hovedstad' },
  { kode: '185', navn: 'Tårnby', type: 'hovedstad' },
  { kode: '187', navn: 'Vallensbæk', type: 'hovedstad' },
  { kode: '190', navn: 'Furesø', type: 'hovedstad' },
  { kode: '201', navn: 'Allerød', type: 'hovedstad' },
  { kode: '210', navn: 'Fredensborg', type: 'oplands' },
  { kode: '217', navn: 'Helsingør', type: 'provinsby' },
  { kode: '219', navn: 'Hillerød', type: 'provinsby' },
  { kode: '223', navn: 'Hørsholm', type: 'hovedstad' },
  { kode: '230', navn: 'Rudersdal', type: 'hovedstad' },
  { kode: '240', navn: 'Egedal', type: 'hovedstad' },
  { kode: '250', navn: 'Frederikssund', type: 'oplands' },
  { kode: '253', navn: 'Greve', type: 'hovedstad' },
  { kode: '259', navn: 'Køge', type: 'provinsby' },
  { kode: '260', navn: 'Halsnæs', type: 'oplands' },
  { kode: '265', navn: 'Roskilde', type: 'provinsby' },
  { kode: '269', navn: 'Solrød', type: 'hovedstad' },
  { kode: '270', navn: 'Gribskov', type: 'oplands' },
  { kode: '306', navn: 'Odsherred', type: 'land' },
  { kode: '316', navn: 'Holbæk', type: 'oplands' },
  { kode: '320', navn: 'Faxe', type: 'oplands' },
  { kode: '326', navn: 'Kalundborg', type: 'land' },
  { kode: '329', navn: 'Ringsted', type: 'oplands' },
  { kode: '330', navn: 'Slagelse', type: 'provinsby' },
  { kode: '336', navn: 'Stevns', type: 'oplands' },
  { kode: '340', navn: 'Sorø', type: 'oplands' },
  { kode: '350', navn: 'Lejre', type: 'oplands' },
  { kode: '360', navn: 'Lolland', type: 'land' },
  { kode: '370', navn: 'Næstved', type: 'provinsby' },
  { kode: '376', navn: 'Guldborgsund', type: 'land' },
  { kode: '390', navn: 'Vordingborg', type: 'land' },
  { kode: '400', navn: 'Bornholm', type: 'land' },
  { kode: '410', navn: 'Middelfart', type: 'oplands' },
  { kode: '420', navn: 'Assens', type: 'oplands' },
  { kode: '430', navn: 'Faaborg-Midtfyn', type: 'oplands' },
  { kode: '440', navn: 'Kerteminde', type: 'oplands' },
  { kode: '450', navn: 'Nyborg', type: 'oplands' },
  { kode: '461', navn: 'Odense', type: 'storby' },
  { kode: '479', navn: 'Svendborg', type: 'land' },
  { kode: '480', navn: 'Nordfyns', type: 'oplands' },
  { kode: '482', navn: 'Langeland', type: 'land' },
  { kode: '492', navn: 'Ærø', type: 'land' },
  { kode: '510', navn: 'Haderslev', type: 'land' },
  { kode: '530', navn: 'Billund', type: 'land' },
  { kode: '540', navn: 'Sønderborg', type: 'land' },
  { kode: '550', navn: 'Tønder', type: 'land' },
  { kode: '561', navn: 'Esbjerg', type: 'provinsby' },
  { kode: '563', navn: 'Fanø', type: 'land' },
  { kode: '573', navn: 'Varde', type: 'land' },
  { kode: '575', navn: 'Vejen', type: 'oplands' },
  { kode: '580', navn: 'Aabenraa', type: 'land' },
  { kode: '607', navn: 'Fredericia', type: 'provinsby' },
  { kode: '615', navn: 'Horsens', type: 'provinsby' },
  { kode: '621', navn: 'Kolding', type: 'provinsby' },
  { kode: '630', navn: 'Vejle', type: 'provinsby' },
  { kode: '657', navn: 'Herning', type: 'provinsby' },
  { kode: '661', navn: 'Holstebro', type: 'provinsby' },
  { kode: '665', navn: 'Lemvig', type: 'land' },
  { kode: '671', navn: 'Struer', type: 'land' },
  { kode: '706', navn: 'Syddjurs', type: 'oplands' },
  { kode: '707', navn: 'Norddjurs', type: 'land' },
  { kode: '710', navn: 'Favrskov', type: 'oplands' },
  { kode: '727', navn: 'Odder', type: 'oplands' },
  { kode: '730', navn: 'Randers', type: 'provinsby' },
  { kode: '740', navn: 'Silkeborg', type: 'provinsby' },
  { kode: '741', navn: 'Samsø', type: 'land' },
  { kode: '746', navn: 'Skanderborg', type: 'oplands' },
  { kode: '751', navn: 'Aarhus', type: 'storby' },
  { kode: '756', navn: 'Ikast-Brande', type: 'oplands' },
  { kode: '760', navn: 'Ringkøbing-Skjern', type: 'land' },
  { kode: '773', navn: 'Morsø', type: 'land' },
  { kode: '779', navn: 'Skive', type: 'land' },
  { kode: '787', navn: 'Thisted', type: 'land' },
  { kode: '791', navn: 'Viborg', type: 'provinsby' },
  { kode: '810', navn: 'Brønderslev', type: 'land' },
  { kode: '813', navn: 'Frederikshavn', type: 'land' },
  { kode: '820', navn: 'Vesthimmerlands', type: 'land' },
  { kode: '825', navn: 'Læsø', type: 'land' },
  { kode: '840', navn: 'Rebild', type: 'oplands' },
  { kode: '846', navn: 'Mariagerfjord', type: 'land' },
  { kode: '849', navn: 'Jammerbugt', type: 'land' },
  { kode: '851', navn: 'Aalborg', type: 'storby' },
  { kode: '860', navn: 'Hjørring', type: 'land' },
] as const satisfies ReadonlyArray<{ kode: string; navn: string; type: Kommunetype }>;
```

Behold `KommuneKode`-typen og `findKommune`-funktionen nedenunder uændret.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/kommuner-liste.test.ts`
Expected: PASS (98 kommuner, Morsø findes, fordeling 31/24/16/3/24).

- [ ] **Step 5: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: Ingen fejl (`satisfies` bekræfter at hver `type` er en gyldig `Kommunetype`).

- [ ] **Step 6: Commit**

```bash
git add lib/kommuner-liste.ts lib/kommuner-liste.test.ts
git commit -m "feat(fase1): komplettér kommune-liste til 98 (+ Morsø) med kommunetype"
```

---

### Task A4: Sæt kommunetype ved onboarding + backfill

**Files:**
- Modify: `db/queries/kommune.ts`
- Modify: `app/admin/kommuner/actions.ts`
- Modify: `db/seed.ts`
- Test: `app/admin/kommuner/actions.test.ts` (findes — udvid)

- [ ] **Step 1: Udvid `createKommune` til at gemme kommunetype**

I `db/queries/kommune.ts`, ændr `createKommune`:

```typescript
import type { Kommunetype } from '@/lib/kataloger/kommunetype';

export async function createKommune(data: {
  navn: string;
  kommunekode: string;
  subdomain: string;
  kommunetype?: Kommunetype;
}) {
  const [created] = await db.insert(kommune).values(data).returning();
  return created;
}
```

- [ ] **Step 2: Write the failing test (onboarding sætter type)**

Læs den eksisterende `app/admin/kommuner/actions.test.ts` for mock-mønstret, og tilføj en case der verificerer at `createKommune` kaldes med `kommunetype` fra listen. Eksempel-test (tilpas mock til den eksisterende fil):

```typescript
it('sætter kommunetype fra kommune-listen ved oprettelse', async () => {
  const { createKommune } = await import('@/db/queries');
  const formData = new FormData();
  formData.set('kommunekode', '787'); // Thisted = land
  const { createKommuneAction } = await import('./actions');
  await createKommuneAction(undefined, formData);
  expect(createKommune).toHaveBeenCalledWith(
    expect.objectContaining({ kommunekode: '787', kommunetype: 'land' }),
  );
});
```

Bemærk: den eksisterende test mocker allerede `@/db/queries` og `verifySession`. Genbrug de mocks. Hvis `redirect` kaster i test (Next.js), wrap kaldet i `try/catch` som de eksisterende cases sandsynligvis gør.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run app/admin/kommuner/actions.test.ts`
Expected: FAIL — `createKommune` kaldes uden `kommunetype`.

- [ ] **Step 4: Send kommunetype med i action**

I `app/admin/kommuner/actions.ts`, ændr oprettelses-blokken:

```typescript
  const { navn, kode: kommunekode, type: kommunetype } = kommune;
  const subdomain = toSubdomain(navn);

  try {
    await createKommune({ navn, kommunekode, subdomain, kommunetype });
  } catch {
    return { message: 'Kommunen er allerede oprettet.' };
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/admin/kommuner/actions.test.ts`
Expected: PASS.

- [ ] **Step 6: Backfill eksisterende kommuner i seed**

I `db/seed.ts`, importér listen og tilføj en idempotent backfill (kør efter admin-user-seed, før indikator-templates). Sætter kun type hvor den mangler og koden er kendt:

```typescript
import { ALLE_KOMMUNER } from '../lib/kommuner-liste';
import { isNull, and } from 'drizzle-orm';
// ...
console.log('Backfilling kommunetype...');
for (const k of ALLE_KOMMUNER) {
  await db.update(kommune)
    .set({ kommunetype: k.type })
    .where(and(eq(kommune.kommunekode, k.kode), isNull(kommune.kommunetype)));
}
console.log('Kommunetype backfill done.');
```

(`kommune`, `eq` importeres allerede i seed.ts; tilføj `isNull, and` til drizzle-importen og `ALLE_KOMMUNER`.)

- [ ] **Step 7: Verificér typecheck + fuld testsuite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Ingen typefejl; alle tests grønne.

- [ ] **Step 8: Commit**

```bash
git add db/queries/kommune.ts app/admin/kommuner/actions.ts app/admin/kommuner/actions.test.ts db/seed.ts
git commit -m "feat(fase1): sæt kommunetype ved onboarding + backfill eksisterende"
```

---

# DEL B — Standardtiltag-katalog (46 tiltag)

### Task B1: `standardtiltag`-tabel + migration

**Files:**
- Modify: `db/schema/enums.ts`
- Create: `db/schema/standardtiltag.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/0016_*.sql` (genereret)

- [ ] **Step 0: Deklarér kategori-enum**

Tilføj i `db/schema/enums.ts` (efter `kommunetypeEnum`):
```typescript
export const standardtiltagKategoriEnum = pgEnum('standardtiltag_kategori', [
  'energi', 'transport', 'landbrug_areal', 'scope3',
]);
```

- [ ] **Step 1: Opret schema-filen**

```typescript
// db/schema/standardtiltag.ts
import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { standardtiltagKategoriEnum, sektorEnum, tiltagTypeEnum } from './enums';

// Nationalt katalog over navngivne standardtiltag fra CO₂-analysen.
// Kilde: evidensgrundlag §6.3 [D2 s.28–37]. National template — IKKE per-kommune
// (den per-kommune tabel er `tiltag`).
export const standardtiltag = pgTable('standardtiltag', {
  id: uuid('id').primaryKey().defaultRandom(),
  titel: text('titel').notNull(),
  kategori: standardtiltagKategoriEnum('kategori').notNull(),
  sektor: sektorEnum('sektor'),
  udbredelsesProcent: integer('udbredelses_procent'),
  type: tiltagTypeEnum('type').notNull().default('reduction'),
  beskrivelse: text('beskrivelse'),
  aktiv: boolean('aktiv').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('standardtiltag_titel_unique').on(t.titel),
]);
```

- [ ] **Step 2: Registrér i schema-barrel**

Tilføj i `db/schema/index.ts` (efter `export * from './tiltag';`):
```typescript
export * from './standardtiltag';
```

- [ ] **Step 3: Generér migration**

Run: `npx drizzle-kit generate`
Expected: `db/migrations/0016_*.sql` med `CREATE TYPE "public"."standardtiltag_kategori" ...`, `CREATE TABLE "standardtiltag" (...)` og unique-index på `titel`.

- [ ] **Step 4: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: Ingen fejl.

- [ ] **Step 5: Commit**

```bash
git add db/schema/enums.ts db/schema/standardtiltag.ts db/schema/index.ts db/migrations
git commit -m "feat(fase1): standardtiltag katalog-tabel + migration"
```

---

### Task B2: De 46 tiltag som typet katalog-konstant

**Files:**
- Create: `lib/kataloger/standardtiltag-katalog.ts`
- Test: `lib/kataloger/standardtiltag-katalog.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/kataloger/standardtiltag-katalog.test.ts
import { describe, it, expect } from 'vitest';
import { STANDARDTILTAG_KATALOG } from './standardtiltag-katalog';

describe('STANDARDTILTAG_KATALOG', () => {
  it('indeholder præcis 46 tiltag', () => {
    expect(STANDARDTILTAG_KATALOG).toHaveLength(46);
  });

  it('har korrekt fordeling pr. kategori (11/10/10/15)', () => {
    const n = (k: string) => STANDARDTILTAG_KATALOG.filter((t) => t.kategori === k).length;
    expect(n('energi')).toBe(11);
    expect(n('transport')).toBe(10);
    expect(n('landbrug_areal')).toBe(10);
    expect(n('scope3')).toBe(15);
  });

  it('har unikke titler', () => {
    const titler = STANDARDTILTAG_KATALOG.map((t) => t.titel);
    expect(new Set(titler).size).toBe(46);
  });

  it('har udbredelses-% i 0–100 på hvert tiltag', () => {
    for (const t of STANDARDTILTAG_KATALOG) {
      expect(t.udbredelsesProcent).toBeGreaterThanOrEqual(0);
      expect(t.udbredelsesProcent).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/kataloger/standardtiltag-katalog.test.ts`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Implement the catalog (data fra §6.3)**

```typescript
// lib/kataloger/standardtiltag-katalog.ts
// 46 navngivne standardtiltag. Kilde: evidensgrundlag §6.3 [D2 s.28–37].
// udbredelsesProcent = andel af de 96 analyserede kommuner der har tiltaget.
type Kategori = 'energi' | 'transport' | 'landbrug_areal' | 'scope3';

export type Standardtiltag = {
  titel: string;
  kategori: Kategori;
  udbredelsesProcent: number;
};

export const STANDARDTILTAG_KATALOG: readonly Standardtiltag[] = [
  // Energi (11) [D2 s.28]
  { titel: 'Konvertering af olie-/naturgasfyr til fjernvarme/varmepumpe', kategori: 'energi', udbredelsesProcent: 99 },
  { titel: 'Varmebesparelser', kategori: 'energi', udbredelsesProcent: 86 },
  { titel: 'Solceller på marker', kategori: 'energi', udbredelsesProcent: 78 },
  { titel: 'Solceller på tage', kategori: 'energi', udbredelsesProcent: 67 },
  { titel: 'Landvind', kategori: 'energi', udbredelsesProcent: 66 },
  { titel: 'Biogasanlæg', kategori: 'energi', udbredelsesProcent: 48 },
  { titel: 'Fossil ud af fjernvarme', kategori: 'energi', udbredelsesProcent: 46 },
  { titel: 'Overskudsvarme', kategori: 'energi', udbredelsesProcent: 42 },
  { titel: 'Plastudsortering', kategori: 'energi', udbredelsesProcent: 39 },
  { titel: 'CCS (CO₂-fangst og -lagring)', kategori: 'energi', udbredelsesProcent: 32 },
  { titel: 'PtX (Power-to-X)', kategori: 'energi', udbredelsesProcent: 29 },

  // Transport (10) [D2 s.29]
  { titel: 'El/gas i kollektiv trafik', kategori: 'transport', udbredelsesProcent: 85 },
  { titel: 'Ladeinfrastruktur', kategori: 'transport', udbredelsesProcent: 85 },
  { titel: 'Fremme af cyklisme', kategori: 'transport', udbredelsesProcent: 77 },
  { titel: 'Kommunal elflåde', kategori: 'transport', udbredelsesProcent: 73 },
  { titel: 'Elektrificering af person-/varebiler', kategori: 'transport', udbredelsesProcent: 73 },
  { titel: 'Fremme af kollektiv transport', kategori: 'transport', udbredelsesProcent: 59 },
  { titel: 'Ændrede transportvaner', kategori: 'transport', udbredelsesProcent: 57 },
  { titel: 'Samkørsel og delebiler', kategori: 'transport', udbredelsesProcent: 56 },
  { titel: 'Tunge køretøjer fossilfri', kategori: 'transport', udbredelsesProcent: 54 },
  { titel: 'Energieffektivitet i transport', kategori: 'transport', udbredelsesProcent: 36 },

  // Landbrug/areal (10) [D2 s.30]
  { titel: 'Skovrejsning', kategori: 'landbrug_areal', udbredelsesProcent: 78 },
  { titel: 'Udtag af lavbundsjorde', kategori: 'landbrug_areal', udbredelsesProcent: 70 },
  { titel: 'Landbrugs-klimaplan', kategori: 'landbrug_areal', udbredelsesProcent: 43 },
  { titel: 'Forgasning af husdyrgødning', kategori: 'landbrug_areal', udbredelsesProcent: 40 },
  { titel: 'Biochar', kategori: 'landbrug_areal', udbredelsesProcent: 30 },
  { titel: 'Staldteknologi', kategori: 'landbrug_areal', udbredelsesProcent: 29 },
  { titel: 'Natur- og klimagenopretning', kategori: 'landbrug_areal', udbredelsesProcent: 25 },
  { titel: 'Fodringsteknologi', kategori: 'landbrug_areal', udbredelsesProcent: 24 },
  { titel: 'Afgrødeomlægning', kategori: 'landbrug_areal', udbredelsesProcent: 23 },
  { titel: 'Planteavl i øvrigt', kategori: 'landbrug_areal', udbredelsesProcent: 22 },

  // Scope 3 (15) [D2 s.37]
  { titel: 'Grønne indkøb', kategori: 'scope3', udbredelsesProcent: 66 },
  { titel: 'Affaldssortering', kategori: 'scope3', udbredelsesProcent: 54 },
  { titel: 'Klimavenlig kost', kategori: 'scope3', udbredelsesProcent: 53 },
  { titel: 'Bæredygtige byggematerialer', kategori: 'scope3', udbredelsesProcent: 46 },
  { titel: 'Mindre madspild', kategori: 'scope3', udbredelsesProcent: 45 },
  { titel: 'Bæredygtig levevis', kategori: 'scope3', udbredelsesProcent: 42 },
  { titel: 'Genanvendelse af byggematerialer', kategori: 'scope3', udbredelsesProcent: 35 },
  { titel: 'Cirkulær økonomi', kategori: 'scope3', udbredelsesProcent: 33 },
  { titel: 'Kommunen som virksomhed', kategori: 'scope3', udbredelsesProcent: 31 },
  { titel: 'CO₂-regnskaber for virksomheder', kategori: 'scope3', udbredelsesProcent: 29 },
  { titel: 'Tekstilgenbrug', kategori: 'scope3', udbredelsesProcent: 18 },
  { titel: 'Deleøkonomi', kategori: 'scope3', udbredelsesProcent: 12 },
  { titel: 'Renovering frem for nybyggeri', kategori: 'scope3', udbredelsesProcent: 7 },
  { titel: 'Elektronik', kategori: 'scope3', udbredelsesProcent: 6 },
  { titel: 'Internationale flyrejser', kategori: 'scope3', udbredelsesProcent: 5 },
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/kataloger/standardtiltag-katalog.test.ts`
Expected: PASS (46 tiltag, fordeling 11/10/10/15, unikke titler).

- [ ] **Step 5: Commit**

```bash
git add lib/kataloger/standardtiltag-katalog.ts lib/kataloger/standardtiltag-katalog.test.ts
git commit -m "feat(fase1): 46 standardtiltag som typet katalog-konstant"
```

---

### Task B3: Seed kataloget + læs-query

**Files:**
- Create: `db/queries/standardtiltag.ts`
- Modify: `db/queries/index.ts` (hvis barrel findes)
- Modify: `db/seed.ts`
- Test: `db/queries/standardtiltag.test.ts`

- [ ] **Step 1: Write the failing query test**

Følg mønstret fra en eksisterende query-test (fx `db/queries/kommune-indikator.test.ts`) der mocker `@/db`. Test at `getStandardtiltagKatalog` kalder findMany med ordering, og at kategori-filter bruger en where-klausul:

```typescript
// db/queries/standardtiltag.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMany = vi.fn();
vi.mock('@/db', () => ({ db: { query: { standardtiltag: { findMany } } } }));

beforeEach(() => { findMany.mockReset(); findMany.mockResolvedValue([]); });

describe('getStandardtiltagKatalog', () => {
  it('henter aktive tiltag sorteret', async () => {
    const { getStandardtiltagKatalog } = await import('./standardtiltag');
    await getStandardtiltagKatalog();
    expect(findMany).toHaveBeenCalledOnce();
  });

  it('filtrerer på kategori når angivet', async () => {
    const { getStandardtiltagKatalog } = await import('./standardtiltag');
    await getStandardtiltagKatalog('energi');
    const arg = findMany.mock.calls[0][0];
    expect(arg.where).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run db/queries/standardtiltag.test.ts`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Implement the query**

```typescript
// db/queries/standardtiltag.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run db/queries/standardtiltag.test.ts`
Expected: PASS.

- [ ] **Step 5: Tilføj seed (idempotent på titel)**

I `db/seed.ts`, importér kataloget og indsæt efter indikator-template-seed:

```typescript
import { STANDARDTILTAG_KATALOG } from '../lib/kataloger/standardtiltag-katalog';
// ...
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
```

- [ ] **Step 6: Eksportér query fra barrel**

`db/queries/index.ts` ER en barrel (verificeret — eksporterer kommune, indikator-template m.fl.). Tilføj efter `export * from './tiltag';`:
```typescript
export * from './standardtiltag';
```

- [ ] **Step 7: Verificér typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Grønt.

- [ ] **Step 8: Commit**

```bash
git add db/queries/standardtiltag.ts db/queries/standardtiltag.test.ts db/seed.ts db/queries/index.ts
git commit -m "feat(fase1): seed standardtiltag-katalog + læs-query"
```

---

# DEL C — Omstillingsindikatorer (9 benchmark-templates)

### Task C1: Udvid `indikator_template` med benchmark-felter + migration

**Files:**
- Modify: `db/schema/indikator-template.ts`
- Create: `db/migrations/0017_*.sql` (genereret)

- [ ] **Step 1: Udvid schema**

I `db/schema/indikator-template.ts`: gør `kilde` + `apiQuery` nullable (fjern `.notNull()`), og tilføj benchmark-felter. Opdatér importerne til at inkludere `real` og enums:

```typescript
import { pgTable, uuid, text, boolean, integer, real, timestamp, unique, uniqueIndex } from 'drizzle-orm/pg-core';
import { apiKildeEnum, indikatorNiveauEnum, sektorEnum } from './enums';
import { kommune } from './kommune';
import { indikator } from './indikator';

export const indikatorTemplate = pgTable('indikator_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  titel: text('titel').notNull(),
  kilde: apiKildeEnum('kilde'),
  apiQuery: text('api_query'),
  enhed: text('enhed').notNull(),
  beskrivelse: text('beskrivelse').notNull(),
  cctfKriterier: integer('cctf_kriterier').array().notNull().default([]),
  niveau: indikatorNiveauEnum('niveau'),
  sektor: sektorEnum('sektor'),
  nationalMaalvaerdi: real('national_maalvaerdi'),
  nationalMaalvaerdiNote: text('national_maalvaerdi_note'),
  aktiv: boolean('aktiv').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('indikator_template_titel_unique').on(t.titel),
]);
```

(Behold `kommuneIndikator`-tabellen nedenunder uændret.)

- [ ] **Step 2: Generér migration**

Run: `npx drizzle-kit generate`
Expected: `0017_*.sql` med `ALTER COLUMN "kilde" DROP NOT NULL`, `ALTER COLUMN "api_query" DROP NOT NULL`, og fire `ADD COLUMN` (niveau, sektor, national_maalvaerdi, national_maalvaerdi_note).

- [ ] **Step 3: Verificér SQL er ikke-destruktiv**

Run: `cat db/migrations/0017_*.sql`
Expected: Kun `DROP NOT NULL` + `ADD COLUMN`. Ingen `DROP COLUMN`/`DROP TABLE`. Eksisterende 3 templates beholder deres kilde/apiQuery.

- [ ] **Step 4: Commit**

```bash
git add db/schema/indikator-template.ts db/migrations
git commit -m "feat(fase1): indikator-template benchmark-felter + nullable kilde"
```

---

### Task C2: Reparér typer efter nullable kilde/apiQuery

**Files:**
- Modify: `db/queries/kommune-indikator.ts`
- Modify: `db/queries/indikator-template.ts`
- Modify: `lib/jobs/fetch-dst.ts`
- Modify: `lib/jobs/fetch-klimaregnskabet.ts`

**Kontekst:** `indikator_template.kilde`/`apiQuery` er nu `string | null` i de inferrede typer. `getActiveKommuneIndikatorer` filtrerer på en konkret `kilde`, men dens eksplicitte returtype skal stadig opdateres, og de fetch-jobs der læser `apiQuery` skal have et null-guard.

- [ ] **Step 1: Kør typecheck for at se de præcise fejl**

Run: `npx tsc --noEmit`
Expected: Fejl i `db/queries/kommune-indikator.ts` (template-projektion `string | null` ikke tildelelig til `{ kilde: string; apiQuery: string }`) og evt. i fetch-jobs.

- [ ] **Step 2: Opdatér `ActiveKommuneIndikator`-typen**

I `db/queries/kommune-indikator.ts`, gør template-felterne nullable i typen:

```typescript
export type ActiveKommuneIndikator = {
  id: string;
  kommuneId: string;
  indikatorId: string;
  templateId: string;
  sidstHentet: Date | null;
  template: { kilde: string | null; apiQuery: string | null };
  kommune: { kommunekode: string };
};
```

(`getActiveKommuneIndikatorer` filtrerer fortsat `where(... eq(indikatorTemplate.kilde, kilde))`, så benchmark-templates med null kilde returneres aldrig — kun typen løsnes.)

- [ ] **Step 3: Null-guard i fetch-dst**

I `lib/jobs/fetch-dst.ts` omkring linje 88, hvor `JSON.parse(ki.template.apiQuery)` sker — tilføj guard før parsing:

```typescript
    if (!ki.template.apiQuery) {
      await updateSidsteFejl(ki.id, 'Template mangler apiQuery');
      continue;
    }
    try {
      query = JSON.parse(ki.template.apiQuery) as DstApiQuery;
```

- [ ] **Step 4: fetch-klimaregnskabet — ingen ændring**

Verificeret: `lib/jobs/fetch-klimaregnskabet.ts` læser IKKE `template.apiQuery` (den bruger kun `kilde`-filteret via `getActiveKommuneIndikatorer('klimaregnskab')`). Intet guard nødvendigt. Bekræft med: `grep -n apiQuery lib/jobs/fetch-klimaregnskabet.ts` (forventet: ingen match).

- [ ] **Step 5: Opdatér `createTemplate`-query til de nye felter**

I `db/queries/indikator-template.ts`, gør `createTemplate` fleksibel (kilde/apiQuery valgfri, nye benchmark-felter):

```typescript
export async function createTemplate(data: {
  titel: string;
  enhed: string;
  beskrivelse: string;
  cctfKriterier: number[];
  kilde?: 'klimaregnskab' | 'energidataservice' | 'dst';
  apiQuery?: string;
  niveau?: 'output' | 'outcome' | 'impact';
  sektor?: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  nationalMaalvaerdi?: number;
  nationalMaalvaerdiNote?: string;
}) {
  const [created] = await db.insert(indikatorTemplate).values(data).returning();
  return created;
}
```

- [ ] **Step 6: Verificér typecheck + fuld testsuite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Ingen typefejl; alle eksisterende fetch-job-tests grønne (de bruger templates MED kilde, så guards rammer ikke).

- [ ] **Step 7: Commit**

```bash
git add db/queries/kommune-indikator.ts db/queries/indikator-template.ts lib/jobs/fetch-dst.ts
git commit -m "fix(fase1): håndtér nullable template-kilde/apiQuery i typer + fetch-jobs"
```

---

### Task C3: De 9 omstillingsindikatorer som katalog-konstant + seed

**Files:**
- Create: `lib/kataloger/omstillingsindikatorer.ts`
- Test: `lib/kataloger/omstillingsindikatorer.test.ts`
- Modify: `db/seed.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/kataloger/omstillingsindikatorer.test.ts
import { describe, it, expect } from 'vitest';
import { OMSTILLINGSINDIKATORER } from './omstillingsindikatorer';

describe('OMSTILLINGSINDIKATORER', () => {
  it('indeholder præcis 9 indikatorer', () => {
    expect(OMSTILLINGSINDIKATORER).toHaveLength(9);
  });

  it('har enhed og national målværdi på hver', () => {
    for (const i of OMSTILLINGSINDIKATORER) {
      expect(i.enhed).toBeTruthy();
      expect(typeof i.nationalMaalvaerdi).toBe('number');
    }
  });

  it('har unikke titler', () => {
    expect(new Set(OMSTILLINGSINDIKATORER.map((i) => i.titel)).size).toBe(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/kataloger/omstillingsindikatorer.test.ts`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Implement the catalog (data fra §6.4)**

```typescript
// lib/kataloger/omstillingsindikatorer.ts
// 9 nationale omstillingsindikatorer med national målværdi. Kilde: evidensgrundlag
// §6.4 [D2 s.35, Tabel 13]. Seedes som benchmark-templates UDEN live kilde
// (datakilder wires i Fase 2). niveau = outcome/impact.
type Niveau = 'outcome' | 'impact';
type Sektor = 'energy' | 'transport' | 'agriculture';

export type Omstillingsindikator = {
  titel: string;
  enhed: string;
  nationalMaalvaerdi: number;
  nationalMaalvaerdiNote: string;
  niveau: Niveau;
  sektor: Sektor;
};

export const OMSTILLINGSINDIKATORER: readonly Omstillingsindikator[] = [
  { titel: 'Udfasning af naturgas til rumvarme', enhed: '%', nationalMaalvaerdi: 100, nationalMaalvaerdiNote: '100% i 2035', niveau: 'outcome', sektor: 'energy' },
  { titel: 'Indfasning af elbiler', enhed: '% af bilpark', nationalMaalvaerdi: 23, nationalMaalvaerdiNote: '23% rene elbiler i 2030', niveau: 'outcome', sektor: 'transport' },
  { titel: 'Elproduktion fra solceller', enhed: 'GWh/år', nationalMaalvaerdi: 27000, nationalMaalvaerdiNote: '~27.000 GWh/år', niveau: 'impact', sektor: 'energy' },
  { titel: 'Elproduktion fra land-/kystvind', enhed: 'GWh/år', nationalMaalvaerdi: 23000, nationalMaalvaerdiNote: '~23.000 GWh/år', niveau: 'impact', sektor: 'energy' },
  { titel: 'Udtag af lavbundsjorde', enhed: 'ha', nationalMaalvaerdi: 80000, nationalMaalvaerdiNote: '80.000 ha', niveau: 'impact', sektor: 'agriculture' },
  { titel: 'Skovrejsning', enhed: 'ha', nationalMaalvaerdi: 60000, nationalMaalvaerdiNote: '~60.000 ha', niveau: 'impact', sektor: 'agriculture' },
  { titel: 'Biogas', enhed: 'GWh/år', nationalMaalvaerdi: 14500, nationalMaalvaerdiNote: '14.500 GWh/år', niveau: 'impact', sektor: 'energy' },
  { titel: 'PtX (Power-to-X)', enhed: 'GWh/år', nationalMaalvaerdi: 17500, nationalMaalvaerdiNote: '17.500 GWh/år', niveau: 'impact', sektor: 'energy' },
  { titel: 'CCS (CO₂-fangst og -lagring)', enhed: 'kt CO₂/år', nationalMaalvaerdi: 3200, nationalMaalvaerdiNote: '3.200 kt CO₂/år', niveau: 'impact', sektor: 'energy' },
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/kataloger/omstillingsindikatorer.test.ts`
Expected: PASS.

- [ ] **Step 5: Seed de 9 templates (idempotent på titel)**

I `db/seed.ts`, importér og tilføj efter standardtiltag-seed. De får `cctfKriterier: [15]` (MERL/indikatorer), ingen kilde/apiQuery:

```typescript
import { OMSTILLINGSINDIKATORER } from '../lib/kataloger/omstillingsindikatorer';
// ...
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
  })),
).onConflictDoUpdate({
  target: indikatorTemplate.titel,
  set: { updatedAt: new Date() },
});
console.log(`Seeded ${OMSTILLINGSINDIKATORER.length} omstillingsindikatorer.`);
```

(`indikatorTemplate` importeres allerede i seed.ts ved den eksisterende template-seed — genbrug importen.)

- [ ] **Step 6: Verificér typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Grønt.

- [ ] **Step 7: Commit**

```bash
git add lib/kataloger/omstillingsindikatorer.ts lib/kataloger/omstillingsindikatorer.test.ts db/seed.ts
git commit -m "feat(fase1): 9 omstillingsindikatorer som benchmark-templates + seed"
```

---

# DEL D — Onboarding-surface (read-only katalogvisning)

### Task D1: Admin-katalogside

**Files:**
- Create: `app/admin/katalog/page.tsx`

**Kontekst:** Følger mønstret fra `app/admin/kommuner/page.tsx` (async server component, query, Tailwind-tabel, `@/components/ui/button` findes). Viser begge kataloger grupperet — den synlige payoff: "ikke et blankt ark".

- [ ] **Step 1: Implement the page**

```tsx
// app/admin/katalog/page.tsx
import { getStandardtiltagKatalog } from '@/db/queries/standardtiltag';
import { getAllTemplates } from '@/db/queries/indikator-template';

export const metadata = { title: 'Nationale kataloger — Admin' };

const KATEGORI_LABEL: Record<string, string> = {
  energi: 'Energi',
  transport: 'Transport',
  landbrug_areal: 'Landbrug & arealer',
  scope3: 'Forbrug (scope 3)',
};

export default async function KatalogPage() {
  const tiltag = await getStandardtiltagKatalog();
  const templates = await getAllTemplates();
  const benchmarks = templates.filter((t) => t.nationalMaalvaerdi != null);

  const kategorier = ['energi', 'transport', 'landbrug_areal', 'scope3'] as const;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Nationale kataloger</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kurateret udgangspunkt fra CO₂-analysen (DK2020). Foreslås ved onboarding af nye kommuner.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Standardtiltag ({tiltag.length})
        </h2>
        <div className="space-y-6">
          {kategorier.map((kat) => {
            const rows = tiltag.filter((t) => t.kategori === kat);
            if (rows.length === 0) return null;
            return (
              <div key={kat} className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
                  {KATEGORI_LABEL[kat]} ({rows.length})
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2 text-gray-900">{t.titel}</td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {t.udbredelsesProcent}% af kommunerne
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Omstillingsindikatorer ({benchmarks.length})
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Indikator</th>
                <th className="px-4 py-3 font-medium">Enhed</th>
                <th className="px-4 py-3 font-medium">National målværdi</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{t.titel}</td>
                  <td className="px-4 py-3 text-gray-600">{t.enhed}</td>
                  <td className="px-4 py-3 text-gray-600">{t.nationalMaalvaerdiNote ?? t.nationalMaalvaerdi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verificér at admin-layout og nav-link findes**

Læs `app/admin/layout.tsx` (eller den nav-komponent admin bruger). Hvis der er en navigationsliste, tilføj et link til `/admin/katalog` ("Kataloger") ved siden af "Kommuner". Hvis navet er statisk defineret, tilføj punktet i samme mønster.

- [ ] **Step 3: Verificér typecheck + build af siden**

Run: `npx tsc --noEmit`
Expected: Ingen fejl (`getStandardtiltagKatalog`, `getAllTemplates`, `nationalMaalvaerdi`/`nationalMaalvaerdiNote` eksisterer alle).

- [ ] **Step 4: Verificér i browseren (preview-værktøjer)**

Start dev-serveren, log ind som admin, naviger til `/admin/katalog`. Bekræft: 46 tiltag i 4 grupper + 9 indikatorer med målværdier vises. Tag screenshot som bevis.

- [ ] **Step 5: Commit**

```bash
git add app/admin/katalog/page.tsx app/admin/layout.tsx
git commit -m "feat(fase1): read-only admin-visning af nationale kataloger"
```

---

## Afsluttende verifikation

- [ ] **Fuld suite + typecheck + lint**

Run: `npx tsc --noEmit && npx vitest run && npx eslint`
Expected: Alt grønt. Bemærk særligt: data-completeness-tests (98 kommuner, 46 tiltag, 9 indikatorer) passerer.

- [ ] **Migrationer er rene og sekventielle**

Run: `ls db/migrations/ | tail -5`
Expected: `0015`, `0016`, `0017` tilføjet i rækkefølge. Ingen redigering af tidligere migrationer.

---

## Self-Review (udført ved planskrivning)

**1. Spec-dækning (Fase 1):**
- Kommunetype-felt på alle 98 → Task A1–A4 ✓ (inkl. fix af manglende Morsø).
- 46 standardtiltag med udbredelses-% → Task B1–B3 ✓.
- 9 omstillingsindikatorer med enhed + national målværdi → Task C1–C3 ✓.
- "Foreslåede tiltag … ved onboarding" → Task D1 (read-only surface) ✓; per-kommune-adoption bevidst Out of Scope.
- "kommunetype-tag" på tiltag → IKKE implementeret: kilden har ingen per-type-data; dokumenteret under Evidens-disciplin/Out of Scope (opdigter ikke tal).

**2. Placeholder-scan:** Ingen TBD/“håndtér edge cases”. Al kode er konkret. Backfill, seed og queries er fuldt udskrevet.

**3. Type-konsistens:** `Kommunetype` (lib/kataloger/kommunetype.ts) bruges konsistent i listen, `createKommune` og action. Kategori-unionen `'energi'|'transport'|'landbrug_areal'|'scope3'` matcher `standardtiltagKategoriEnum`. `standardtiltag.titel` (unique) matcher seed-`onConflictDoUpdate(target: titel)`. `indikatorTemplate.titel` (unique) matcher indikator-seedens conflict-target. Nullable-kilde-ændringen er fanget i Task C2 (type + fetch-guards).

**Kendt afhængighed mellem tasks:** A1 leverer enums brugt i A2 (kommune-kolonne) og B1 (standardtiltag-kategori). Kør Del A → B → C → D i rækkefølge. Hver task er individuelt committbar og efterlader build/tests grønne.
