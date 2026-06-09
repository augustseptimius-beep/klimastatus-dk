# MERL plan 1 — Tiltag-arbejdsrummet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gør hver handling til et arbejdsrum: en ny `tiltag/[id]`-detaljeside der samler status, indikatorer, tovholder-rapporter og læring ét sted — med inline oprettelse af læringsposter forudbundet til tiltaget.

**Architecture:** Ren UI-flytning oven på en allerede tiltag-centreret datamodel — ingen schema-ændring. Et nyt batchet query-modul (`getTiltagDetalje`) henter alt for ét tiltag i parallel. Status-chip og "forsinket"-overlay beregnes i et rent, enheds-testbart hjælpemodul. Detaljesiden bliver ny destination ved klik på en tiltag-række (i dag → `/rediger`). Progressive disclosure holder siden let, ikke en datadynge.

**Tech Stack:** Next.js (App Router, server components + server actions), Drizzle ORM (Postgres), Vitest, Tailwind (eksisterende `ks-btn`-klasser).

**Spec:** `docs/superpowers/specs/2026-06-09-merl-i-kontekst-design.md` (flade 2)

**Afgrænsning:** "Indhent status"-knappen og effekt/forældet-data der kommer fra tovholder-forespørgsler leveres i **plan 2**. Denne plan leverer alt der kan bygges på eksisterende data: statushoved (status, effekt-sum, åbne barrierer, sidst-opdateret), indikatorer, rapport-tidslinje og inline læring. `/laering`-slankning er **plan 3**.

---

## Filstruktur

| Fil | Ansvar | Handling |
|-----|--------|----------|
| `lib/merl/tiltag-status.ts` | Ren logik: status-label + afledt "forsinket"-overlay | Opret |
| `lib/merl/tiltag-status.test.ts` | Enhedstest af status-logik | Opret |
| `db/queries/tiltag-detalje.ts` | Batchet `getTiltagDetalje(id)` + del-queries | Opret |
| `db/queries/tiltag-detalje.test.ts` | Test af del-queries | Opret |
| `app/(app)/k/[kommune]/tiltag/[id]/page.tsx` | Arbejdsrummets server-component | Opret |
| `app/(app)/k/[kommune]/tiltag/[id]/_statushoved.tsx` | Statushoved (ét blik) | Opret |
| `app/(app)/k/[kommune]/tiltag/[id]/_sektion.tsx` | Genbrugelig foldbar sektion (client) | Opret |
| `app/(app)/k/[kommune]/tiltag/[id]/_indikator-liste.tsx` | Indikatorer + seneste måling | Opret |
| `app/(app)/k/[kommune]/tiltag/[id]/_rapport-tidslinje.tsx` | Tovholder-rapporter | Opret |
| `app/(app)/k/[kommune]/tiltag/[id]/_laering-sektion.tsx` | Læringsposter + inline form | Opret |
| `app/(app)/k/[kommune]/tiltag/[id]/actions.ts` | `opretLaeringspostForTiltagAction` | Opret |
| `app/(app)/k/[kommune]/tiltag/tiltag-table.tsx` | Række-klik → `/tiltag/[id]` | Modificér (linje 227, 255) |

---

## Task 1: Ren status-logik (label + forsinket-overlay)

**Files:**
- Create: `lib/merl/tiltag-status.ts`
- Test: `lib/merl/tiltag-status.test.ts`

`tiltag.status` er enum'en `planned | in_progress | completed | discontinued`. "Forsinket" er IKKE en enum-værdi — den afledes: tidsramme udløbet og ikke afsluttet/udgået.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/merl/tiltag-status.test.ts
import { describe, it, expect } from 'vitest';
import { tiltagStatusVisning } from './tiltag-status';

describe('tiltagStatusVisning', () => {
  const iDag = '2026-06-09';

  it('mapper enum til dansk label og farve', () => {
    expect(tiltagStatusVisning('planned', null, iDag)).toMatchObject({ label: 'Ikke startet', forsinket: false });
    expect(tiltagStatusVisning('in_progress', null, iDag)).toMatchObject({ label: 'I gang' });
    expect(tiltagStatusVisning('completed', null, iDag)).toMatchObject({ label: 'Gennemført' });
    expect(tiltagStatusVisning('discontinued', null, iDag)).toMatchObject({ label: 'Udgået' });
  });

  it('markerer forsinket når tidsramme er udløbet og status ikke er afsluttet', () => {
    const r = tiltagStatusVisning('in_progress', '2026-01-01', iDag);
    expect(r.forsinket).toBe(true);
  });

  it('markerer IKKE forsinket når gennemført, selv hvis tidsramme udløbet', () => {
    expect(tiltagStatusVisning('completed', '2026-01-01', iDag).forsinket).toBe(false);
    expect(tiltagStatusVisning('discontinued', '2026-01-01', iDag).forsinket).toBe(false);
  });

  it('markerer IKKE forsinket når tidsramme er i fremtiden eller mangler', () => {
    expect(tiltagStatusVisning('in_progress', '2026-12-01', iDag).forsinket).toBe(false);
    expect(tiltagStatusVisning('in_progress', null, iDag).forsinket).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/merl/tiltag-status.test.ts`
Expected: FAIL — "tiltagStatusVisning is not a function" / module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/merl/tiltag-status.ts
export type TiltagStatus = 'planned' | 'in_progress' | 'completed' | 'discontinued';

export type StatusVisning = {
  label: string;
  /** Tailwind-klasser til chip-baggrund + tekst. */
  farve: string;
  /** Afledt overlay — tidsramme udløbet og ikke afsluttet. */
  forsinket: boolean;
};

const LABELS: Record<TiltagStatus, string> = {
  planned: 'Ikke startet',
  in_progress: 'I gang',
  completed: 'Gennemført',
  discontinued: 'Udgået',
};

const FARVER: Record<TiltagStatus, string> = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  discontinued: 'bg-gray-200 text-gray-500',
};

/**
 * Afgør chip-visning for et tiltags implementeringsstatus.
 * @param tidsrammeSlut ISO yyyy-mm-dd eller null
 * @param iDag ISO yyyy-mm-dd (injiceres for testbarhed)
 */
export function tiltagStatusVisning(
  status: TiltagStatus,
  tidsrammeSlut: string | null,
  iDag: string,
): StatusVisning {
  const afsluttet = status === 'completed' || status === 'discontinued';
  const forsinket = !afsluttet && tidsrammeSlut !== null && tidsrammeSlut < iDag;
  return { label: LABELS[status], farve: FARVER[status], forsinket };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/merl/tiltag-status.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/merl/tiltag-status.ts lib/merl/tiltag-status.test.ts
git commit -m "feat: ren status-visningslogik m. afledt forsinket-overlay"
```

---

## Task 2: Del-query — indikatorer for et tiltag med seneste måling

**Files:**
- Create: `db/queries/tiltag-detalje.ts`
- Test: `db/queries/tiltag-detalje.test.ts`

Henter de indikatorer der er koblet til tiltaget (`indikatorTiltag`), med deres seneste måling (`indikatorMaaling`, nyeste `dato`/`aar`).

- [ ] **Step 1: Write the failing test**

```typescript
// db/queries/tiltag-detalje.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbSelect = vi.fn();
vi.mock('@/db', () => ({ db: { select: (...a: unknown[]) => dbSelect(...a) } }));
vi.mock('@/db/schema', () => ({
  indikator: {}, indikatorTiltag: {}, indikatorMaaling: {},
  tovholderRapport: {}, tovholder: {}, laeringspost: {}, tiltag: {},
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(), inArray: vi.fn(),
}));

import { getIndikatorerForTiltag } from './tiltag-detalje';

beforeEach(() => vi.clearAllMocks());

function mockChain(rows: unknown[]) {
  // efterligner db.select().from().innerJoin().where().orderBy()
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // gør kæden await-bar
  (chain as { then: unknown }).then = (res: (v: unknown) => void) => res(rows);
  return chain;
}

describe('getIndikatorerForTiltag', () => {
  it('returnerer indikatorer med seneste måling-værdi', async () => {
    dbSelect
      .mockReturnValueOnce(mockChain([{ id: 'i1', niveau: 'output', beskrivelse: 'X', enhed: 'stk' }]))
      .mockReturnValueOnce(mockChain([{ indikatorId: 'i1', vaerdi: 42, dato: '2026-05-01', aar: 2026 }]));

    const result = await getIndikatorerForTiltag('t1');

    expect(result).toEqual([
      { id: 'i1', niveau: 'output', beskrivelse: 'X', enhed: 'stk', senesteVaerdi: 42, senesteDato: '2026-05-01', senesteAar: 2026 },
    ]);
  });

  it('returnerer tom liste når tiltaget ingen indikatorer har', async () => {
    dbSelect.mockReturnValueOnce(mockChain([]));
    const result = await getIndikatorerForTiltag('t1');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run db/queries/tiltag-detalje.test.ts`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// db/queries/tiltag-detalje.ts
import { db } from '@/db';
import { indikator, indikatorTiltag, indikatorMaaling } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export type IndikatorMedMaaling = {
  id: string;
  niveau: 'output' | 'outcome' | 'impact';
  beskrivelse: string;
  enhed: string | null;
  senesteVaerdi: number | null;
  senesteDato: string | null;
  senesteAar: number | null;
};

/** Indikatorer koblet til tiltaget, hver med sin seneste måling (hvis nogen). */
export async function getIndikatorerForTiltag(tiltagId: string): Promise<IndikatorMedMaaling[]> {
  const inds = await db
    .select({
      id: indikator.id,
      niveau: indikator.niveau,
      beskrivelse: indikator.beskrivelse,
      enhed: indikator.enhed,
    })
    .from(indikator)
    .innerJoin(indikatorTiltag, eq(indikatorTiltag.indikatorId, indikator.id))
    .where(eq(indikatorTiltag.tiltagId, tiltagId));

  if (inds.length === 0) return [];

  const ids = inds.map((i) => i.id);
  const maalinger = await db
    .select({
      indikatorId: indikatorMaaling.indikatorId,
      vaerdi: indikatorMaaling.vaerdi,
      dato: indikatorMaaling.dato,
      aar: indikatorMaaling.aar,
    })
    .from(indikatorMaaling)
    .where(inArray(indikatorMaaling.indikatorId, ids))
    .orderBy(desc(indikatorMaaling.aar), desc(indikatorMaaling.dato));

  const senesteFor = new Map<string, { vaerdi: number; dato: string | null; aar: number | null }>();
  for (const m of maalinger) {
    if (!senesteFor.has(m.indikatorId)) {
      senesteFor.set(m.indikatorId, { vaerdi: m.vaerdi, dato: m.dato, aar: m.aar });
    }
  }

  return inds.map((i) => {
    const s = senesteFor.get(i.id);
    return {
      id: i.id,
      niveau: i.niveau as IndikatorMedMaaling['niveau'],
      beskrivelse: i.beskrivelse,
      enhed: i.enhed,
      senesteVaerdi: s?.vaerdi ?? null,
      senesteDato: s?.dato ?? null,
      senesteAar: s?.aar ?? null,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run db/queries/tiltag-detalje.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add db/queries/tiltag-detalje.ts db/queries/tiltag-detalje.test.ts
git commit -m "feat: query — indikatorer for tiltag med seneste måling"
```

---

## Task 3: Del-queries — rapporter og læring for et tiltag

**Files:**
- Modify: `db/queries/tiltag-detalje.ts`
- Test: `db/queries/tiltag-detalje.test.ts` (tilføj describe-blokke)

- [ ] **Step 1: Write the failing tests**

Tilføj i `db/queries/tiltag-detalje.test.ts` (importér også de nye funktioner i toppen: `import { getIndikatorerForTiltag, getRapporterForTiltag, getLaeringsposterForTiltag } from './tiltag-detalje';`):

```typescript
describe('getRapporterForTiltag', () => {
  it('returnerer rapporter nyeste først', async () => {
    dbSelect.mockReturnValueOnce(mockChain([
      { id: 'r1', dato: '2026-05-01', statusImplementering: 'i gang', barrierer: 'penge', naesteSkrid: 'søg pulje', effektRealiseret: '2 ton', tovholderNavn: 'Ida' },
    ]));
    const result = await getRapporterForTiltag('t1');
    expect(result[0]).toMatchObject({ id: 'r1', tovholderNavn: 'Ida', barrierer: 'penge' });
  });
});

describe('getLaeringsposterForTiltag', () => {
  it('henter kun poster knyttet til dette tiltag', async () => {
    dbSelect.mockReturnValueOnce(mockChain([
      { id: 'l1', observation: 'obs', fortolkning: null, beslutning: 'justeres', beslutningstager: null, dato: '2026-05-02' },
    ]));
    const result = await getLaeringsposterForTiltag('k1', 't1');
    expect(result[0]).toMatchObject({ id: 'l1', beslutning: 'justeres' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run db/queries/tiltag-detalje.test.ts`
Expected: FAIL — `getRapporterForTiltag`/`getLaeringsposterForTiltag` not exported.

- [ ] **Step 3: Implement**

Tilføj til `db/queries/tiltag-detalje.ts` (udvid importerne øverst):

```typescript
// tilføj til imports:
import { indikator, indikatorTiltag, indikatorMaaling, tovholderRapport, tovholder, laeringspost } from '@/db/schema';
// (eq, and, desc, inArray er allerede importeret)

export type RapportForTiltag = {
  id: string;
  dato: string;
  statusImplementering: string | null;
  barrierer: string | null;
  naesteSkrid: string | null;
  effektRealiseret: string | null;
  tovholderNavn: string;
};

/** Tovholder-rapporter for tiltaget, nyeste først, med tovholderens navn. */
export async function getRapporterForTiltag(tiltagId: string): Promise<RapportForTiltag[]> {
  return db
    .select({
      id: tovholderRapport.id,
      dato: tovholderRapport.dato,
      statusImplementering: tovholderRapport.statusImplementering,
      barrierer: tovholderRapport.barrierer,
      naesteSkrid: tovholderRapport.naesteSkrid,
      effektRealiseret: tovholderRapport.effektRealiseret,
      tovholderNavn: tovholder.navn,
    })
    .from(tovholderRapport)
    .innerJoin(tovholder, eq(tovholderRapport.tovholderId, tovholder.id))
    .where(eq(tovholderRapport.tiltagId, tiltagId))
    .orderBy(desc(tovholderRapport.dato));
}

export type LaeringForTiltag = {
  id: string;
  observation: string;
  fortolkning: string | null;
  beslutning: string;
  beslutningstager: string | null;
  dato: string;
};

/** Læringsposter knyttet specifikt til dette tiltag (polymorf type='tiltag'). */
export async function getLaeringsposterForTiltag(kommuneId: string, tiltagId: string): Promise<LaeringForTiltag[]> {
  return db
    .select({
      id: laeringspost.id,
      observation: laeringspost.observation,
      fortolkning: laeringspost.fortolkning,
      beslutning: laeringspost.beslutning,
      beslutningstager: laeringspost.beslutningstager,
      dato: laeringspost.dato,
    })
    .from(laeringspost)
    .where(and(
      eq(laeringspost.kommuneId, kommuneId),
      eq(laeringspost.knyttetTilType, 'tiltag'),
      eq(laeringspost.knyttetTilId, tiltagId),
    ))
    .orderBy(desc(laeringspost.dato), desc(laeringspost.createdAt));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run db/queries/tiltag-detalje.test.ts`
Expected: PASS (4 tests total).

- [ ] **Step 5: Commit**

```bash
git add db/queries/tiltag-detalje.ts db/queries/tiltag-detalje.test.ts
git commit -m "feat: queries — tovholder-rapporter og læring for tiltag"
```

---

## Task 4: Inline "ny læringspost"-action (forudbundet til tiltag)

**Files:**
- Create: `app/(app)/k/[kommune]/tiltag/[id]/actions.ts`

Genbruger `createLaeringspost` fra `db/queries/laeringspost.ts`. Bundet til tiltaget — ingen `knyttetTilType`/`knyttetTilId` fra formularen.

- [ ] **Step 1: Implementér action**

```typescript
// app/(app)/k/[kommune]/tiltag/[id]/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { revalidatePath } from 'next/cache';
import { createLaeringspost } from '@/db/queries/laeringspost';
import { getTiltagById } from '@/db/queries/tiltag';
import { BESLUTNINGER } from '@/lib/merl/laeringspost-types';
import type { LaeringsBeslutning } from '@/lib/merl/laeringspost-types';

export async function opretLaeringspostForTiltagAction(
  slug: string,
  tiltagId: string,
  formData: FormData,
): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  // Sikr at tiltaget tilhører kommunen — ellers no-op.
  const t = await getTiltagById(tiltagId);
  if (!t || t.kommuneId !== kommune.id) return;

  const beslutning = formData.get('beslutning') as string;
  const observation = ((formData.get('observation') as string) ?? '').trim();
  const dato = (formData.get('dato') as string) ?? '';
  if (!BESLUTNINGER.includes(beslutning as LaeringsBeslutning)) return;
  if (!observation || !dato) return;

  const fortolkning = ((formData.get('fortolkning') as string) ?? '').trim();
  const beslutningstager = ((formData.get('beslutningstager') as string) ?? '').trim();

  await createLaeringspost({
    kommuneId: kommune.id,
    knyttetTilType: 'tiltag',
    knyttetTilId: tiltagId,
    observation,
    fortolkning: fortolkning || null,
    beslutning: beslutning as LaeringsBeslutning,
    beslutningstager: beslutningstager || null,
    dato,
    tovholderRapportId: null,
  });

  revalidatePath(`/k/${slug}/tiltag/${tiltagId}`);
}
```

- [ ] **Step 2: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl relateret til denne fil.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/[id]/actions.ts"
git commit -m "feat: inline læringspost-action forudbundet til tiltag"
```

---

## Task 5: Foldbar sektion-komponent (client)

**Files:**
- Create: `app/(app)/k/[kommune]/tiltag/[id]/_sektion.tsx`

Genbrugelig progressive-disclosure-sektion. Viser titel + et kort resumé (badge) når foldet sammen; folder ud ved klik.

- [ ] **Step 1: Implementér**

```tsx
// app/(app)/k/[kommune]/tiltag/[id]/_sektion.tsx
'use client';
import { useState, type ReactNode } from 'react';

type Props = {
  titel: string;
  /** Kort resumé vist i højre side af headeren, fx "3 indikatorer". */
  resume?: string;
  /** Foldet ud fra start. */
  aabenFraStart?: boolean;
  children: ReactNode;
};

export function Sektion({ titel, resume, aabenFraStart = false, children }: Props) {
  const [aaben, setAaben] = useState(aabenFraStart);
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setAaben((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={aaben}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className={`transition-transform ${aaben ? 'rotate-90' : ''}`}>›</span>
          {titel}
        </span>
        {resume && <span className="text-xs text-gray-500">{resume}</span>}
      </button>
      {aaben && <div className="border-t border-gray-100 px-4 py-3">{children}</div>}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/[id]/_sektion.tsx"
git commit -m "feat: genbrugelig foldbar sektion-komponent"
```

---

## Task 6: Indikator-liste-komponent

**Files:**
- Create: `app/(app)/k/[kommune]/tiltag/[id]/_indikator-liste.tsx`

Viser indikatorer grupperet på niveau (output/outcome/impact) med seneste måling.

- [ ] **Step 1: Implementér**

```tsx
// app/(app)/k/[kommune]/tiltag/[id]/_indikator-liste.tsx
import type { IndikatorMedMaaling } from '@/db/queries/tiltag-detalje';

const NIVEAU_LABEL: Record<string, string> = {
  output: 'Output', outcome: 'Outcome', impact: 'Impact',
};

export function IndikatorListe({ indikatorer }: { indikatorer: IndikatorMedMaaling[] }) {
  if (indikatorer.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
        Ingen indikatorer endnu — tilføj den første under Indikatorer.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {indikatorer.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-4 py-2">
          <div>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              {NIVEAU_LABEL[i.niveau] ?? i.niveau}
            </span>
            <p className="mt-0.5 text-sm text-gray-900">{i.beskrivelse}</p>
          </div>
          <div className="shrink-0 text-right">
            {i.senesteVaerdi != null ? (
              <>
                <p className="text-sm font-semibold text-gray-900">
                  {i.senesteVaerdi}{i.enhed ? ` ${i.enhed}` : ''}
                </p>
                <p className="text-xs text-gray-400">
                  {i.senesteDato ?? (i.senesteAar != null ? String(i.senesteAar) : '')}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400">Ingen måling</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/[id]/_indikator-liste.tsx"
git commit -m "feat: indikator-liste m. niveau og seneste måling"
```

---

## Task 7: Rapport-tidslinje-komponent

**Files:**
- Create: `app/(app)/k/[kommune]/tiltag/[id]/_rapport-tidslinje.tsx`

- [ ] **Step 1: Implementér**

```tsx
// app/(app)/k/[kommune]/tiltag/[id]/_rapport-tidslinje.tsx
import type { RapportForTiltag } from '@/db/queries/tiltag-detalje';

export function RapportTidslinje({ rapporter }: { rapporter: RapportForTiltag[] }) {
  if (rapporter.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
        Ingen tovholder-rapporter endnu.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {rapporter.map((r, idx) => (
        <li key={r.id} className="rounded-lg border border-gray-100 px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-700">{r.tovholderNavn} · {r.dato}</p>
            {idx === 0 && <span className="text-[10px] font-medium text-green-700">Seneste</span>}
          </div>
          {r.statusImplementering && <p className="mt-1 text-sm text-gray-900">{r.statusImplementering}</p>}
          {r.barrierer && <p className="mt-1 text-xs text-red-700">Barriere: {r.barrierer}</p>}
          {r.naesteSkrid && <p className="mt-1 text-xs text-gray-500">Næste skridt: {r.naesteSkrid}</p>}
          {r.effektRealiseret && <p className="mt-1 text-xs text-gray-500">Realiseret effekt: {r.effektRealiseret}</p>}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/[id]/_rapport-tidslinje.tsx"
git commit -m "feat: rapport-tidslinje for tiltag"
```

---

## Task 8: Læring-sektion med inline form

**Files:**
- Create: `app/(app)/k/[kommune]/tiltag/[id]/_laering-sektion.tsx`

Liste over læringsposter + en inline form bundet til tiltaget. Genbruger `beslutningLabel`/`BESLUTNINGER`.

- [ ] **Step 1: Implementér**

```tsx
// app/(app)/k/[kommune]/tiltag/[id]/_laering-sektion.tsx
'use client';
import { useState } from 'react';
import { BESLUTNINGER, beslutningLabel } from '@/lib/merl/laeringspost-types';
import type { LaeringForTiltag } from '@/db/queries/tiltag-detalje';
import type { LaeringsBeslutning } from '@/lib/merl/laeringspost-types';

type Props = {
  poster: LaeringForTiltag[];
  iDag: string;
  action: (formData: FormData) => void;
};

export function LaeringSektion({ poster, iDag, action }: Props) {
  const [viserForm, setViserForm] = useState(false);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">{poster.length} læringsposter</span>
        <button
          type="button"
          onClick={() => setViserForm((v) => !v)}
          className="ks-btn ks-btn-secondary"
          style={{ padding: '5px 10px', fontSize: 12 }}
        >
          {viserForm ? 'Annullér' : '+ Ny læringspost'}
        </button>
      </div>

      {viserForm && (
        <form action={action} className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Observation</label>
            <textarea name="observation" required rows={2} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Hvad blev observeret?" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Fortolkning (valgfri)</label>
            <textarea name="fortolkning" rows={2} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Hvad betyder det?" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">Beslutning</label>
              <select name="beslutning" required className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
                {BESLUTNINGER.map((b) => (
                  <option key={b} value={b}>{beslutningLabel(b as LaeringsBeslutning)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">Beslutningstager (valgfri)</label>
              <input name="beslutningstager" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
          </div>
          <input type="hidden" name="dato" value={iDag} />
          <button type="submit" className="ks-btn ks-btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            Gem læringspost
          </button>
        </form>
      )}

      {poster.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen læring registreret på dette tiltag endnu.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {poster.map((lp) => (
            <li key={lp.id} className="py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-900">{lp.observation}</p>
                  {lp.fortolkning && <p className="mt-0.5 text-xs text-gray-500">{lp.fortolkning}</p>}
                  <p className="mt-1 text-xs text-gray-400">{lp.dato}{lp.beslutningstager ? ` · ${lp.beslutningstager}` : ''}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {beslutningLabel(lp.beslutning as LaeringsBeslutning)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/[id]/_laering-sektion.tsx"
git commit -m "feat: læring-sektion m. inline form bundet til tiltag"
```

---

## Task 9: Statushoved-komponent

**Files:**
- Create: `app/(app)/k/[kommune]/tiltag/[id]/_statushoved.tsx`

Ét-bliks-resumé. "Indhent status"-knap + effekt-vs-forventet og forældet-flag fra forespørgsler kommer i plan 2 — her vises status-chip, effekt-sum, åbne barrierer og sidst-opdateret.

- [ ] **Step 1: Implementér**

```tsx
// app/(app)/k/[kommune]/tiltag/[id]/_statushoved.tsx
import { tiltagStatusVisning, type TiltagStatus } from '@/lib/merl/tiltag-status';

type Props = {
  titel: string;
  indsatsomraadeNavn: string | null;
  status: TiltagStatus;
  tidsrammeSlut: string | null;
  iDag: string;
  effektSum: number;
  aabneBarrierer: number;
  sidstOpdateret: string | null;
};

export function Statushoved(p: Props) {
  const s = tiltagStatusVisning(p.status, p.tidsrammeSlut, p.iDag);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {p.indsatsomraadeNavn && (
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{p.indsatsomraadeNavn}</span>
      )}
      <h1 className="mt-1 text-xl font-bold text-gray-900">{p.titel}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.farve}`}>{s.label}</span>
        {s.forsinket && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">Forsinket</span>
        )}
        <span className="text-sm text-gray-700">
          <strong>{p.effektSum.toLocaleString('da-DK')}</strong> ton CO₂ forventet
        </span>
        <span className={`text-sm ${p.aabneBarrierer > 0 ? 'font-medium text-red-700' : 'text-gray-500'}`}>
          {p.aabneBarrierer} åbne barrierer
        </span>
        <span className="text-sm text-gray-400">
          {p.sidstOpdateret ? `Sidst opdateret ${p.sidstOpdateret}` : 'Ingen status endnu'}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/[id]/_statushoved.tsx"
git commit -m "feat: statushoved-komponent for tiltag-arbejdsrum"
```

---

## Task 10: Batchet `getTiltagDetalje` + samlet detaljeside

**Files:**
- Modify: `db/queries/tiltag-detalje.ts` (tilføj samlefunktion)
- Create: `app/(app)/k/[kommune]/tiltag/[id]/page.tsx`

- [ ] **Step 1: Tilføj samlefunktion**

Tilføj nederst i `db/queries/tiltag-detalje.ts` (udvid imports med `tiltag`, `indsatsOmraade`, `getCo2SumForTiltag`):

```typescript
// tilføj til imports:
import { tiltag } from '@/db/schema';
import { indsatsOmraade } from '@/db/schema';
import { getCo2SumForTiltag } from './tiltag';

export type TiltagDetalje = {
  tiltag: typeof tiltag.$inferSelect;
  indsatsomraadeNavn: string | null;
  indikatorer: IndikatorMedMaaling[];
  rapporter: RapportForTiltag[];
  laering: LaeringForTiltag[];
  effektSum: number;
};

/** Alt om ét tiltag, batchet i parallel. Returnerer null hvis ikke fundet. */
export async function getTiltagDetalje(kommuneId: string, tiltagId: string): Promise<TiltagDetalje | null> {
  const [rows, indikatorer, rapporter, laering, co2Map] = await Promise.all([
    db.select({ t: tiltag, ioNavn: indsatsOmraade.navn })
      .from(tiltag)
      .leftJoin(indsatsOmraade, eq(tiltag.indsatsOmraadeId, indsatsOmraade.id))
      .where(eq(tiltag.id, tiltagId))
      .limit(1),
    getIndikatorerForTiltag(tiltagId),
    getRapporterForTiltag(tiltagId),
    getLaeringsposterForTiltag(kommuneId, tiltagId),
    getCo2SumForTiltag([tiltagId]),
  ]);

  const row = rows[0];
  if (!row || row.t.kommuneId !== kommuneId) return null;

  return {
    tiltag: row.t,
    indsatsomraadeNavn: row.ioNavn,
    indikatorer,
    rapporter,
    laering,
    effektSum: co2Map.get(tiltagId) ?? 0,
  };
}
```

- [ ] **Step 2: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl. (Bemærk: `getCo2SumForTiltag` findes i `db/queries/tiltag.ts:127`.)

- [ ] **Step 3: Opret detaljesiden**

```tsx
// app/(app)/k/[kommune]/tiltag/[id]/page.tsx
import { requireKommuneContext } from '@/lib/kommune-context';
import { getTiltagDetalje } from '@/db/queries/tiltag-detalje';
import { getBarriereInbox } from '@/db/queries/laeringspost';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Statushoved } from './_statushoved';
import { Sektion } from './_sektion';
import { IndikatorListe } from './_indikator-liste';
import { RapportTidslinje } from './_rapport-tidslinje';
import { LaeringSektion } from './_laering-sektion';
import { opretLaeringspostForTiltagAction } from './actions';
import type { TiltagStatus } from '@/lib/merl/tiltag-status';

export const metadata = { title: 'Tiltag — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string; id: string }> };

export default async function TiltagDetaljePage({ params }: Props) {
  const { kommune: slug, id } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [detalje, barriereInbox] = await Promise.all([
    getTiltagDetalje(kommune.id, id),
    getBarriereInbox(kommune.id),
  ]);
  if (!detalje) redirect(`/k/${slug}/tiltag`);

  const iDag = new Date().toISOString().slice(0, 10);
  const aabneBarrierer = barriereInbox.filter((b) => b.tiltagId === id).length;
  const sidstOpdateret = detalje.rapporter[0]?.dato ?? null;
  const boundOpret = opretLaeringspostForTiltagAction.bind(null, slug, id);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/k/${slug}/tiltag`} className="text-sm text-gray-500 hover:text-gray-900">← Alle tiltag</Link>
        <Link href={`/k/${slug}/tiltag/${id}/rediger`} className="ks-btn ks-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}>
          Rediger stamdata
        </Link>
      </div>

      <Statushoved
        titel={detalje.tiltag.titel}
        indsatsomraadeNavn={detalje.indsatsomraadeNavn}
        status={detalje.tiltag.status as TiltagStatus}
        tidsrammeSlut={detalje.tiltag.tidsrammeSlut}
        iDag={iDag}
        effektSum={detalje.effektSum}
        aabneBarrierer={aabneBarrierer}
        sidstOpdateret={sidstOpdateret}
      />

      <Sektion titel="Indikatorer & målinger" resume={`${detalje.indikatorer.length} indikatorer`} aabenFraStart>
        <IndikatorListe indikatorer={detalje.indikatorer} />
      </Sektion>

      <Sektion titel="Tovholder-rapporter" resume={`${detalje.rapporter.length} rapporter`}>
        <RapportTidslinje rapporter={detalje.rapporter} />
      </Sektion>

      <Sektion titel="Læring" resume={`${detalje.laering.length} poster`}>
        <LaeringSektion poster={detalje.laering} iDag={iDag} action={boundOpret} />
      </Sektion>
    </div>
  );
}
```

- [ ] **Step 4: Verificér build/typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 5: Commit**

```bash
git add "db/queries/tiltag-detalje.ts" "app/(app)/k/[kommune]/tiltag/[id]/page.tsx"
git commit -m "feat: batchet getTiltagDetalje + tiltag-arbejdsrum-side"
```

---

## Task 11: Tiltag-rækker linker til arbejdsrummet

**Files:**
- Modify: `app/(app)/k/[kommune]/tiltag/tiltag-table.tsx` (linje 227 og 255)

- [ ] **Step 1: Ret række-klik (linje 227)**

Find:
```tsx
                onClick={() => router.push(`/k/${slug}/tiltag/${t.id}/rediger`)}
```
Erstat med:
```tsx
                onClick={() => router.push(`/k/${slug}/tiltag/${t.id}`)}
```

- [ ] **Step 2: Ret handlingsknappen (linje ~255)**

Find:
```tsx
                  <Link href={`/k/${slug}/tiltag/${t.id}/rediger`} className="ks-btn ks-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}>
```
Erstat `href` med arbejdsrummet og opdater label-teksten i linket fra fx "Rediger" til "Åbn":
```tsx
                  <Link href={`/k/${slug}/tiltag/${t.id}`} className="ks-btn ks-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}>
```
(Hvis knappens tekst er "Rediger", ændr den til "Åbn".)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/tiltag-table.tsx"
git commit -m "feat: tiltag-række åbner arbejdsrum i stedet for redigering"
```

---

## Task 12: Verifikation i preview

**Files:** (ingen — manuel/preview-verifikation)

- [ ] **Step 1: Kør hele testsuiten**

Run: `npx vitest run`
Expected: alle tests grønne (inkl. de nye i task 1–3).

- [ ] **Step 2: Typecheck hele projektet**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Verificér i preview**

Start dev-server (preview_start "Next.js dev"), log ind, åbn `/k/thisted/tiltag`, klik en række. Bekræft:
- Arbejdsrummet åbner (ikke redigeringsformularen).
- Statushoved viser status-chip, evt. "Forsinket", effekt-sum, åbne barrierer, sidst-opdateret.
- Sektionerne folder ud/sammen; kun "Indikatorer" er åben fra start.
- "+ Ny læringspost" → udfyld → gem → posten vises, og barriere-tæller/effekt er uændret.
- "Rediger stamdata" fører til den eksisterende `/rediger`-form.

- [ ] **Step 4: Commit (kun hvis preview afslørede rettelser)**

```bash
git add -A
git commit -m "fix: justeringer efter preview-verifikation af tiltag-arbejdsrum"
```

---

## Self-review (udført ved skrivning)

**Spec-dækning (flade 2):** statushoved (status-chip fra `tiltag.status` + forsinket-overlay ✓, effekt-sum ✓, åbne barrierer ✓, sidst-opdateret ✓), progressive-disclosure-sektioner ✓ (indikatorer/rapporter/læring), inline læringspost uden dropdown ✓ (Task 4+8), `getTiltagDetalje` batchet ✓ (Task 10), status-logik i testbart hjælpemodul ✓ (Task 1), række-klik → arbejdsrum ✓ (Task 11). **Bevidst udskudt til plan 2:** "Indhent status"-knap, effekt-realiseret-narrativ fra forespørgsel, forældet-flag. **Bevidst udskudt til plan 3:** `/laering`-slankning.

**Placeholders:** ingen — al kode er konkret.

**Type-konsistens:** `IndikatorMedMaaling`, `RapportForTiltag`, `LaeringForTiltag`, `TiltagDetalje` defineret i Task 2/3/10 og forbrugt med samme navne i komponenterne (Task 6/7/8) og siden (Task 10). `tiltagStatusVisning`/`TiltagStatus` defineret i Task 1, brugt i Task 9/10. `opretLaeringspostForTiltagAction(slug, tiltagId, formData)` defineret i Task 4, bundet i Task 10.
