# MERL 2 — Tovholder-forespørgsler med konfigurerbar kadence — Implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gør tovholder-indsamling fokuseret og sporbar: koordinatoren kan fra et tiltag-arbejdsrum sende én konkret statusforespørgsel til tiltagets tovholder(e), tovholderen besvarer én forespørgsel ad gangen via magic-link, og status (sendt/besvaret/forfalden) vises i arbejdsrummet. Kadencen for indsamling kan vælges i indstillinger.

**Architecture:** Ny `forespoergsel`-tabel scoper en anmodning til (tovholder, tiltag). En forespørgsel oprettes enten manuelt fra arbejdsrummet ("Indhent status") eller af den eksisterende runde-afsendelse. Tovholderens svar opretter en `tovholderRapport` med `forespoergsel_id` sat og markerer forespørgslen `besvaret` — svaret lander dermed automatisk i tiltag-arbejdsrummet og i barriere-indbakken (uændret `getBarriereInbox`). "Forfalden" beregnes afledt ved læsning (pg-boss er no-op), præcis som "forsinket"-overlayet i MERL 1. Kadencen gemmes på `kommune` og bruges som standard; reel auto-afsendelse via scheduler er bevidst udskudt (se "Udskudt").

**Tech Stack:** Next.js App Router (server components + server actions), Drizzle ORM (Postgres), Vitest, Tailwind, Brevo (transaktionel mail).

---

## Filstruktur

**Nye filer:**
- `db/schema/forespoergsel.ts` — `forespoergsel`-tabel
- `lib/merl/forespoergsel-status.ts` — rene hjælpefunktioner (forfalden, nylig-anmodet, kadence-labels, periodenøgle)
- `lib/merl/forespoergsel-status.test.ts` — enhedstests for ovenstående
- `db/queries/forespoergsel.ts` — queries: opret, hent åbne pr. tovholder, hent pr. tiltag, hent én, markér besvaret, tovholdere for tiltag
- `db/queries/forespoergsel.test.ts` — tests for de læse-formende queries
- `app/(app)/k/[kommune]/tiltag/[id]/_indhent-status.tsx` — klient-komponent: "Indhent status"-knap + valgfrit spørgsmål
- `app/rapport/_forespoergsel-form.tsx` — tovholderens nye "besvar én forespørgsel"-form
- `app/(app)/k/[kommune]/indstillinger/_kadence-form.tsx` — klient-form til kadence-valg
- `app/(app)/k/[kommune]/indstillinger/kadence-actions.ts` — server action til at gemme kadence

**Ændrede filer:**
- `db/schema/enums.ts` — to nye enums
- `db/schema/tovholder.ts` — `forespoergselId`-kolonne på `tovholderRapport`
- `db/schema/kommune.ts` — `indhentningsKadence`-kolonne
- `db/schema/index.ts` — eksportér `forespoergsel`
- `db/queries/index.ts` — eksportér forespørgsel-queries
- `db/queries/rapport.ts` — `upsertRapport` accepterer `forespoergselId`
- `db/queries/tiltag-detalje.ts` — inkludér forespørgsler i `getTiltagDetalje`
- `app/(app)/k/[kommune]/tiltag/[id]/actions.ts` — `indhentStatusAction`
- `app/(app)/k/[kommune]/tiltag/[id]/page.tsx` — render `IndhentStatus`
- `app/rapport/page.tsx` — render forespørgsel-liste i stedet for alle-tiltag-form
- `app/rapport/actions.ts` — `besvarForespoergselAction` (erstatter `saveRapportAction`)
- `app/(app)/k/[kommune]/tovholdere/actions.ts` — `sendRundeAction` opretter forespørgsler
- `app/(app)/k/[kommune]/indstillinger/page.tsx` — kadence-kort
- En genereret migration i `db/migrations/`

**Slettes:**
- `components/tovholder-rapport-form.tsx` — erstattes af `_forespoergsel-form.tsx`

---

## Konventioner i dette repo (læs før du starter)

- **Query-tests mocker `@/db` fuldstændigt** — ingen rigtig database. Se [db/queries/tiltag-detalje.test.ts](../../../db/queries/tiltag-detalje.test.ts): `db.select` mockes med en kæde-stub (`mockChain`) hvor hver kæde-metode returnerer sig selv og `.then` resolver til de mockede rækker. Følg det mønster for læse-queries. Mutations (insert/update) enheds-testes ikke i dette repo — verificér dem i preview.
- **Pure helpers enheds-testes** med almindelig Vitest (se [lib/merl/tiltag-status.test.ts](../../../lib/merl/tiltag-status.test.ts)).
- **UI/server-actions verificeres i preview** (ingen komponent-tests i repoet).
- **Datoer**: `tidsramme_slut`/`dato` er `YYYY-MM-DD`-strenge; `iDag` laves med `new Date().toISOString().slice(0,10)`. `sendtAt` er en timestamptz (fuld ISO) — sammenlign med `Date.parse`.
- **Commits direkte på `main`** (intet feature-branch — etableret projektmønster). Du må IKKE pushe; brugeren pusher selv.
- **Kør tests:** `npx vitest run`. **Typecheck:** `npx tsc --noEmit`.

---

### Task 1: Skema — enums, `forespoergsel`-tabel, kolonner, migration

**Files:**
- Modify: `db/schema/enums.ts`
- Create: `db/schema/forespoergsel.ts`
- Modify: `db/schema/tovholder.ts`
- Modify: `db/schema/kommune.ts`
- Modify: `db/schema/index.ts`
- Create: migration i `db/migrations/` (genereres)

- [ ] **Step 1: Tilføj de to enums**

I `db/schema/enums.ts`, tilføj nederst:

```typescript
export const forespoergselStatusEnum = pgEnum('forespoergsel_status', [
  'sendt', 'besvaret', 'forfalden',
]);
export const indhentningsKadenceEnum = pgEnum('indhentnings_kadence', [
  'maanedlig', 'kvartalsvis', 'halvaarlig', 'aarlig', 'manuel',
]);
```

- [ ] **Step 2: Opret `forespoergsel`-tabellen**

Opret `db/schema/forespoergsel.ts`:

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { tovholder } from './tovholder';
import { tiltag } from './tiltag';
import { monitoreringscyklus } from './monitorering';
import { forespoergselStatusEnum } from './enums';

export const forespoergsel = pgTable('forespoergsel', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  tovholderId: uuid('tovholder_id').references(() => tovholder.id, { onDelete: 'cascade' }).notNull(),
  tiltagId: uuid('tiltag_id').references(() => tiltag.id, { onDelete: 'cascade' }).notNull(),
  monitoreringscyklusId: uuid('monitoreringscyklus_id').references(() => monitoreringscyklus.id, { onDelete: 'set null' }),
  spoergsmaal: text('spoergsmaal'),
  status: forespoergselStatusEnum('status').notNull().default('sendt'),
  sendtAt: timestamp('sendt_at', { withTimezone: true }).defaultNow().notNull(),
  besvaretAt: timestamp('besvaret_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 3: Tilføj `forespoergselId` på `tovholderRapport`**

I `db/schema/tovholder.ts`, tilføj feltet i `tovholderRapport`-objektet (efter `effektRealiseret`). **Brug en plain kolonne uden `.references()`** — en TS-reference ville skabe en cirkulær import mellem `tovholder.ts` og `forespoergsel.ts`. FK'en tilføjes i migrationen (Step 6):

```typescript
  effektRealiseret: text('effekt_realiseret'),
  forespoergselId: uuid('forespoergsel_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
```

- [ ] **Step 4: Tilføj `indhentningsKadence` på `kommune`**

I `db/schema/kommune.ts`: importér enum og tilføj kolonnen. Øverst, ret importlinjen for enums (filen importerer i dag ingen enums — tilføj importen):

```typescript
import { indhentningsKadenceEnum } from './enums';
```

Tilføj kolonnen i `kommune`-objektet (efter `publicWidgets`):

```typescript
  publicWidgets: jsonb('public_widgets'),
  indhentningsKadence: indhentningsKadenceEnum('indhentnings_kadence').notNull().default('aarlig'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
```

- [ ] **Step 5: Eksportér tabellen**

I `db/schema/index.ts`, tilføj efter `export * from './monitorering';`:

```typescript
export * from './forespoergsel';
```

- [ ] **Step 6: Generér migration og tilføj FK manuelt**

Generér migrationen fra skemaet:

```bash
npx drizzle-kit generate
```

Forventet: en ny fil `db/migrations/00XX_<navn>.sql` oprettes med: de to nye enum-typer, `forespoergsel`-tabellen med dens FK'er, kolonnen `tovholder_rapport.forespoergsel_id`, og kolonnen `kommune.indhentnings_kadence`.

`forespoergsel_id`-kolonnen får **ingen** FK fra generatoren (vi droppede TS-referencen). Åbn den genererede `.sql`-fil og tilføj nederst (med en `--> statement-breakpoint` foran hvis der står andre statements før):

```sql
--> statement-breakpoint
ALTER TABLE "tovholder_rapport" ADD CONSTRAINT "tovholder_rapport_forespoergsel_id_forespoergsel_id_fk" FOREIGN KEY ("forespoergsel_id") REFERENCES "public"."forespoergsel"("id") ON DELETE set null ON UPDATE no action;
```

- [ ] **Step 7: Kør migrationen mod den lokale database**

```bash
npx drizzle-kit migrate
```

Forventet: `[✓]` / "migrations applied". (`drizzle-kit migrate` loader `DATABASE_URL` via `drizzle.config.ts`.)

- [ ] **Step 8: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 9: Commit**

```bash
git add db/schema/ db/migrations/
git commit -m "feat: forespoergsel-skema, kadence-kolonne og migration"
```

---

### Task 2: Rene hjælpefunktioner — forfalden, nylig-anmodet, kadence

**Files:**
- Create: `lib/merl/forespoergsel-status.ts`
- Test: `lib/merl/forespoergsel-status.test.ts`

- [ ] **Step 1: Skriv de fejlende tests**

Opret `lib/merl/forespoergsel-status.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  erForfalden, nyligAnmodet, kadenceLabel, kadencePeriodeNoegle,
  SVARVINDUE_DAGE, ANMOD_IGEN_SPAERRE_DAGE,
} from './forespoergsel-status';

describe('erForfalden', () => {
  it('er false for besvaret forespørgsel uanset alder', () => {
    expect(erForfalden('besvaret', '2026-01-01T00:00:00Z', '2026-06-01')).toBe(false);
  });
  it('er false når sendt inden for svarvinduet', () => {
    expect(erForfalden('sendt', '2026-06-01T00:00:00Z', '2026-06-10')).toBe(false);
  });
  it('er true når sendt ældre end svarvinduet og stadig sendt', () => {
    expect(erForfalden('sendt', '2026-05-01T00:00:00Z', '2026-06-01')).toBe(true);
  });
  it('bruger SVARVINDUE_DAGE som grænse (præcis grænse er ikke forfalden)', () => {
    // 14 dage fra 1. juni = 15. juni; 15. juni er ikke > 14 dage
    expect(erForfalden('sendt', '2026-06-01T00:00:00Z', '2026-06-15')).toBe(false);
    expect(erForfalden('sendt', '2026-06-01T00:00:00Z', '2026-06-16')).toBe(true);
  });
});

describe('nyligAnmodet', () => {
  it('er false når der aldrig er anmodet', () => {
    expect(nyligAnmodet(null, '2026-06-01')).toBe(false);
  });
  it('er true når seneste anmodning er inden for spærren', () => {
    expect(nyligAnmodet('2026-05-30T00:00:00Z', '2026-06-01')).toBe(true);
  });
  it('er false når seneste anmodning er ældre end spærren', () => {
    expect(nyligAnmodet('2026-05-01T00:00:00Z', '2026-06-01')).toBe(false);
  });
});

describe('kadenceLabel', () => {
  it('giver dansk label for hver kadence', () => {
    expect(kadenceLabel('maanedlig')).toBe('Månedlig');
    expect(kadenceLabel('kvartalsvis')).toBe('Kvartalsvis');
    expect(kadenceLabel('halvaarlig')).toBe('Halvårlig');
    expect(kadenceLabel('aarlig')).toBe('Årlig');
    expect(kadenceLabel('manuel')).toBe('Manuel (slukket)');
  });
});

describe('kadencePeriodeNoegle', () => {
  it('årlig → år', () => {
    expect(kadencePeriodeNoegle('aarlig', '2026-06-09')).toBe('2026');
  });
  it('halvårlig → halvår', () => {
    expect(kadencePeriodeNoegle('halvaarlig', '2026-06-09')).toBe('2026-H1');
    expect(kadencePeriodeNoegle('halvaarlig', '2026-09-09')).toBe('2026-H2');
  });
  it('kvartalsvis → kvartal', () => {
    expect(kadencePeriodeNoegle('kvartalsvis', '2026-06-09')).toBe('2026-Q2');
    expect(kadencePeriodeNoegle('kvartalsvis', '2026-01-15')).toBe('2026-Q1');
  });
  it('månedlig → måned', () => {
    expect(kadencePeriodeNoegle('maanedlig', '2026-06-09')).toBe('2026-06');
  });
  it('manuel → null', () => {
    expect(kadencePeriodeNoegle('manuel', '2026-06-09')).toBe(null);
  });
});

describe('konstanter', () => {
  it('har fornuftige standarder', () => {
    expect(SVARVINDUE_DAGE).toBe(14);
    expect(ANMOD_IGEN_SPAERRE_DAGE).toBe(7);
  });
});
```

- [ ] **Step 2: Kør testen — verificér at den fejler**

Run: `npx vitest run lib/merl/forespoergsel-status.test.ts`
Expected: FAIL — "Cannot find module './forespoergsel-status'".

- [ ] **Step 3: Implementér hjælpemodulet**

Opret `lib/merl/forespoergsel-status.ts`:

```typescript
export type ForespoergselStatus = 'sendt' | 'besvaret' | 'forfalden';
export type IndhentningsKadence = 'maanedlig' | 'kvartalsvis' | 'halvaarlig' | 'aarlig' | 'manuel';

/** Antal dage en forespørgsel må stå ubesvaret før den regnes som forfalden. */
export const SVARVINDUE_DAGE = 14;
/** Antal dage hvor en ny manuel anmodning regnes som "nylig" (anti-spam). */
export const ANMOD_IGEN_SPAERRE_DAGE = 7;

function dageMellem(fraISO: string, tilDatoISO: string): number {
  const fra = Date.parse(fraISO);
  const til = Date.parse(tilDatoISO);
  return Math.floor((til - fra) / 86_400_000);
}

/**
 * Afledt forfalden-tilstand. Beregnes ved læsning (pg-boss er no-op), samme
 * mønster som "forsinket"-overlayet. En forespørgsel er forfalden når den
 * stadig er 'sendt' og blev sendt for mere end svarvinduet siden.
 */
export function erForfalden(
  status: ForespoergselStatus,
  sendtAtISO: string,
  iDagISO: string,
  svarvindueDage = SVARVINDUE_DAGE,
): boolean {
  if (status !== 'sendt') return false;
  return dageMellem(sendtAtISO, iDagISO) > svarvindueDage;
}

/** True hvis seneste anmodning er sket inden for spærren (advar mod gentagelse). */
export function nyligAnmodet(
  sidstAnmodetISO: string | null,
  iDagISO: string,
  spaerreDage = ANMOD_IGEN_SPAERRE_DAGE,
): boolean {
  if (!sidstAnmodetISO) return false;
  return dageMellem(sidstAnmodetISO, iDagISO) <= spaerreDage;
}

const KADENCE_LABELS: Record<IndhentningsKadence, string> = {
  maanedlig: 'Månedlig',
  kvartalsvis: 'Kvartalsvis',
  halvaarlig: 'Halvårlig',
  aarlig: 'Årlig',
  manuel: 'Manuel (slukket)',
};

export function kadenceLabel(kadence: IndhentningsKadence): string {
  return KADENCE_LABELS[kadence];
}

/**
 * Periodenøgle for en kadence på en given dato — bruges af den (udskudte)
 * scheduler til at afgøre om en ny periode er begyndt. 'manuel' → null.
 */
export function kadencePeriodeNoegle(kadence: IndhentningsKadence, datoISO: string): string | null {
  const aar = datoISO.slice(0, 4);
  const maaned = Number(datoISO.slice(5, 7)); // 1-12
  switch (kadence) {
    case 'aarlig': return aar;
    case 'halvaarlig': return `${aar}-H${maaned <= 6 ? 1 : 2}`;
    case 'kvartalsvis': return `${aar}-Q${Math.ceil(maaned / 3)}`;
    case 'maanedlig': return `${aar}-${datoISO.slice(5, 7)}`;
    case 'manuel': return null;
  }
}
```

- [ ] **Step 4: Kør testen — verificér grøn**

Run: `npx vitest run lib/merl/forespoergsel-status.test.ts`
Expected: PASS (alle 16 assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/merl/forespoergsel-status.ts lib/merl/forespoergsel-status.test.ts
git commit -m "feat: rene hjælpefunktioner for forespørgsel-status og kadence"
```

---

### Task 3: Queries — opret, hent, markér besvaret

**Files:**
- Create: `db/queries/forespoergsel.ts`
- Test: `db/queries/forespoergsel.test.ts`
- Modify: `db/queries/index.ts`

- [ ] **Step 1: Skriv de fejlende tests for de læse-formende queries**

Opret `db/queries/forespoergsel.test.ts` (følger mock-kæde-mønstret fra `tiltag-detalje.test.ts`):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbSelect = vi.fn();
vi.mock('@/db', () => ({ db: { select: (...a: unknown[]) => dbSelect(...a) } }));
vi.mock('@/db/schema', () => ({
  forespoergsel: {}, tiltag: {}, tovholder: {}, tovholderTiltag: {},
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(), asc: vi.fn(),
}));

import {
  getAabneForespoergslerForTovholder,
  getForespoergslerForTiltag,
  getTovholdereForTiltag,
} from './forespoergsel';

beforeEach(() => vi.clearAllMocks());

function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then: unknown }).then = (res: (v: unknown) => void) => res(rows);
  return chain;
}

describe('getAabneForespoergslerForTovholder', () => {
  it('returnerer åbne forespørgsler med tiltag-titel', async () => {
    dbSelect.mockReturnValueOnce(mockChain([
      { id: 'f1', tiltagId: 't1', tiltagTitel: 'El-busser', spoergsmaal: 'Hvor langt?', sendtAt: '2026-06-01T00:00:00Z' },
    ]));
    const result = await getAabneForespoergslerForTovholder('th1');
    expect(result).toEqual([
      { id: 'f1', tiltagId: 't1', tiltagTitel: 'El-busser', spoergsmaal: 'Hvor langt?', sendtAt: '2026-06-01T00:00:00Z' },
    ]);
  });
});

describe('getForespoergslerForTiltag', () => {
  it('returnerer forespørgsler for et tiltag (nyeste først)', async () => {
    dbSelect.mockReturnValueOnce(mockChain([
      { id: 'f2', status: 'sendt', sendtAt: '2026-06-05T00:00:00Z', besvaretAt: null },
      { id: 'f1', status: 'besvaret', sendtAt: '2026-05-01T00:00:00Z', besvaretAt: '2026-05-03T00:00:00Z' },
    ]));
    const result = await getForespoergslerForTiltag('t1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('f2');
  });
});

describe('getTovholdereForTiltag', () => {
  it('returnerer tovholdere knyttet til et tiltag', async () => {
    dbSelect.mockReturnValueOnce(mockChain([
      { id: 'th1', navn: 'Anna', email: 'anna@x.dk' },
    ]));
    const result = await getTovholdereForTiltag('t1');
    expect(result).toEqual([{ id: 'th1', navn: 'Anna', email: 'anna@x.dk' }]);
  });
});
```

- [ ] **Step 2: Kør testen — verificér at den fejler**

Run: `npx vitest run db/queries/forespoergsel.test.ts`
Expected: FAIL — "Cannot find module './forespoergsel'".

- [ ] **Step 3: Implementér query-modulet**

Opret `db/queries/forespoergsel.ts`:

```typescript
import { db } from '@/db';
import { forespoergsel, tiltag, tovholder, tovholderTiltag } from '@/db/schema';
import { and, eq, desc, asc } from 'drizzle-orm';

export type ForespoergselRow = {
  id: string;
  status: 'sendt' | 'besvaret' | 'forfalden';
  sendtAt: string;
  besvaretAt: string | null;
};

export type AabenForespoergsel = {
  id: string;
  tiltagId: string;
  tiltagTitel: string;
  spoergsmaal: string | null;
  sendtAt: string;
};

export type TovholderKort = { id: string; navn: string; email: string };

/** Opretter én forespørgsel scopet til (tovholder, tiltag). */
export async function createForespoergsel(data: {
  kommuneId: string;
  tovholderId: string;
  tiltagId: string;
  spoergsmaal?: string | null;
  monitoreringscyklusId?: string | null;
}) {
  const [created] = await db
    .insert(forespoergsel)
    .values({
      kommuneId: data.kommuneId,
      tovholderId: data.tovholderId,
      tiltagId: data.tiltagId,
      spoergsmaal: data.spoergsmaal ?? null,
      monitoreringscyklusId: data.monitoreringscyklusId ?? null,
    })
    .returning();
  return created;
}

/** Åbne (status='sendt') forespørgsler for én tovholder, ældste først. */
export async function getAabneForespoergslerForTovholder(tovholderId: string): Promise<AabenForespoergsel[]> {
  return db
    .select({
      id: forespoergsel.id,
      tiltagId: forespoergsel.tiltagId,
      tiltagTitel: tiltag.titel,
      spoergsmaal: forespoergsel.spoergsmaal,
      sendtAt: forespoergsel.sendtAt,
    })
    .from(forespoergsel)
    .innerJoin(tiltag, eq(forespoergsel.tiltagId, tiltag.id))
    .where(and(eq(forespoergsel.tovholderId, tovholderId), eq(forespoergsel.status, 'sendt')))
    .orderBy(asc(forespoergsel.sendtAt));
}

/** Alle forespørgsler for ét tiltag, nyeste først (til "sidst anmodet" + åbne-antal). */
export async function getForespoergslerForTiltag(tiltagId: string): Promise<ForespoergselRow[]> {
  return db
    .select({
      id: forespoergsel.id,
      status: forespoergsel.status,
      sendtAt: forespoergsel.sendtAt,
      besvaretAt: forespoergsel.besvaretAt,
    })
    .from(forespoergsel)
    .where(eq(forespoergsel.tiltagId, tiltagId))
    .orderBy(desc(forespoergsel.sendtAt));
}

/** Tovholdere knyttet til et tiltag (via tovholder_tiltag). */
export async function getTovholdereForTiltag(tiltagId: string): Promise<TovholderKort[]> {
  return db
    .select({ id: tovholder.id, navn: tovholder.navn, email: tovholder.email })
    .from(tovholder)
    .innerJoin(
      tovholderTiltag,
      and(eq(tovholderTiltag.tovholderId, tovholder.id), eq(tovholderTiltag.tiltagId, tiltagId)),
    )
    .orderBy(asc(tovholder.navn));
}

/** Slår én forespørgsel op (til scope-tjek ved besvarelse). */
export async function getForespoergselById(id: string) {
  return db.query.forespoergsel.findFirst({ where: eq(forespoergsel.id, id) });
}

/** Markér en forespørgsel som besvaret. */
export async function markForespoergselBesvaret(id: string) {
  await db
    .update(forespoergsel)
    .set({ status: 'besvaret', besvaretAt: new Date() })
    .where(eq(forespoergsel.id, id));
}
```

- [ ] **Step 4: Kør testen — verificér grøn**

Run: `npx vitest run db/queries/forespoergsel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Eksportér queries**

I `db/queries/index.ts`, tilføj efter `export * from './monitorering';`:

```typescript
export * from './forespoergsel';
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

```bash
git add db/queries/forespoergsel.ts db/queries/forespoergsel.test.ts db/queries/index.ts
git commit -m "feat: forespørgsel-queries (opret, hent, markér besvaret)"
```

---

### Task 4: `upsertRapport` accepterer `forespoergselId`

**Files:**
- Modify: `db/queries/rapport.ts`

- [ ] **Step 1: Udvid `RapportData` og insert/update**

I `db/queries/rapport.ts`, tilføj `forespoergselId` til `RapportData`:

```typescript
export type RapportData = {
  statusImplementering?: string;
  statusBeskrivelse?: string;
  barrierer?: string;
  naesteSkrid?: string;
  effektRealiseret?: string;
  forespoergselId?: string;
};
```

`upsertRapport` spreder allerede `...data` ind i både `.set(data)` og `.values({ ... ...data })`, så `forespoergselId` flyder automatisk med. Ingen yderligere ændring i funktionskroppen er nødvendig — verificér blot at `data`-spread-linjerne er intakte.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add db/queries/rapport.ts
git commit -m "feat: upsertRapport kan sætte forespoergselId"
```

---

### Task 5: `indhentStatusAction` — opret forespørgsel(er) for ét tiltag

**Files:**
- Modify: `app/(app)/k/[kommune]/tiltag/[id]/actions.ts`

- [ ] **Step 1: Tilføj action**

I `app/(app)/k/[kommune]/tiltag/[id]/actions.ts`, tilføj importer øverst (behold eksisterende importer):

```typescript
import { getKommuneById, getTiltagById } from '@/db/queries';
import { createForespoergsel, getTovholdereForTiltag } from '@/db/queries/forespoergsel';
import { createMagicLink } from '@/db/queries/magic-link';
import { sendMagicLinkEmail } from '@/lib/email';
```

(Hvis `getTiltagById` allerede importeres, undgå dublet.)

Tilføj funktionen nederst i filen:

```typescript
export async function indhentStatusAction(
  slug: string,
  tiltagId: string,
  formData: FormData,
): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  const tiltag = await getTiltagById(tiltagId);
  if (!tiltag || tiltag.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');

  const spoergsmaal = ((formData.get('spoergsmaal') as string) || '').trim() || null;

  const [tovholdere, kommuneRow] = await Promise.all([
    getTovholdereForTiltag(tiltagId),
    getKommuneById(kommune.id),
  ]);
  if (!kommuneRow) throw new Error('Kommune ikke fundet');

  const base = process.env.NODE_ENV === 'production'
    ? `https://${kommuneRow.subdomain}.klimastatus.dk`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
  const kanSendeMail = !!process.env.BREVO_API_KEY;

  for (const th of tovholdere) {
    await createForespoergsel({
      kommuneId: kommune.id,
      tovholderId: th.id,
      tiltagId,
      spoergsmaal,
    });
    if (kanSendeMail) {
      const token = await createMagicLink(th.id);
      await sendMagicLinkEmail(th.email, `${base}/rapport/${token}`, kommuneRow.navn);
    }
  }

  revalidatePath(`/k/${slug}/tiltag/${tiltagId}`);
}
```

Bemærk: `requireKommuneContext` og `revalidatePath` importeres allerede i filen (verificér — de bruges af `opretLaeringspostForTiltagAction`). Hvis ikke, tilføj dem.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/[id]/actions.ts"
git commit -m "feat: indhentStatusAction opretter forespørgsel pr. tovholder på tiltag"
```

---

### Task 6: Inkludér forespørgsler i `getTiltagDetalje`

**Files:**
- Modify: `db/queries/tiltag-detalje.ts`

- [ ] **Step 1: Tilføj forespørgsler til den batchede detalje**

Åbn `db/queries/tiltag-detalje.ts`. Tilføj importen for forespørgsel-query (ved siden af de øvrige imports):

```typescript
import { getForespoergslerForTiltag, type ForespoergselRow } from './forespoergsel';
```

Tilføj `forespoergsler` til `TiltagDetalje`-typen:

```typescript
export type TiltagDetalje = {
  // ... eksisterende felter ...
  forespoergsler: ForespoergselRow[];
};
```

I `getTiltagDetalje`s `Promise.all`, tilføj kaldet som et nyt element (bevar rækkefølgen konsistent med destructuring nedenfor):

```typescript
  const [/* eksisterende */, forespoergsler] = await Promise.all([
    // ... eksisterende kald ...
    getForespoergslerForTiltag(tiltagId),
  ]);
```

Og medtag det i retur-objektet:

```typescript
  return {
    // ... eksisterende felter ...
    forespoergsler,
  };
```

Læs den eksisterende funktion nøje og indsæt elementet så destructuring-positionen matcher `Promise.all`-rækkefølgen.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Kør hele suiten (sikrer at eksisterende detalje-tests stadig er grønne)**

Run: `npx vitest run`
Expected: PASS (alle eksisterende + nye tests).

- [ ] **Step 4: Commit**

```bash
git add db/queries/tiltag-detalje.ts
git commit -m "feat: getTiltagDetalje inkluderer forespørgsler"
```

---

### Task 7: "Indhent status"-komponent + indpas i arbejdsrummet

**Files:**
- Create: `app/(app)/k/[kommune]/tiltag/[id]/_indhent-status.tsx`
- Modify: `app/(app)/k/[kommune]/tiltag/[id]/page.tsx`

- [ ] **Step 1: Opret klient-komponenten**

Opret `app/(app)/k/[kommune]/tiltag/[id]/_indhent-status.tsx`:

```tsx
'use client';
import { useState } from 'react';

type Props = {
  action: (formData: FormData) => Promise<void>;
  antalTovholdere: number;
  sidstAnmodet: string | null;
  nyligAnmodet: boolean;
};

export function IndhentStatus({ action, antalTovholdere, sidstAnmodet, nyligAnmodet }: Props) {
  const [aaben, setAaben] = useState(false);

  if (antalTovholdere === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 px-5 py-4 text-sm text-gray-500">
        Ingen tovholder er tilknyttet dette tiltag endnu. Tilføj en under <strong>Tovholdere</strong> for at kunne indhente status.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Indhent status fra tovholder</h2>
          <p className="text-xs text-gray-500">
            Sender et magic-link til {antalTovholdere === 1 ? 'tovholderen' : `${antalTovholdere} tovholdere`}.
            {sidstAnmodet ? ` Sidst anmodet ${sidstAnmodet.slice(0, 10)}.` : ' Ikke anmodet endnu.'}
          </p>
        </div>
        {!aaben && (
          <button onClick={() => setAaben(true)} className="ks-btn ks-btn-primary shrink-0" style={{ padding: '8px 14px', fontSize: 13 }}>
            Indhent status
          </button>
        )}
      </div>

      {aaben && (
        <form action={action} className="mt-4 space-y-3">
          {nyligAnmodet && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Du anmodede for nylig. Send kun igen hvis det er nødvendigt.
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Konkret spørgsmål (valgfrit)</label>
            <textarea
              name="spoergsmaal"
              rows={2}
              placeholder="F.eks. 'Er de sidste 2 busser sat i drift?'"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="ks-btn ks-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
              Send forespørgsel
            </button>
            <button type="button" onClick={() => setAaben(false)} className="text-sm text-gray-500 hover:text-gray-900">
              Annullér
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Indpas i arbejdsrummet**

I `app/(app)/k/[kommune]/tiltag/[id]/page.tsx`:

Tilføj importer:

```typescript
import { IndhentStatus } from './_indhent-status';
import { indhentStatusAction } from './actions';
import { erForfalden, nyligAnmodet as erNyligAnmodet } from '@/lib/merl/forespoergsel-status';
```

Efter `const sidstOpdateret = ...`-linjen, udregn forespørgsel-afledninger:

```typescript
  const forespoergsler = detalje.forespoergsler;
  const sidstAnmodet = forespoergsler[0]?.sendtAt ?? null;
  const aabneForespoergsler = forespoergsler.filter(
    (f) => f.status === 'sendt' && !erForfalden(f.status, f.sendtAt, iDag),
  ).length;
  const forfaldne = forespoergsler.filter((f) => erForfalden(f.status, f.sendtAt, iDag)).length;
  const visNyligAnmodet = erNyligAnmodet(sidstAnmodet, iDag);
  const boundIndhent = indhentStatusAction.bind(null, slug, id);
  const tovholderAntal = detalje.tovholdere?.length ?? 0;
```

> **Note:** Hvis `detalje` ikke allerede har et `tovholdere`-felt, brug i stedet et nyt parallelt kald. Læs `getTiltagDetalje` (Task 6-resultat): hvis den returnerer `tovholdere`, brug `detalje.tovholdere.length`; ellers tilføj `getTovholdereForTiltag(id)` til `Promise.all` i `page.tsx` (ved siden af `getTiltagDetalje`/`getBarriereInbox`) og brug dets længde. Vælg den der matcher den faktiske `TiltagDetalje`-form.

Render `IndhentStatus` lige under `Statushoved` (før sektionerne):

```tsx
      <Statushoved
        /* ...eksisterende props... */
      />

      <IndhentStatus
        action={boundIndhent}
        antalTovholdere={tovholderAntal}
        sidstAnmodet={sidstAnmodet}
        nyligAnmodet={visNyligAnmodet}
      />
```

Hvis du vil vise forfaldne i statushovedet, kan `forfaldne`/`aabneForespoergsler` sendes videre senere — ikke påkrævet for denne task.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl. (Hvis `detalje.tovholdere` ikke findes, retter du iht. noten i Step 2.)

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/[id]/_indhent-status.tsx" "app/(app)/k/[kommune]/tiltag/[id]/page.tsx"
git commit -m "feat: Indhent status-knap på tiltag-arbejdsrummet"
```

---

### Task 8: `/rapport` ombygges — besvar én forespørgsel ad gangen

**Files:**
- Create: `app/rapport/_forespoergsel-form.tsx`
- Modify: `app/rapport/actions.ts`
- Modify: `app/rapport/page.tsx`
- Delete: `components/tovholder-rapport-form.tsx`

- [ ] **Step 1: Skriv besvar-action (erstat hele `app/rapport/actions.ts`)**

```typescript
'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { decryptTovholder } from '@/lib/tovholder-session';
import { upsertRapport } from '@/db/queries/rapport';
import { getForespoergselById, markForespoergselBesvaret } from '@/db/queries/forespoergsel';
import type { FormState } from '@/lib/definitions';

export async function besvarForespoergselAction(
  forespoergselId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tovholder-session')?.value;
  if (!token) return { message: 'Ikke autoriseret — brug linket fra din email.' };

  const session = await decryptTovholder(token);
  if (!session || new Date(session.expiresAt) < new Date()) {
    return { message: 'Session udløbet — brug linket fra din email igen.' };
  }

  const forespoergsel = await getForespoergselById(forespoergselId);
  if (!forespoergsel || forespoergsel.tovholderId !== session.tovholderId) {
    return { message: 'Forespørgslen kunne ikke findes.' };
  }
  if (forespoergsel.status === 'besvaret') {
    return { message: 'Allerede besvaret.' };
  }

  const dato = new Date().toISOString().split('T')[0];
  await upsertRapport(session.tovholderId, forespoergsel.tiltagId, dato, {
    statusImplementering: (formData.get('statusImplementering') as string) || undefined,
    barrierer: (formData.get('barrierer') as string) || undefined,
    forespoergselId,
  });
  await markForespoergselBesvaret(forespoergselId);

  revalidatePath('/rapport');
  return { message: 'Tak — status er sendt ✓' };
}
```

- [ ] **Step 2: Opret forespørgsel-formen**

Opret `app/rapport/_forespoergsel-form.tsx`:

```tsx
'use client';
import { useActionState } from 'react';
import { besvarForespoergselAction } from './actions';
import { Button } from '@/components/ui/button';

type Forespoergsel = {
  id: string;
  tiltagTitel: string;
  spoergsmaal: string | null;
};

export function ForespoergselForm({
  aktiv,
  antal,
  position,
}: {
  aktiv: Forespoergsel;
  antal: number;
  position: number;
}) {
  const action = besvarForespoergselAction.bind(null, aktiv.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        Forespørgsel {position} af {antal}
      </p>
      <h2 className="text-lg font-semibold text-gray-900">{aktiv.tiltagTitel}</h2>
      {aktiv.spoergsmaal && (
        <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {aktiv.spoergsmaal}
        </p>
      )}

      <div className="mt-4 grid gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Status for implementering</label>
          <textarea
            name="statusImplementering"
            rows={3}
            placeholder="Beskriv hvor langt I er…"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Barrierer (hvis nogen)</label>
          <textarea
            name="barrierer"
            rows={3}
            placeholder="Hvad står i vejen?"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {state?.message && (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${state.message.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {state.message}
        </p>
      )}
      <div className="mt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Sender…' : 'Send status'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Byg `/rapport`-siden om**

Erstat kroppen i `app/rapport/page.tsx`. Behold session-gates (token mangler / udløbet) uændret, men erstat data-hentning og rendering:

```tsx
import { cookies } from 'next/headers';
import { decryptTovholder } from '@/lib/tovholder-session';
import { getTovholderById } from '@/db/queries/tovholder';
import { getAabneForespoergslerForTovholder } from '@/db/queries/forespoergsel';
import { ForespoergselForm } from './_forespoergsel-form';

export const metadata = { title: 'Tovholder-rapport — Klimastatus.dk' };

export default async function RapportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tovholder-session')?.value;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md px-6 py-12 text-center">
          <p className="text-gray-500">Ingen aktiv session. Brug linket fra din email.</p>
        </div>
      </div>
    );
  }

  const session = await decryptTovholder(token);
  if (!session || new Date(session.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md px-6 py-12 text-center">
          <p className="text-gray-500">Din session er udløbet. Brug linket fra din email igen.</p>
        </div>
      </div>
    );
  }

  const [tovholder, forespoergsler] = await Promise.all([
    getTovholderById(session.tovholderId),
    getAabneForespoergslerForTovholder(session.tovholderId),
  ]);

  if (!tovholder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Tovholder ikke fundet.</p>
      </div>
    );
  }

  const aktiv = forespoergsler[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Hej {tovholder.navn}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {forespoergsler.length === 0
              ? 'Du har ingen åbne forespørgsler lige nu. Tak!'
              : `Du har ${forespoergsler.length} ${forespoergsler.length === 1 ? 'forespørgsel' : 'forespørgsler'}. Besvar én ad gangen.`}
          </p>
        </div>

        {aktiv && (
          <ForespoergselForm
            aktiv={{ id: aktiv.id, tiltagTitel: aktiv.tiltagTitel, spoergsmaal: aktiv.spoergsmaal }}
            antal={forespoergsler.length}
            position={1}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Slet den gamle form**

```bash
git rm components/tovholder-rapport-form.tsx
```

(Den importeres ikke længere. `getTiltagForTovholder`/`getLatestRapporterForTovholder` bevares — de bruges andetsteds / er ufarlige.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl. (Bekræft at intet andet importerede `TovholderRapportForm` eller `saveRapportAction` — søg: `grep -rn "TovholderRapportForm\|saveRapportAction" app components`. Forventet: ingen hits.)

- [ ] **Step 6: Commit**

```bash
git add app/rapport/
git commit -m "feat: /rapport besvarer én forespørgsel ad gangen"
```

---

### Task 9: `sendRundeAction` opretter forespørgsler

**Files:**
- Modify: `app/(app)/k/[kommune]/tovholdere/actions.ts`

- [ ] **Step 1: Lad rundeafsendelse oprette forespørgsler**

I `app/(app)/k/[kommune]/tovholdere/actions.ts`: tilføj importer (behold eksisterende):

```typescript
import { getTiltagForTovholder } from '@/db/queries/tiltag';
import { createForespoergsel } from '@/db/queries/forespoergsel';
```

Erstat kroppen af `sendRundeAction` med en version der opretter forespørgsler pr. (tovholder, tiltag) og kun sender mail når der er noget at spørge om:

```typescript
export async function sendRundeAction(slug: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  const [tovholdere, kommuneRow] = await Promise.all([
    getAllTovholdere(kommune.id),
    getKommuneById(kommune.id),
  ]);
  if (!kommuneRow) throw new Error('Kommune ikke fundet');

  const base = process.env.NODE_ENV === 'production'
    ? `https://${kommuneRow.subdomain}.klimastatus.dk`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
  const kanSendeMail = !!process.env.BREVO_API_KEY;

  const aktiveTovholdere = tovholdere.filter((t) => t.aktiv);
  await Promise.all(
    aktiveTovholdere.map(async (tovholder) => {
      const tiltagListe = await getTiltagForTovholder(tovholder.id);
      if (tiltagListe.length === 0) return;

      await Promise.all(
        tiltagListe.map((t) =>
          createForespoergsel({
            kommuneId: kommune.id,
            tovholderId: tovholder.id,
            tiltagId: t.id,
          }),
        ),
      );

      if (kanSendeMail) {
        const token = await createMagicLink(tovholder.id);
        await sendMagicLinkEmail(tovholder.email, `${base}/rapport/${token}`, kommuneRow.navn);
      }
    }),
  );

  redirect(`/k/${slug}/tovholdere`);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/tovholdere/actions.ts"
git commit -m "feat: rundeafsendelse opretter forespørgsler pr. tiltag"
```

---

### Task 10: Kadence-indstilling i `indstillinger`

**Files:**
- Create: `app/(app)/k/[kommune]/indstillinger/kadence-actions.ts`
- Create: `app/(app)/k/[kommune]/indstillinger/_kadence-form.tsx`
- Modify: `app/(app)/k/[kommune]/indstillinger/page.tsx`

- [ ] **Step 1: Server action til at gemme kadence**

Opret `app/(app)/k/[kommune]/indstillinger/kadence-actions.ts`:

```typescript
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { kommune as kommuneSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const Schema = z.object({
  indhentningsKadence: z.enum(['maanedlig', 'kvartalsvis', 'halvaarlig', 'aarlig', 'manuel']),
});

export async function updateKadenceAction(slug: string, formData: FormData): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const parsed = Schema.safeParse({ indhentningsKadence: formData.get('indhentningsKadence') });
  if (!parsed.success) throw new Error('Ugyldig kadence');

  await db
    .update(kommuneSchema)
    .set({ indhentningsKadence: parsed.data.indhentningsKadence, updatedAt: new Date() })
    .where(eq(kommuneSchema.id, kommune.id));

  revalidatePath(`/k/${slug}/indstillinger`);
}
```

- [ ] **Step 2: Klient-form**

Opret `app/(app)/k/[kommune]/indstillinger/_kadence-form.tsx`:

```tsx
'use client';
import type { IndhentningsKadence } from '@/lib/merl/forespoergsel-status';

const VALG: { value: IndhentningsKadence; label: string }[] = [
  { value: 'maanedlig', label: 'Månedlig' },
  { value: 'kvartalsvis', label: 'Kvartalsvis' },
  { value: 'halvaarlig', label: 'Halvårlig' },
  { value: 'aarlig', label: 'Årlig' },
  { value: 'manuel', label: 'Manuel (slukket)' },
];

export function KadenceForm({
  initial,
  action,
}: {
  initial: IndhentningsKadence;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Standard-kadence</label>
        <select
          name="indhentningsKadence"
          defaultValue={initial}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          {VALG.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="ks-btn ks-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
        Gem
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Tilføj kort i indstillinger-siden**

I `app/(app)/k/[kommune]/indstillinger/page.tsx`: tilføj importer:

```typescript
import { KadenceForm } from './_kadence-form';
import { updateKadenceAction } from './kadence-actions';
import type { IndhentningsKadence } from '@/lib/merl/forespoergsel-status';
```

Indsæt et nyt kort efter "Kommuneoplysninger"-kortet (før "Offentlig klimaside"):

```tsx
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Status-indhentning fra tovholdere</h2>
        <p className="mb-4 text-sm text-gray-500">
          Hvor ofte skal tovholdere automatisk bedes om status? Manuel afsendelse fra et tiltag virker altid uanset valg.
        </p>
        <KadenceForm
          initial={kommune.indhentningsKadence as IndhentningsKadence}
          action={updateKadenceAction.bind(null, slug)}
        />
      </div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/k/[kommune]/indstillinger/"
git commit -m "feat: kadence-indstilling for status-indhentning"
```

---

### Task 11: Verifikation i preview

**Files:** ingen (manuel verifikation)

- [ ] **Step 1: Kør hele testsuiten**

Run: `npx vitest run`
Expected: PASS — alle tests grønne (eksisterende + nye).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Verificér i preview (dev-server kører på `localhost:3000`)**

Log ind (`augustseptimius@gmail.com` / `admin123!`) og verificér på kommunen `groenkobing`:

1. **Indhent status:** Åbn et tiltag-arbejdsrum (`/k/groenkobing/tiltag/<id>`). Bekræft at "Indhent status fra tovholder"-kortet vises. Hvis tiltaget har en tovholder: klik "Indhent status", skriv evt. et spørgsmål, klik "Send forespørgsel". Bekræft (server-log) at en `forespoergsel`-række oprettes (mail springes over i dev — `BREVO_API_KEY` er ikke sat). Genindlæs: "Sidst anmodet <dato>" vises.
2. **Ingen tovholder:** Åbn et tiltag uden tovholder. Bekræft tom-tilstanden ("Ingen tovholder er tilknyttet…").
3. **`/rapport`:** Find tovholderens forespørgsel i databasen, opret et gyldigt magic-link (eller brug en eksisterende session), og åbn `/rapport`. Bekræft at kun ÉN forespørgsel vises ad gangen med "Forespørgsel 1 af N" og evt. det konkrete spørgsmål. Udfyld status + barriere, send. Bekræft "Tak — status er sendt ✓" og at forespørgslen forsvinder ved genindlæsning (status='besvaret').
4. **Barriere-indbakke:** Hvis du skrev en barriere, gå til `/k/groenkobing/laering` og bekræft at den nye barriere optræder i indbakken (via `getBarriereInbox`).
5. **Kadence:** Gå til `/k/groenkobing/indstillinger`. Bekræft "Status-indhentning"-kortet. Skift kadence til f.eks. "Kvartalsvis", klik Gem, genindlæs — valget er bevaret.

For SQL-inspektion under verifikation kan du bruge en let forespørgsel mod databasen (læs `DATABASE_URL` fra `.env.local`):

```bash
# Eksempel — tæl forespørgsler pr. status
psql "$DATABASE_URL" -c "select status, count(*) from forespoergsel group by status;"
```

- [ ] **Step 4: Endelig commit hvis der var rettelser**

Hvis verifikationen afslørede småfejl, ret dem, kør `npx vitest run` + `npx tsc --noEmit` igen, og commit med en beskrivende besked.

---

## Udskudt (bevidst ude af scope i denne plan)

- **Reel auto-afsendelse via scheduler.** Periodenøgle-logikken (`kadencePeriodeNoegle`) og en generaliseret cyklus-helper er forudsætningen, men selve afsendelsen kræver en fungerende pg-boss (i dag no-op, jf. roadmap). Leveres når scheduleren er live; indtil da virker **manuel** afsendelse (per-tiltag "Indhent status" + rundeafsendelse) fuldt. `forespoergsel.monitoreringscyklusId` står klar (nullable) til at koble timer-genererede forespørgsler til en cyklus.
- **Persisteret `'forfalden'`-status.** Enum-værdien findes, men UI'et udleder forfalden ved læsning (`erForfalden`). En cron der skriver `'forfalden'` til DB tilføjes sammen med scheduleren.
- **Per-tiltag kadence-override.** Kun kommune-standard nu (V2).
- **`/laering` slankes til rent review-lag.** Egen plan (MERL 3).

---

## Selv-review (udført af planforfatteren)

**Spec-dækning (Flade 1):**
- Ny `forespoergsel`-tabel + `forespoergsel_status`-enum → Task 1. ✓
- `forespoergselId` på `tovholderRapport` (set null) → Task 1 (plain kolonne + manuel FK). ✓
- `indhentningsKadence`-enum + kolonne på `kommune`, default `aarlig`, redigerbar i indstillinger → Task 1 + Task 10. ✓
- "Indhent status" opretter forespørgsel scopet til (tovholder, tiltag) + sender magic-link + "sidst anmodet" + anti-spam-advarsel → Task 5 + Task 7. ✓
- Status spores sendt/besvaret/forfalden; forfalden afledt ved læsning → Task 2 (`erForfalden`) + Task 6/7. ✓
- `/rapport` viser én forespørgsel ad gangen med koordinatorens evt. spørgsmål; svaret lander på tiltag-siden + i barriere-indbakken → Task 8 (svar via `upsertRapport` med `forespoergselId`; barriere-indbakke uændret). ✓
- Manuel afsendelse virker altid uanset kadence → Task 5 + Task 9 (uafhængig af kadence-værdi). ✓
- Magic-link-scope per-tovholder; `/rapport` filtrerer på `tovholderId` → Task 3 (`getAabneForespoergslerForTovholder` filtrerer på session-tovholder) + Task 8 (scope-tjek i `besvarForespoergselAction`). ✓
- Timer-trigger via pg-boss (no-op) leveres bag stub, ingen falsk automatik → "Udskudt"-sektion + `kadencePeriodeNoegle` (Task 2). ✓

**Placeholder-scan:** Ingen TBD/TODO. Alle kode-steps har fuld kode. Task 6 og Task 7-Step 2 instruerer eksplicit i at tilpasse til den faktiske `TiltagDetalje`-form (læs-og-tilpas, ikke placeholder) — begrundet, da den nøjagtige felt-rækkefølge afhænger af MERL 1-koden.

**Type-konsistens:** `IndhentningsKadence`/`ForespoergselStatus` defineres i `lib/merl/forespoergsel-status.ts` (Task 2) og genbruges i Task 7/10. `ForespoergselRow`/`AabenForespoergsel` defineres i `db/queries/forespoergsel.ts` (Task 3) og bruges i Task 6/8. `createForespoergsel`-signaturen er ens i Task 5 og Task 9. `besvarForespoergselAction(forespoergselId, _state, formData)` matcher `useActionState`-bind i Task 8. ✓
