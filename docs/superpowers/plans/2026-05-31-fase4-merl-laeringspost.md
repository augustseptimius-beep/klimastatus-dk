# Fase 4 (Prioritet 1) — Læringspost + Beslutningsport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Byg `Læringspost` som førsteklasses entitet (det manglende "L" i MERL) med to oprettelsesindgange — fra en tovholder-rapports barriere og som fritstående oprettelse — plus en "beslutningsport" der flager forældreløse indikatorer i dataoversigten.

**Architecture:** Additiv Drizzle-migration (ny tabel + to enums, ingen ændring af eksisterende constraints). Læringsposter mappes til CCTF-kriterie 15 via den eksisterende `cctf_kriterie_mapping`-tabel og vises i selvevalueringens dokumentationshenvisninger — de påvirker IKKE den automatiske dækningsgrad (coverage-engine røres ikke). En ny `/laering`-side fungerer både som barriere-indbakke (rapporter med barrierer der venter på en beslutning) og oversigt + manuel oprettelse. Beslutningsporten er en ren query der vises som et flag på `/data`.

**Tech Stack:** Next.js 16 (Server Components + Server Actions), Drizzle ORM 0.45, drizzle-kit 0.31 (CLI-migrations), TypeScript, Vitest. Ingen nye dependencies.

**Scope-afgrænsning (bevidst UDE af denne plan):**
- `Monitoreringscyklus` og `monitoreringscyklus_id` på læringspost/rapport/måling — Prioritet 2, separat plan (kræver migration af unique constraint på `indikator_maaling`).
- `Interventionslogik_kobling` — V2.
- Læringsposter der påvirker dækningsgrad-procenten — afvist produktbeslutning (2026-05-31): kun dokumentation.

---

## File Map

| Fil | Handling | Ansvar |
|-----|----------|--------|
| `db/schema/enums.ts` | Modify | Tilføj `laeringsBeslutningEnum` + `laeringsKnytningEnum` |
| `db/schema/laeringspost.ts` | Create | `laeringspost`-tabel |
| `db/schema/index.ts` | Modify | Eksportér `./laeringspost` |
| `db/migrations/0007_*.sql` | Generate | Auto-genereret af drizzle-kit |
| `lib/merl/laeringspost-types.ts` | Create | Delte typer + label-helpers (rene, testbare) |
| `lib/merl/laeringspost-types.test.ts` | Create | Vitest for label-helpers |
| `db/queries/laeringspost.ts` | Create | DB-queries: opret (+mapping), list, slet, barriere-indbakke |
| `db/queries/beslutningsport.ts` | Create | Query: forældreløse indikatorer |
| `db/queries/selvevaluering.ts` | Modify | Udvid `getDokumentationshenvisninger` med `laeringspost` |
| `app/(app)/laering/actions.ts` | Create | Server Actions: opretLaeringspost, sletLaeringspost |
| `app/(app)/laering/page.tsx` | Create | Server Component: barriere-indbakke + liste + ny-form |
| `app/(app)/laering/_laeringspost-form.tsx` | Create | Client Component: oprettelsesform |
| `app/(app)/data/page.tsx` | Modify | Vis forældreløse-indikator-flag |
| `components/app-sidebar.tsx` | Modify | Tilføj `/laering` i nav |

---

## Task 1: Schema — enums, tabel og migration

**Files:**
- Modify: `db/schema/enums.ts`
- Create: `db/schema/laeringspost.ts`
- Modify: `db/schema/index.ts`

- [ ] **Step 1: Tilføj enums i `db/schema/enums.ts`**

Tilføj nederst i filen (efter `importJobStatusEnum`):

```ts
export const laeringsBeslutningEnum = pgEnum('laerings_beslutning', [
  'viderefoeres', 'justeres', 'udgaar', 'tilfoeres_ressourcer', 'eskaleres',
]);
export const laeringsKnytningEnum = pgEnum('laerings_knytning', [
  'tiltag', 'indsatsomraade', 'maal',
]);
```

- [ ] **Step 2: Opret `db/schema/laeringspost.ts`**

```ts
import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { tovholderRapport } from './tovholder';
import { laeringsBeslutningEnum, laeringsKnytningEnum } from './enums';

export const laeringspost = pgTable('laeringspost', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  // Polymorf kobling — ingen FK, valideres i applikationslaget.
  knyttetTilType: laeringsKnytningEnum('knyttet_til_type').notNull(),
  knyttetTilId: uuid('knyttet_til_id').notNull(),
  observation: text('observation').notNull(),
  fortolkning: text('fortolkning'),
  beslutning: laeringsBeslutningEnum('beslutning').notNull(),
  beslutningstager: text('beslutningstager'),
  dato: date('dato').notNull(),
  // Reference til den rapport der udløste læringen (nullable).
  tovholderRapportId: uuid('tovholder_rapport_id')
    .references(() => tovholderRapport.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 3: Eksportér i `db/schema/index.ts`**

Tilføj efter linjen `export * from './import-job';`:

```ts
export * from './laeringspost';
```

- [ ] **Step 4: Generér migration**

Run: `npx drizzle-kit generate`
Expected: Ny fil `db/migrations/0007_*.sql` oprettes, der `CREATE TYPE "laerings_beslutning"`, `CREATE TYPE "laerings_knytning"` og `CREATE TABLE "laeringspost"`. Ingen `ALTER`/`DROP` på eksisterende tabeller.

- [ ] **Step 5: Inspicér den genererede SQL**

Run: `cat db/migrations/0007_*.sql`
Expected: Kun `CREATE TYPE` og `CREATE TABLE laeringspost` med FK til `kommune` og `tovholder_rapport`. Hvis der er ALTER på andre tabeller — STOP og undersøg (schema-drift).

- [ ] **Step 6: Anvend migration**

Run: `npx drizzle-kit migrate`
Expected: "migrations applied successfully" (eller tilsvarende). Ingen fejl.

- [ ] **Step 7: Commit**

```bash
git add db/schema/enums.ts db/schema/laeringspost.ts db/schema/index.ts db/migrations/
git commit -m "feat: laeringspost-schema (Fase 4 MERL)"
```

---

## Task 2: Delte typer + label-helpers (TDD)

**Files:**
- Create: `lib/merl/laeringspost-types.ts`
- Test: `lib/merl/laeringspost-types.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// lib/merl/laeringspost-types.test.ts
import { describe, it, expect } from 'vitest';
import { beslutningLabel, knytningLabel, BESLUTNINGER } from './laeringspost-types';

describe('beslutningLabel', () => {
  it('oversætter alle beslutninger til dansk', () => {
    expect(beslutningLabel('viderefoeres')).toBe('Videreføres');
    expect(beslutningLabel('justeres')).toBe('Justeres');
    expect(beslutningLabel('udgaar')).toBe('Udgår');
    expect(beslutningLabel('tilfoeres_ressourcer')).toBe('Tilføres ressourcer');
    expect(beslutningLabel('eskaleres')).toBe('Eskaleres');
  });
});

describe('knytningLabel', () => {
  it('oversætter knytningstype til dansk', () => {
    expect(knytningLabel('tiltag')).toBe('Tiltag');
    expect(knytningLabel('indsatsomraade')).toBe('Indsatsområde');
    expect(knytningLabel('maal')).toBe('Mål');
  });
});

describe('BESLUTNINGER', () => {
  it('indeholder alle fem beslutninger i visningsrækkefølge', () => {
    expect(BESLUTNINGER).toEqual([
      'viderefoeres', 'justeres', 'tilfoeres_ressourcer', 'eskaleres', 'udgaar',
    ]);
  });
});
```

- [ ] **Step 2: Kør testen og verificér FAIL**

Run: `npx vitest run lib/merl/laeringspost-types.test.ts 2>&1 | tail -5`
Expected: FAIL — "Cannot find module './laeringspost-types'"

- [ ] **Step 3: Opret `lib/merl/laeringspost-types.ts`**

```ts
// lib/merl/laeringspost-types.ts
// Delte typer og danske labels for læringsposter. Rene funktioner — ingen DB.

export type LaeringsBeslutning =
  | 'viderefoeres' | 'justeres' | 'udgaar' | 'tilfoeres_ressourcer' | 'eskaleres';

export type LaeringsKnytning = 'tiltag' | 'indsatsomraade' | 'maal';

/** Beslutninger i den rækkefølge de skal vises i UI (mest brugte først, "udgår" sidst). */
export const BESLUTNINGER: LaeringsBeslutning[] = [
  'viderefoeres', 'justeres', 'tilfoeres_ressourcer', 'eskaleres', 'udgaar',
];

const BESLUTNING_LABELS: Record<LaeringsBeslutning, string> = {
  viderefoeres: 'Videreføres',
  justeres: 'Justeres',
  udgaar: 'Udgår',
  tilfoeres_ressourcer: 'Tilføres ressourcer',
  eskaleres: 'Eskaleres',
};

const KNYTNING_LABELS: Record<LaeringsKnytning, string> = {
  tiltag: 'Tiltag',
  indsatsomraade: 'Indsatsområde',
  maal: 'Mål',
};

export function beslutningLabel(b: LaeringsBeslutning): string {
  return BESLUTNING_LABELS[b];
}

export function knytningLabel(k: LaeringsKnytning): string {
  return KNYTNING_LABELS[k];
}
```

- [ ] **Step 4: Kør testen og verificér PASS**

Run: `npx vitest run lib/merl/laeringspost-types.test.ts 2>&1 | tail -5`
Expected: `Tests  3 passed (3)`

- [ ] **Step 5: Commit**

```bash
git add lib/merl/laeringspost-types.ts lib/merl/laeringspost-types.test.ts
git commit -m "feat: laeringspost typer og danske labels"
```

---

## Task 3: DB-queries for læringspost

**Files:**
- Create: `db/queries/laeringspost.ts`

Denne fil rummer både oprettelse (med automatisk CCTF-mapping mod kriterie 15), sletning (rydder mapping), listning og barriere-indbakken.

- [ ] **Step 1: Opret `db/queries/laeringspost.ts`**

```ts
// db/queries/laeringspost.ts
import { db } from '@/db';
import {
  laeringspost,
  cctfKriterieMapping,
  tovholderRapport,
  tovholder,
  tiltag,
} from '@/db/schema';
import { eq, and, desc, isNotNull, ne, notInArray } from 'drizzle-orm';
import type { LaeringsBeslutning, LaeringsKnytning } from '@/lib/merl/laeringspost-types';

const KRITERIE_LAERING = 15;

export type NyLaeringspost = {
  kommuneId: string;
  knyttetTilType: LaeringsKnytning;
  knyttetTilId: string;
  observation: string;
  fortolkning: string | null;
  beslutning: LaeringsBeslutning;
  beslutningstager: string | null;
  dato: string; // ISO yyyy-mm-dd
  tovholderRapportId: string | null;
};

/**
 * Opret en læringspost og dens CCTF-mapping mod kriterie 15 i én transaktion.
 * Mapping-rækken gør at posten dukker op i selvevalueringens dokumentationshenvisninger.
 */
export async function createLaeringspost(input: NyLaeringspost): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(laeringspost).values(input).returning({ id: laeringspost.id });
    await tx.insert(cctfKriterieMapping).values({
      entitetType: 'laeringspost',
      entitetId: row.id,
      kriterieNr: KRITERIE_LAERING,
      dokumentationsstyrke: 'primary',
      bemaerkning: input.observation.slice(0, 120),
    });
    return row.id;
  });
}

/** Slet en læringspost og dens CCTF-mapping (polymorf mapping har ingen FK-cascade). */
export async function deleteLaeringspost(id: string, kommuneId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: laeringspost.id })
      .from(laeringspost)
      .where(and(eq(laeringspost.id, id), eq(laeringspost.kommuneId, kommuneId)))
      .limit(1);
    if (!row) return; // ejes ikke af kommunen — no-op
    await tx.delete(cctfKriterieMapping).where(
      and(
        eq(cctfKriterieMapping.entitetType, 'laeringspost'),
        eq(cctfKriterieMapping.entitetId, id),
      ),
    );
    await tx.delete(laeringspost).where(eq(laeringspost.id, id));
  });
}

export type LaeringspostRow = typeof laeringspost.$inferSelect;

/** Alle læringsposter for kommunen, nyeste først. */
export async function getLaeringsposter(kommuneId: string): Promise<LaeringspostRow[]> {
  return db
    .select()
    .from(laeringspost)
    .where(eq(laeringspost.kommuneId, kommuneId))
    .orderBy(desc(laeringspost.dato), desc(laeringspost.createdAt));
}

export type BarriereRapport = {
  rapportId: string;
  tiltagId: string;
  tiltagTitel: string;
  barrierer: string;
  dato: string;
};

/**
 * Barriere-indbakke: tovholder-rapporter med ikke-tom barriere, der endnu IKKE
 * er omsat til en læringspost. Joiner via tovholder for at sikre kommune-ejerskab.
 */
export async function getBarriereInbox(kommuneId: string): Promise<BarriereRapport[]> {
  // Rapport-ID'er der allerede har en læringspost
  const brugte = await db
    .select({ id: laeringspost.tovholderRapportId })
    .from(laeringspost)
    .where(and(eq(laeringspost.kommuneId, kommuneId), isNotNull(laeringspost.tovholderRapportId)));
  const brugteIds = brugte.map((b) => b.id).filter((x): x is string => x !== null);

  const base = db
    .select({
      rapportId: tovholderRapport.id,
      tiltagId: tovholderRapport.tiltagId,
      tiltagTitel: tiltag.titel,
      barrierer: tovholderRapport.barrierer,
      dato: tovholderRapport.dato,
    })
    .from(tovholderRapport)
    .innerJoin(tovholder, eq(tovholderRapport.tovholderId, tovholder.id))
    .innerJoin(tiltag, eq(tovholderRapport.tiltagId, tiltag.id));

  const rows = await (brugteIds.length > 0
    ? base.where(and(
        eq(tovholder.kommuneId, kommuneId),
        isNotNull(tovholderRapport.barrierer),
        ne(tovholderRapport.barrierer, ''),
        notInArray(tovholderRapport.id, brugteIds),
      ))
    : base.where(and(
        eq(tovholder.kommuneId, kommuneId),
        isNotNull(tovholderRapport.barrierer),
        ne(tovholderRapport.barrierer, ''),
      )));

  return rows
    .filter((r): r is typeof r & { barrierer: string } => r.barrierer !== null)
    .map((r) => ({
      rapportId: r.rapportId,
      tiltagId: r.tiltagId,
      tiltagTitel: r.tiltagTitel,
      barrierer: r.barrierer,
      dato: r.dato,
    }));
}
```

- [ ] **Step 2: Typecheck filen**

Run: `npx tsc --noEmit 2>&1 | grep laeringspost || echo "OK ingen typefejl i laeringspost"`
Expected: `OK ingen typefejl i laeringspost`

- [ ] **Step 3: Commit**

```bash
git add db/queries/laeringspost.ts
git commit -m "feat: laeringspost DB-queries (opret+mapping, slet, liste, barriere-indbakke)"
```

---

## Task 4: Udvid selvevalueringens dokumentationshenvisninger

> **⚠ AFHÆNGIGHED:** Denne task kræver at Fase 3-selvevalueringen er merget ind i `main`. Pr. 2026-05-31 ligger `db/queries/selvevaluering.ts` KUN i den uafhængige worktree-branch `worktree-fase3-selvevaluering` og er hverken færdig (kun 2 af 8 tasks committet) eller merget. **Spring denne task over hvis filen ikke findes på main** — Task 3's mapping-række er allerede skrevet, så læringsposter dukker op i selvevalueringen automatisk så snart Fase 3 lander og denne task køres. Resten af planen (Task 1-3, 5-10) er uafhængig af Fase 3.

`getDokumentationshenvisninger` i `db/queries/selvevaluering.ts` håndterer i dag `tiltag`, `maal`, `indsatsomraade`, `indikator`. Læringsposter mappet til kriterie 15 skal også vises.

**Files:**
- Modify: `db/queries/selvevaluering.ts`

- [ ] **Step 1: Tilføj `laeringspost` til imports**

I import-blokken fra `@/db/schema` (linje ~204-212), tilføj `laeringspost`:

```ts
import {
  selvevaluering,
  cctfKriterieMapping,
  tiltag,
  maal,
  indikator,
  indsatsOmraade,
  kommuneIndikator,
  laeringspost,
} from '@/db/schema';
```

- [ ] **Step 2: Tilføj label-gren i `getDokumentationshenvisninger`**

I løkken `for (const m of mappings)`, efter `else if (m.entitetType === 'indikator')`-blokken (lige før `if (label !== null)`), tilføj:

```ts
    } else if (m.entitetType === 'laeringspost') {
      const [row] = await db
        .select({ observation: laeringspost.observation })
        .from(laeringspost)
        .where(and(eq(laeringspost.id, m.entitetId), eq(laeringspost.kommuneId, kommuneId)))
        .limit(1);
      if (row) label = `Læringspost: ${row.observation.slice(0, 60)}`;
    }
```

Bemærk: ændr den eksisterende `}` der lukker den foregående `else if` til `} else if (...) { ... }` så grenen hænger korrekt sammen. Det færdige mønster: `if (tiltag) {...} else if (maal) {...} else if (indsatsomraade) {...} else if (indikator) {...} else if (laeringspost) {...}`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep selvevaluering || echo "OK"`
Expected: `OK`

- [ ] **Step 4: Kør eksisterende selvevaluering-tests (regressionssikring)**

Run: `npx vitest run db/queries/selvevaluering.test.ts 2>&1 | tail -5`
Expected: alle eksisterende tests PASS (de rene helper-tests berøres ikke).

- [ ] **Step 5: Commit**

```bash
git add db/queries/selvevaluering.ts
git commit -m "feat: vis laeringsposter i selvevaluerings dokumentationshenvisninger (kriterie 15)"
```

---

## Task 5: Beslutningsport — forældreløse indikatorer

En aktiv `kommune_indikator` er forældreløs hvis dens `indikator` hverken er knyttet til et `maal` (via `indikator_maal`) eller et **prioriteret** `tiltag` (via `indikator_tiltag` join `tiltag.prioriteret_tiltag = true`).

**Files:**
- Create: `db/queries/beslutningsport.ts`

- [ ] **Step 1: Opret `db/queries/beslutningsport.ts`**

```ts
// db/queries/beslutningsport.ts
import { db } from '@/db';
import { kommuneIndikator, indikator, indikatorTemplate } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type ForaeldreloesIndikator = {
  kommuneIndikatorId: string;
  indikatorId: string;
  titel: string;
};

/**
 * Aktive indikator-instanser der hverken er knyttet til et mål eller et
 * prioriteret tiltag. Disse flages i UI som "forældreløse" (beslutningsport).
 */
export async function getForaeldreloeseIndikatorer(
  kommuneId: string,
): Promise<ForaeldreloesIndikator[]> {
  const rows = await db
    .select({
      kommuneIndikatorId: kommuneIndikator.id,
      indikatorId: kommuneIndikator.indikatorId,
      titel: indikatorTemplate.titel,
    })
    .from(kommuneIndikator)
    .innerJoin(indikator, eq(kommuneIndikator.indikatorId, indikator.id))
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, kommuneId),
      eq(kommuneIndikator.aktiv, true),
      sql`${kommuneIndikator.indikatorId} NOT IN (
        SELECT indikator_id FROM indikator_maal
        UNION
        SELECT it.indikator_id FROM indikator_tiltag it
          JOIN tiltag t ON it.tiltag_id = t.id
          WHERE t.prioriteret_tiltag = true
      )`,
    ));
  return rows;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep beslutningsport || echo "OK"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add db/queries/beslutningsport.ts
git commit -m "feat: beslutningsport-query (forældreløse indikatorer)"
```

---

## Task 6: Server Actions for læringsposter

**Files:**
- Create: `app/(app)/laering/actions.ts`

Følger projektmønstret: `kommuneId` hentes ALTID fra `verifySession()`, aldrig fra klient-params (jf. selvevaluering-spec'ens sikkerhedsregel).

- [ ] **Step 1: Opret `app/(app)/laering/actions.ts`**

```ts
'use server';
import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createLaeringspost, deleteLaeringspost } from '@/db/queries/laeringspost';
import type { LaeringsBeslutning, LaeringsKnytning } from '@/lib/merl/laeringspost-types';
import { BESLUTNINGER } from '@/lib/merl/laeringspost-types';

const KNYTNINGER: LaeringsKnytning[] = ['tiltag', 'indsatsomraade', 'maal'];

export async function opretLaeringspostAction(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const knyttetTilType = formData.get('knyttetTilType') as string;
  const beslutning = formData.get('beslutning') as string;
  const knyttetTilId = (formData.get('knyttetTilId') as string) ?? '';
  const observation = ((formData.get('observation') as string) ?? '').trim();
  const dato = (formData.get('dato') as string) ?? '';

  // Validering — afvis ugyldige enum-værdier og tomme påkrævede felter
  if (!KNYTNINGER.includes(knyttetTilType as LaeringsKnytning)) return;
  if (!BESLUTNINGER.includes(beslutning as LaeringsBeslutning)) return;
  if (!knyttetTilId || !observation || !dato) return;

  const rapportRaw = (formData.get('tovholderRapportId') as string) ?? '';
  const fortolkningRaw = ((formData.get('fortolkning') as string) ?? '').trim();
  const beslutningstagerRaw = ((formData.get('beslutningstager') as string) ?? '').trim();

  await createLaeringspost({
    kommuneId: session.kommuneId,
    knyttetTilType: knyttetTilType as LaeringsKnytning,
    knyttetTilId,
    observation,
    fortolkning: fortolkningRaw || null,
    beslutning: beslutning as LaeringsBeslutning,
    beslutningstager: beslutningstagerRaw || null,
    dato,
    tovholderRapportId: rapportRaw || null,
  });

  revalidatePath('/laering');
}

export async function sletLaeringspostAction(id: string): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');
  await deleteLaeringspost(id, session.kommuneId);
  revalidatePath('/laering');
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "laering/actions" || echo "OK"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/laering/actions.ts
git commit -m "feat: laeringspost server actions (opret, slet)"
```

---

## Task 7: Læringspost-form (Client Component)

**Files:**
- Create: `app/(app)/laering/_laeringspost-form.tsx`

Formularen bruges to steder: tom (fritstående oprettelse) og forudfyldt fra en barriere. Den modtager valgmuligheder (tiltag/mål/indsatsområder) som props og evt. prefill-værdier.

- [ ] **Step 1: Opret `app/(app)/laering/_laeringspost-form.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { opretLaeringspostAction } from './actions';
import { BESLUTNINGER, beslutningLabel, knytningLabel } from '@/lib/merl/laeringspost-types';
import type { LaeringsKnytning } from '@/lib/merl/laeringspost-types';

export type EntitetValg = { id: string; label: string };

type Props = {
  tiltagValg: EntitetValg[];
  maalValg: EntitetValg[];
  indsatsomraadeValg: EntitetValg[];
  prefill?: {
    knyttetTilType: LaeringsKnytning;
    knyttetTilId: string;
    observation: string;
    tovholderRapportId: string;
  };
  onDone?: () => void;
};

export function LaeringspostForm({ tiltagValg, maalValg, indsatsomraadeValg, prefill, onDone }: Props) {
  const [type, setType] = useState<LaeringsKnytning>(prefill?.knyttetTilType ?? 'tiltag');
  const valg = type === 'tiltag' ? tiltagValg : type === 'maal' ? maalValg : indsatsomraadeValg;
  const idag = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={async (fd) => { await opretLaeringspostAction(fd); onDone?.(); }}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      {prefill?.tovholderRapportId && (
        <input type="hidden" name="tovholderRapportId" value={prefill.tovholderRapportId} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Knyttet til</span>
          <select
            name="knyttetTilType"
            value={type}
            onChange={(e) => setType(e.target.value as LaeringsKnytning)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {(['tiltag', 'indsatsomraade', 'maal'] as LaeringsKnytning[]).map((k) => (
              <option key={k} value={k}>{knytningLabel(k)}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Vælg {knytningLabel(type).toLowerCase()}</span>
          <select
            name="knyttetTilId"
            defaultValue={prefill?.knyttetTilId ?? ''}
            required
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="" disabled>— vælg —</option>
            {valg.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">Observation</span>
        <textarea
          name="observation"
          defaultValue={prefill?.observation ?? ''}
          required
          rows={2}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          placeholder="Hvad blev observeret?"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">Fortolkning (valgfri)</span>
        <textarea
          name="fortolkning"
          rows={2}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          placeholder="Hvad betyder det for planen?"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Beslutning</span>
          <select name="beslutning" required defaultValue="" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            <option value="" disabled>— vælg —</option>
            {BESLUTNINGER.map((b) => <option key={b} value={b}>{beslutningLabel(b)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Beslutningstager</span>
          <input name="beslutningstager" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Dato</span>
          <input type="date" name="dato" defaultValue={idag} required className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      </div>

      <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
        Gem læringspost
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/laering/_laeringspost-form.tsx
git commit -m "feat: laeringspost-form Client Component (tom + prefill fra barriere)"
```

---

## Task 8: `/laering`-side (indbakke + liste + ny-form)

**Files:**
- Create: `app/(app)/laering/page.tsx`

Siden samler: (1) barriere-indbakke med "omsæt til læringspost" pr. rapport, (2) en fritstående ny-form, (3) liste over eksisterende læringsposter.

- [ ] **Step 1: Opret `app/(app)/laering/page.tsx`**

```tsx
import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { tiltag, maal, indsatsOmraade } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLaeringsposter, getBarriereInbox } from '@/db/queries/laeringspost';
import { beslutningLabel, knytningLabel } from '@/lib/merl/laeringspost-types';
import type { LaeringsBeslutning, LaeringsKnytning } from '@/lib/merl/laeringspost-types';
import { LaeringspostForm } from './_laeringspost-form';
import { BarriereKort } from './_barriere-kort';
import { SletKnap } from './_slet-knap';

export const metadata = { title: 'Læring — Klimastatus.dk' };

export default async function LaeringPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');
  const kommuneId = session.kommuneId;

  const [laeringsposter, barriereInbox, tiltagRows, maalRows, ioRows] = await Promise.all([
    getLaeringsposter(kommuneId),
    getBarriereInbox(kommuneId),
    db.select({ id: tiltag.id, titel: tiltag.titel }).from(tiltag).where(eq(tiltag.kommuneId, kommuneId)),
    db.select({ id: maal.id, beskrivelse: maal.beskrivelse })
      .from(maal)
      .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
      .where(eq(indsatsOmraade.kommuneId, kommuneId)),
    db.select({ id: indsatsOmraade.id, navn: indsatsOmraade.navn })
      .from(indsatsOmraade).where(eq(indsatsOmraade.kommuneId, kommuneId)),
  ]);

  const tiltagValg = tiltagRows.map((t) => ({ id: t.id, label: t.titel }));
  const maalValg = maalRows.map((m) => ({ id: m.id, label: m.beskrivelse.slice(0, 80) }));
  const indsatsomraadeValg = ioRows.map((io) => ({ id: io.id, label: io.navn }));
  const tiltagTitelById = new Map(tiltagValg.map((t) => [t.id, t.label]));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Læring</h1>
        <p className="text-sm text-gray-500">
          Omsæt observationer fra monitoreringen til dokumenterede beslutninger (CCTF-kriterie 15).
        </p>
      </div>

      {/* Barriere-indbakke */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Barrierer der venter på en beslutning ({barriereInbox.length})
        </h2>
        {barriereInbox.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-400">
            Ingen ubehandlede barrierer fra tovholdere.
          </p>
        ) : (
          <div className="space-y-3">
            {barriereInbox.map((b) => (
              <BarriereKort
                key={b.rapportId}
                barriere={b}
                tiltagValg={tiltagValg}
                maalValg={maalValg}
                indsatsomraadeValg={indsatsomraadeValg}
              />
            ))}
          </div>
        )}
      </section>

      {/* Fritstående oprettelse */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Ny læringspost</h2>
        <LaeringspostForm
          tiltagValg={tiltagValg}
          maalValg={maalValg}
          indsatsomraadeValg={indsatsomraadeValg}
        />
      </section>

      {/* Liste */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Læringsposter ({laeringsposter.length})</h2>
        {laeringsposter.length === 0 ? (
          <p className="text-sm text-gray-500">Ingen læringsposter endnu.</p>
        ) : (
          <div className="divide-y rounded-xl border border-gray-200">
            {laeringsposter.map((lp) => {
              const knytLabel = lp.knyttetTilType === 'tiltag'
                ? (tiltagTitelById.get(lp.knyttetTilId) ?? 'Tiltag')
                : knytningLabel(lp.knyttetTilType as LaeringsKnytning);
              return (
                <div key={lp.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lp.observation}</p>
                      {lp.fortolkning && <p className="mt-0.5 text-xs text-gray-500">{lp.fortolkning}</p>}
                      <p className="mt-1 text-xs text-gray-400">
                        {knytLabel} · {lp.dato}{lp.beslutningstager ? ` · ${lp.beslutningstager}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {beslutningLabel(lp.beslutning as LaeringsBeslutning)}
                      </span>
                      <SletKnap id={lp.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Opret `app/(app)/laering/_slet-knap.tsx`**

```tsx
'use client';
import { sletLaeringspostAction } from './actions';

export function SletKnap({ id }: { id: string }) {
  return (
    <form action={async () => { await sletLaeringspostAction(id); }}>
      <button type="submit" className="text-xs text-gray-400 hover:text-red-600">Slet</button>
    </form>
  );
}
```

- [ ] **Step 3: Opret `app/(app)/laering/_barriere-kort.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { LaeringspostForm, type EntitetValg } from './_laeringspost-form';
import type { BarriereRapport } from '@/db/queries/laeringspost';

type Props = {
  barriere: BarriereRapport;
  tiltagValg: EntitetValg[];
  maalValg: EntitetValg[];
  indsatsomraadeValg: EntitetValg[];
};

export function BarriereKort({ barriere, tiltagValg, maalValg, indsatsomraadeValg }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{barriere.tiltagTitel}</p>
          <p className="mt-0.5 text-sm text-gray-600">{barriere.barrierer}</p>
          <p className="mt-1 text-xs text-gray-400">Rapporteret {barriere.dato}</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {open ? 'Annullér' : 'Omsæt til læringspost'}
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <LaeringspostForm
            tiltagValg={tiltagValg}
            maalValg={maalValg}
            indsatsomraadeValg={indsatsomraadeValg}
            prefill={{
              knyttetTilType: 'tiltag',
              knyttetTilId: barriere.tiltagId,
              observation: barriere.barrierer,
              tovholderRapportId: barriere.rapportId,
            }}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "laering/" || echo "OK"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/laering/
git commit -m "feat: /laering-side med barriere-indbakke, ny-form og liste"
```

---

## Task 9: Beslutningsport-flag på `/data`

**Files:**
- Modify: `app/(app)/data/page.tsx`

- [ ] **Step 1: Tilføj import øverst i `app/(app)/data/page.tsx`**

Efter de eksisterende imports:

```ts
import { getForaeldreloeseIndikatorer } from '@/db/queries/beslutningsport';
```

- [ ] **Step 2: Hent forældreløse i page-funktionen**

Lige efter `const aktiveWithValue = await Promise.all(...)`-blokken (og før `const allTemplates = await getActiveTemplates();`), tilføj:

```ts
  const foraeldreloese = await getForaeldreloeseIndikatorer(session.kommuneId);
```

- [ ] **Step 3: Render et advarselsbanner**

Find returstartens første element (den ydre `<div>` / `return (`). Indsæt banneret som det første barn inde i den ydre wrapper, før resten af indholdet:

```tsx
      {foraeldreloese.length > 0 && (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <strong>{foraeldreloese.length} indikator{foraeldreloese.length === 1 ? '' : 'er'} uden kobling.</strong>{' '}
          Følgende aktive indikatorer er hverken knyttet til et mål eller et prioriteret tiltag og tæller ikke i CCTF-kriterie 15:
          <ul className="mt-1 list-disc pl-5">
            {foraeldreloese.map((f) => <li key={f.kommuneIndikatorId}>{f.titel}</li>)}
          </ul>
        </div>
      )}
```

(Hvis den ydre wrapper er et fragment eller har en bestemt klasse — placér banneret som første barn så det vises øverst.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "data/page" || echo "OK"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/data/page.tsx
git commit -m "feat: flag forældreløse indikatorer på /data (beslutningsport)"
```

---

## Task 10: Navigation + samlet verifikation

**Files:**
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Tilføj `/laering` i `components/app-sidebar.tsx`**

`mainNav`-arrayet (linje ~6-14) bruger `{ href, label }` uden ikoner. Tilføj en post efter `/data`-linjen (matcher MERL-flowet: data → læring):

```ts
  { href: '/data',          label: 'Datastyring' },
  { href: '/laering',       label: 'Læring' },
```

- [ ] **Step 2: Kør HELE testsuiten (regression)**

Run: `npx vitest run 2>&1 | tail -8`
Expected: alle tests PASS (inkl. nye `laeringspost-types`-tests og uændrede selvevaluering-tests).

- [ ] **Step 3: Fuld typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: ingen fejl.

- [ ] **Step 4: Verifikation i preview**

Brug preview-værktøjerne (ikke Bash):
- Start dev-server, log ind som koordinator (`koordinator@oesterby.dk` / `oesterby2026!` jf. Fase 3-plan).
- Naviger til `/laering`. Verificér: barriere-indbakke viser Østerbys tovholder-barrierer (hvis seed har dem), ny-form vises, liste er tom.
- Opret en fritstående læringspost (vælg tiltag, skriv observation, vælg beslutning, gem). Verificér at den dukker op i listen med korrekt dansk beslutnings-badge.
- Klik "Omsæt til læringspost" på en barriere, gem. Verificér at barrieren forsvinder fra indbakken (den har nu en læringspost) og posten er i listen.
- Naviger til `/selvevaluering`, klik "Opdatér dokumentation", fold kriterie 15 ud. Verificér at læringsposten optræder under Dokumentation.
- Naviger til `/data`. Hvis Østerby har en aktiv indikator uden mål/prioriteret-tiltag-kobling, verificér at det gule flag vises.
- Tjek konsol-logs for fejl (preview_console_logs / preview_logs).

- [ ] **Step 5: Afsluttende commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: Fase 4 Prioritet 1 komplet — læringspost + beslutningsport i nav"
```

---

## Self-Review

**1. Spec coverage (datamodel-doc + roadmap Fase 4 Prioritet 1):**
- ✅ `Læringspost`-tabel med observation→fortolkning→beslutning → Task 1
- ✅ Beslutnings-enum (videreføres/justeres/udgår/tilføres_ressourcer/eskaleres) → Task 1+2
- ✅ Kobling til monitoreringscyklus → bevidst UDELADT (Prioritet 2), dokumenteret i header
- ✅ CCTF-mapping mod kriterie 15 → Task 3 (createLaeringspost-transaktion)
- ✅ Vises i selvevaluering → Task 4
- ✅ Oprettelse fra tovholder-rapport → Task 8 (BarriereKort + getBarriereInbox)
- ✅ Fritstående oprettelse → Task 7+8 (LaeringspostForm)
- ✅ Beslutningsport: forældreløse indikatorer flages → Task 5+9
- ✅ Produktbeslutning "kun dokumentation, ikke dækningsgrad" → coverage-engine røres ikke

**2. Placeholder-scan:** Ingen TBD/TODO. Al kode er fuldt udskrevet. Step der ændrer eksisterende filer (Task 4, 9, 10) beskriver præcist hvor — men afhænger af nuværende filindhold; verificér ved redigering.

**3. Type-konsistens:**
- `LaeringsBeslutning` / `LaeringsKnytning` defineret i Task 2, brugt konsistent i Task 3, 6, 7, 8.
- `NyLaeringspost`-feltnavne matcher `createLaeringspost`-input og `opretLaeringspostAction`-FormData-keys (knyttetTilType, knyttetTilId, observation, fortolkning, beslutning, beslutningstager, dato, tovholderRapportId).
- `BarriereRapport` (rapportId, tiltagId, tiltagTitel, barrierer, dato) defineret i Task 3, forbrugt i Task 8.
- `EntitetValg` defineret i Task 7, importeret i Task 8.
- `getForaeldreloeseIndikatorer` returnerer `{ kommuneIndikatorId, indikatorId, titel }` — brugt konsistent i Task 9.

**4. Migration-sikkerhed:** Task 1 step 5 inspicerer den genererede SQL eksplicit for utilsigtet drift før den anvendes — vigtigt da der er 6 eksisterende migrationer og schema kan være out of sync.
