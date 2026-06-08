# Fleksible effekt-KPI'er (F3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erstat handlingers enkelte CO₂-felt med en fleksibel liste af effekt-KPI'er (kategori + værdi + enhed, med fritekst-fallback), uden at bryde eksisterende CO₂-visning.

**Architecture:** Additiv sekvens — vi tilføjer en ny `tiltag_effekt`-tabel ved siden af de gamle kolonner, migrerer alle forbrugere (formular, tabel) over, og dropper FØRST de gamle kolonner når intet refererer dem. Det holder build grønt ved hvert commit. **Eksisterende data (Grønkøbing/Thisted) er disposabel testdata** — derfor migrerer vi den ikke; seedet genskaber frisk Grønkøbing-data mod det nye schema.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM, drizzle-kit, Vitest, Tailwind/custom CSS.

**Spec:** `docs/superpowers/specs/2026-06-08-fleksible-effekt-kpier-design.md`

---

## Filer der oprettes/modificeres

| Fil | Ændring |
|-----|---------|
| `lib/tiltag/effekt-kategorier.ts` | **Ny** — kuraterede kategorier + helpers |
| `lib/tiltag/effekt-kategorier.test.ts` | **Ny** — TDD |
| `lib/tiltag/normaliser-effekter.ts` | **Ny** — ren validering/normalisering af effekt-input |
| `lib/tiltag/normaliser-effekter.test.ts` | **Ny** — TDD |
| `db/schema/tiltag.ts` | Tilføj `tiltagEffekt`-tabel; (senere) fjern 2 kolonner |
| `db/migrations/0012_*.sql` | **Ny** — opret tabel + backfill |
| `db/migrations/0013_*.sql` | **Ny** — drop gamle kolonner |
| `db/queries/tiltag.ts` | Tilføj effekt-queries; (senere) fjern `forventetEffektCo2Ton` fra `TiltagData` |
| `components/tiltag-effekt-liste.tsx` | **Ny** — dynamisk effekt-liste-klientkomponent |
| `components/tiltag-form.tsx` | Erstat CO₂-felt med effekt-liste |
| `app/(app)/k/[kommune]/tiltag/actions.ts` | Parse `effekter`-JSON, kald `setTiltagEffekter` |
| `app/(app)/k/[kommune]/tiltag/ny/page.tsx` | (ingen ekstra load — ny handling har ingen effekter endnu) |
| `app/(app)/k/[kommune]/tiltag/[id]/rediger/page.tsx` | Load eksisterende effekter, send til form |
| `app/(app)/k/[kommune]/tiltag/page.tsx` | Hent CO₂-summer batch, send til tabel |
| `app/(app)/k/[kommune]/tiltag/tiltag-table.tsx` | Brug CO₂-sum i stedet for kolonne |
| `db/seeds/groenkobing.ts` | Indsæt `tiltag_effekt`-rækker i stedet for kolonne |

---

## Task 1: Kategori-konstant

**Files:**
- Create: `lib/tiltag/effekt-kategorier.ts`
- Test: `lib/tiltag/effekt-kategorier.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/tiltag/effekt-kategorier.test.ts
import { describe, it, expect } from 'vitest';
import { EFFEKT_KATEGORIER, CO2_KATEGORI, kategoriNavn } from './effekt-kategorier';

describe('effekt-kategorier', () => {
  it('indeholder de fire startkategorier', () => {
    const keys = EFFEKT_KATEGORIER.map((k) => k.key);
    expect(keys).toEqual(['co2_reduktion', 'klimatilpasning', 'retfaerdig_fordeling', 'sidegevinst']);
  });

  it('CO2_KATEGORI peger på co2_reduktion', () => {
    expect(CO2_KATEGORI).toBe('co2_reduktion');
  });

  it('co2_reduktion har en standardenhed', () => {
    const co2 = EFFEKT_KATEGORIER.find((k) => k.key === 'co2_reduktion');
    expect(co2?.standardEnhed).toBe('ton CO₂e/år');
  });

  it('kategoriNavn slår navn op fra key', () => {
    expect(kategoriNavn('klimatilpasning')).toBe('Klimatilpasning');
  });

  it('kategoriNavn returnerer "Øvrig effekt" for null', () => {
    expect(kategoriNavn(null)).toBe('Øvrig effekt');
  });

  it('kategoriNavn returnerer key uændret for ukendt key', () => {
    expect(kategoriNavn('ukendt')).toBe('ukendt');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run lib/tiltag/effekt-kategorier.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/tiltag/effekt-kategorier.ts
export const EFFEKT_KATEGORIER = [
  { key: 'co2_reduktion',        navn: 'CO₂-reduktion',        standardEnhed: 'ton CO₂e/år' },
  { key: 'klimatilpasning',      navn: 'Klimatilpasning',      standardEnhed: '' },
  { key: 'retfaerdig_fordeling', navn: 'Retfærdig fordeling',  standardEnhed: '' },
  { key: 'sidegevinst',          navn: 'Sidegevinst',          standardEnhed: '' },
] as const;

export type EffektKategoriKey = (typeof EFFEKT_KATEGORIER)[number]['key'];

export const CO2_KATEGORI: EffektKategoriKey = 'co2_reduktion';

export function kategoriNavn(key: string | null): string {
  if (!key) return 'Øvrig effekt';
  return EFFEKT_KATEGORIER.find((k) => k.key === key)?.navn ?? key;
}

export function standardEnhedFor(key: string): string {
  return EFFEKT_KATEGORIER.find((k) => k.key === key)?.standardEnhed ?? '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run lib/tiltag/effekt-kategorier.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tiltag/effekt-kategorier.ts lib/tiltag/effekt-kategorier.test.ts
git commit -m "feat: kategori-konstant for effekt-KPI'er"
```

---

## Task 2: Effekt-validering (ren funktion)

Normaliserer rå effekt-input til gyldige rækker. Invariant: struktureret række kræver `kategori`; fritekst-række kræver `beskrivelse`; tomme rækker droppes.

**Files:**
- Create: `lib/tiltag/normaliser-effekter.ts`
- Test: `lib/tiltag/normaliser-effekter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/tiltag/normaliser-effekter.test.ts
import { describe, it, expect } from 'vitest';
import { normaliserEffekter } from './normaliser-effekter';

describe('normaliserEffekter', () => {
  it('beholder en struktureret række med kategori + værdi + enhed', () => {
    const r = normaliserEffekter([
      { kategori: 'co2_reduktion', vaerdi: 5000, enhed: 'ton CO₂e/år', beskrivelse: '' },
    ]);
    expect(r).toEqual([
      { kategori: 'co2_reduktion', vaerdi: 5000, enhed: 'ton CO₂e/år', beskrivelse: null, sortering: 0 },
    ]);
  });

  it('beholder en fritekst-række (kategori null, beskrivelse sat)', () => {
    const r = normaliserEffekter([
      { kategori: null, vaerdi: null, enhed: '', beskrivelse: 'Bedre luftkvalitet i centrum' },
    ]);
    expect(r).toEqual([
      { kategori: null, vaerdi: null, enhed: null, beskrivelse: 'Bedre luftkvalitet i centrum', sortering: 0 },
    ]);
  });

  it('dropper en helt tom række', () => {
    const r = normaliserEffekter([
      { kategori: null, vaerdi: null, enhed: '', beskrivelse: '' },
    ]);
    expect(r).toEqual([]);
  });

  it('dropper en fritekst-række uden beskrivelse', () => {
    const r = normaliserEffekter([
      { kategori: null, vaerdi: null, enhed: '', beskrivelse: '   ' },
    ]);
    expect(r).toEqual([]);
  });

  it('beholder struktureret række med kun kategori + værdi (enhed tom)', () => {
    const r = normaliserEffekter([
      { kategori: 'klimatilpasning', vaerdi: 200, enhed: '', beskrivelse: '' },
    ]);
    expect(r).toEqual([
      { kategori: 'klimatilpasning', vaerdi: 200, enhed: null, beskrivelse: null, sortering: 0 },
    ]);
  });

  it('dropper struktureret række uden hverken værdi eller enhed eller beskrivelse', () => {
    const r = normaliserEffekter([
      { kategori: 'klimatilpasning', vaerdi: null, enhed: '', beskrivelse: '' },
    ]);
    expect(r).toEqual([]);
  });

  it('tildeler sortering efter rækkefølge og bevarer den efter filtrering', () => {
    const r = normaliserEffekter([
      { kategori: 'co2_reduktion', vaerdi: 100, enhed: 't', beskrivelse: '' },
      { kategori: null, vaerdi: null, enhed: '', beskrivelse: '' }, // droppes
      { kategori: 'sidegevinst', vaerdi: null, enhed: '', beskrivelse: 'Støjreduktion' },
    ]);
    expect(r.map((e) => e.sortering)).toEqual([0, 1]);
    expect(r[1].beskrivelse).toBe('Støjreduktion');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run lib/tiltag/normaliser-effekter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/tiltag/normaliser-effekter.ts
export type RaaEffekt = {
  kategori: string | null;
  vaerdi: number | null;
  enhed: string | null;
  beskrivelse: string | null;
};

export type TiltagEffektInput = {
  kategori: string | null;
  vaerdi: number | null;
  enhed: string | null;
  beskrivelse: string | null;
  sortering: number;
};

function tom(v: string | null | undefined): boolean {
  return !v || v.trim() === '';
}

/**
 * Filtrerer og normaliserer rå effekt-rækker fra formularen.
 * - Struktureret række (kategori sat) beholdes hvis værdi ELLER enhed ELLER beskrivelse er udfyldt.
 * - Fritekst-række (kategori null) beholdes kun hvis beskrivelse er udfyldt.
 * - Tomme strenge normaliseres til null. Sortering = indeks i den filtrerede liste.
 */
export function normaliserEffekter(raa: RaaEffekt[]): TiltagEffektInput[] {
  const ud: TiltagEffektInput[] = [];
  for (const r of raa) {
    const kategori = tom(r.kategori) ? null : r.kategori!.trim();
    const enhed = tom(r.enhed) ? null : r.enhed!.trim();
    const beskrivelse = tom(r.beskrivelse) ? null : r.beskrivelse!.trim();
    const vaerdi = typeof r.vaerdi === 'number' && Number.isFinite(r.vaerdi) ? r.vaerdi : null;

    if (kategori === null) {
      // Fritekst: kræver beskrivelse
      if (beskrivelse === null) continue;
    } else {
      // Struktureret: kræver mindst ét indholdsfelt
      if (vaerdi === null && enhed === null && beskrivelse === null) continue;
    }

    ud.push({ kategori, vaerdi, enhed, beskrivelse, sortering: ud.length });
  }
  return ud;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run lib/tiltag/normaliser-effekter.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tiltag/normaliser-effekter.ts lib/tiltag/normaliser-effekter.test.ts
git commit -m "feat: ren validering/normalisering af effekt-input"
```

---

## Task 3: Schema-tabel + migration (opret) + query-lag

Tilføjer `tiltag_effekt` ved siden af de gamle kolonner — de droppes IKKE her, så build forbliver grønt. Ingen backfill: eksisterende data er disposabel testdata.

**Files:**
- Modify: `db/schema/tiltag.ts`
- Create: `db/migrations/0012_*.sql` (genereres)
- Modify: `db/queries/tiltag.ts`

- [ ] **Step 1: Tilføj tabellen til schema**

I `db/schema/tiltag.ts`, tilføj `integer` til drizzle-importen på linje 1 (den importerer i forvejen `uuid, text, real, boolean, date, timestamp, jsonb` — tilføj `integer`). Tilføj efter `tiltag`-tabellen:

```ts
export const tiltagEffekt = pgTable('tiltag_effekt', {
  id: uuid('id').primaryKey().defaultRandom(),
  tiltagId: uuid('tiltag_id').references(() => tiltag.id, { onDelete: 'cascade' }).notNull(),
  kategori: text('kategori'),
  vaerdi: real('vaerdi'),
  enhed: text('enhed'),
  beskrivelse: text('beskrivelse'),
  sortering: integer('sortering').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Generér migrationen**

Stop dev-server hvis den kører: `pkill -f "next dev" || true`
Run: `npx drizzle-kit generate`
Expected: en ny fil `db/migrations/0012_*.sql` der indeholder `CREATE TABLE "tiltag_effekt" ...`. Ingen manuel SQL tilføjes — ingen backfill (eksisterende data er disposabel testdata).

- [ ] **Step 3: Kør migrationen lokalt**

Sørg for at Docker-DB kører: `docker compose up -d db` (vent på den er klar).
Run: `npx drizzle-kit migrate`
Expected: migration 0012 kører uden fejl. Bekræft at tabellen findes:
```bash
docker compose exec -T db psql -U klimastatus -d klimastatus -c "\d tiltag_effekt"
```
Expected: kolonnerne `id, tiltag_id, kategori, vaerdi, enhed, beskrivelse, sortering, created_at` vises. (Tabellen er tom indtil seedet opdateres i Task 7 — det er forventet.)

- [ ] **Step 4: Tilføj query-funktioner**

I `db/queries/tiltag.ts`:

a) Udvid importen på linje 2 til at inkludere `tiltagEffekt`:
```ts
import { tiltag, tovholderTiltag, tiltagEffekt } from '@/db/schema';
```
b) Tilføj `sql` og `inArray` til drizzle-importen på linje 3:
```ts
import { eq, asc, and, sql, inArray } from 'drizzle-orm';
```
c) Importér input-typen øverst:
```ts
import type { TiltagEffektInput } from '@/lib/tiltag/normaliser-effekter';
```
d) Tilføj i bunden af filen:

```ts
export type TiltagEffekt = {
  id: string;
  kategori: string | null;
  vaerdi: number | null;
  enhed: string | null;
  beskrivelse: string | null;
  sortering: number;
};

export async function getTiltagEffekter(tiltagId: string): Promise<TiltagEffekt[]> {
  return db
    .select({
      id: tiltagEffekt.id,
      kategori: tiltagEffekt.kategori,
      vaerdi: tiltagEffekt.vaerdi,
      enhed: tiltagEffekt.enhed,
      beskrivelse: tiltagEffekt.beskrivelse,
      sortering: tiltagEffekt.sortering,
    })
    .from(tiltagEffekt)
    .where(eq(tiltagEffekt.tiltagId, tiltagId))
    .orderBy(asc(tiltagEffekt.sortering));
}

export async function setTiltagEffekter(tiltagId: string, effekter: TiltagEffektInput[]): Promise<void> {
  await db.delete(tiltagEffekt).where(eq(tiltagEffekt.tiltagId, tiltagId));
  if (effekter.length > 0) {
    await db.insert(tiltagEffekt).values(
      effekter.map((e) => ({
        tiltagId,
        kategori: e.kategori,
        vaerdi: e.vaerdi,
        enhed: e.enhed,
        beskrivelse: e.beskrivelse,
        sortering: e.sortering,
      })),
    );
  }
}

/** Sum af co2_reduktion-effekter pr. tiltag. Returnerer Map(tiltagId → sum). */
export async function getCo2SumForTiltag(tiltagIds: string[]): Promise<Map<string, number>> {
  if (tiltagIds.length === 0) return new Map();
  const rows = await db
    .select({
      tiltagId: tiltagEffekt.tiltagId,
      sum: sql<number>`coalesce(sum(${tiltagEffekt.vaerdi}), 0)`,
    })
    .from(tiltagEffekt)
    .where(and(eq(tiltagEffekt.kategori, 'co2_reduktion'), inArray(tiltagEffekt.tiltagId, tiltagIds)))
    .groupBy(tiltagEffekt.tiltagId);
  return new Map(rows.map((r) => [r.tiltagId, Number(r.sum)]));
}
```

- [ ] **Step 5: Typecheck + tests**

Run: `pkill -f "next dev" || true && npx tsc --noEmit`
Expected: 0 fejl (de gamle kolonner findes stadig, så intet er brudt).
Run: `npm test -- --run 2>&1 | tail -5`
Expected: alle grønne.

- [ ] **Step 6: Commit**

```bash
git add db/schema/tiltag.ts db/migrations/ db/queries/tiltag.ts
git commit -m "feat: tiltag_effekt-tabel + opret-migration + effekt-queries"
```

---

## Task 4: Effekt-liste-klientkomponent

**Files:**
- Create: `components/tiltag-effekt-liste.tsx`

- [ ] **Step 1: Opret komponenten**

```tsx
// components/tiltag-effekt-liste.tsx
'use client';
import { useState } from 'react';
import { EFFEKT_KATEGORIER, standardEnhedFor } from '@/lib/tiltag/effekt-kategorier';

export type EffektRow = {
  kategori: string | null;
  vaerdi: string;   // holdes som streng i UI
  enhed: string;
  beskrivelse: string;
};

const TOM_STRUKTURERET: EffektRow = { kategori: 'co2_reduktion', vaerdi: '', enhed: standardEnhedFor('co2_reduktion'), beskrivelse: '' };

export function TiltagEffektListe({ initielle = [] }: { initielle?: EffektRow[] }) {
  const [rows, setRows] = useState<EffektRow[]>(initielle.length > 0 ? initielle : [TOM_STRUKTURERET]);

  // Serialisér til skjult input (kun ikke-tomme felter; server normaliserer endeligt)
  const serialiseret = JSON.stringify(
    rows.map((r) => ({
      kategori: r.kategori,
      vaerdi: r.vaerdi.trim() === '' ? null : Number(r.vaerdi.replace(',', '.')),
      enhed: r.enhed,
      beskrivelse: r.beskrivelse,
    })),
  );

  function opdater(i: number, felt: Partial<EffektRow>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...felt } : r)));
  }

  function vaelgKategori(i: number, kategori: string) {
    setRows((prev) =>
      prev.map((r, j) => {
        if (j !== i) return r;
        const std = standardEnhedFor(kategori);
        return { ...r, kategori, enhed: r.enhed.trim() === '' ? std : r.enhed };
      }),
    );
  }

  function tilFritekst(i: number) {
    opdater(i, { kategori: null, vaerdi: '', enhed: '' });
  }
  function tilStruktureret(i: number) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, kategori: 'co2_reduktion', enhed: standardEnhedFor('co2_reduktion'), beskrivelse: '' } : r)));
  }

  function tilfoej() {
    setRows((prev) => [...prev, { ...TOM_STRUKTURERET }]);
  }
  function fjern(i: number) {
    setRows((prev) => (prev.length === 1 ? [{ ...TOM_STRUKTURERET }] : prev.filter((_, j) => j !== i)));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">Forventede effekter</label>
      <input type="hidden" name="effekter" value={serialiseret} />
      <div className="flex flex-col gap-3 rounded-md border border-gray-300 p-3">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            {r.kategori !== null ? (
              <>
                <div className="flex items-center gap-2">
                  <select
                    value={r.kategori}
                    onChange={(e) => vaelgKategori(i, e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {EFFEKT_KATEGORIER.map((k) => (
                      <option key={k.key} value={k.key}>{k.navn}</option>
                    ))}
                  </select>
                  <input
                    type="number" step="0.1" inputMode="decimal" placeholder="Værdi"
                    value={r.vaerdi}
                    onChange={(e) => opdater(i, { vaerdi: e.target.value })}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="text" placeholder="Enhed"
                    value={r.enhed}
                    onChange={(e) => opdater(i, { enhed: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <button type="button" onClick={() => fjern(i)} className="px-2 text-gray-400 hover:text-red-600" aria-label="Fjern effekt">×</button>
                </div>
                <button type="button" onClick={() => tilFritekst(i)} className="self-start text-xs text-gray-500 hover:text-gray-800">
                  skift til fritekst
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <textarea
                    rows={2} placeholder="Beskriv effekten"
                    value={r.beskrivelse}
                    onChange={(e) => opdater(i, { beskrivelse: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <button type="button" onClick={() => fjern(i)} className="px-2 text-gray-400 hover:text-red-600" aria-label="Fjern effekt">×</button>
                </div>
                <button type="button" onClick={() => tilStruktureret(i)} className="self-start text-xs text-gray-500 hover:text-gray-800">
                  skift til struktureret (kategori, værdi, enhed)
                </button>
              </>
            )}
          </div>
        ))}
        <button type="button" onClick={tilfoej} className="self-start rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
          + Tilføj effekt
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pkill -f "next dev" || true && npx tsc --noEmit`
Expected: 0 fejl (komponenten er endnu ikke brugt, men skal type-checke).

- [ ] **Step 3: Commit**

```bash
git add components/tiltag-effekt-liste.tsx
git commit -m "feat: dynamisk effekt-liste-komponent med nudge mod struktur"
```

---

## Task 5: Wire effekt-liste ind i formular, actions og rediger-side

Erstatter det enkelte CO₂-felt. De gamle kolonner bruges ikke længere af formularen efter dette (men findes stadig i DB).

**Files:**
- Modify: `components/tiltag-form.tsx`
- Modify: `app/(app)/k/[kommune]/tiltag/actions.ts`
- Modify: `app/(app)/k/[kommune]/tiltag/[id]/rediger/page.tsx`

- [ ] **Step 1: Udskift CO₂-feltet i `tiltag-form.tsx`**

Tilføj import øverst:
```tsx
import { TiltagEffektListe, type EffektRow } from '@/components/tiltag-effekt-liste';
```

Udvid `TiltagForm`-props med `effekter`:
```tsx
effekter?: EffektRow[];
```
(med default `= []` i destructureringen, ved siden af `selectedTovholderIds = []`).

Fjern feltet `forventetEffektCo2Ton` fra `DefaultValues`-typen (linje 12).

Erstat hele blokken med `<label htmlFor="forventetEffektCo2Ton" ...>` + dens `<input>` (linje ~131–138, "Forventet CO₂-effekt (ton/år)") med:
```tsx
<TiltagEffektListe initielle={effekter} />
```

- [ ] **Step 2: Opdater `actions.ts` til at parse effekter**

I `app/(app)/k/[kommune]/tiltag/actions.ts`:

a) Tilføj imports:
```ts
import { setTiltagEffekter } from '@/db/queries';
import { normaliserEffekter, type RaaEffekt } from '@/lib/tiltag/normaliser-effekter';
```
b) Fjern `forventetEffektCo2Ton`-linjen fra zod-`schema` (linje 18).
c) Tilføj en hjælpefunktion under `byggDato`:
```ts
function parseEffekter(formData: FormData): RaaEffekt[] {
  const raw = formData.get('effekter');
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) => ({
      kategori: typeof e?.kategori === 'string' ? e.kategori : null,
      vaerdi: typeof e?.vaerdi === 'number' ? e.vaerdi : null,
      enhed: typeof e?.enhed === 'string' ? e.enhed : null,
      beskrivelse: typeof e?.beskrivelse === 'string' ? e.beskrivelse : null,
    }));
  } catch {
    return [];
  }
}
```
d) I `createTiltagAction`, efter `setTiltagTovholdere`-blokken og FØR `redirect`:
```ts
await setTiltagEffekter(nytTiltag.id, normaliserEffekter(parseEffekter(formData)));
```
e) I `updateTiltagAction`, efter `setTiltagTovholdere`-kaldet og FØR `redirect`:
```ts
await setTiltagEffekter(id, normaliserEffekter(parseEffekter(formData)));
```

- [ ] **Step 3: Send eksisterende effekter til rediger-formularen**

I `app/(app)/k/[kommune]/tiltag/[id]/rediger/page.tsx`:

a) Udvid query-importen:
```ts
import { getTiltagById, getAllIndsatsOmraader, getAllTovholdere, getTiltagTovholdere, getTiltagEffekter } from '@/db/queries';
```
b) Tilføj `getTiltagEffekter(id)` til `Promise.all`-arrayet og modtag `effekterRaa`:
```ts
const [tiltag, indsatser, tovholdere, selectedTovholderIds, effekterRaa] = await Promise.all([
  getTiltagById(id),
  getAllIndsatsOmraader(kommune.id),
  getAllTovholdere(kommune.id),
  getTiltagTovholdere(id),
  getTiltagEffekter(id),
]);
```
c) Map til `EffektRow`-form (UI bruger strenge):
```ts
const effekter = effekterRaa.map((e) => ({
  kategori: e.kategori,
  vaerdi: e.vaerdi != null ? String(e.vaerdi) : '',
  enhed: e.enhed ?? '',
  beskrivelse: e.beskrivelse ?? '',
}));
```
d) Send `effekter={effekter}` til `<TiltagForm>`.

(Ny-siden `ny/page.tsx` kræver ingen ændring — en ny handling har ingen effekter, og formularen starter med én blank struktureret række via komponentens default.)

- [ ] **Step 4: Typecheck + tests**

Run: `pkill -f "next dev" || true && npx tsc --noEmit`
Expected: 0 fejl.
Run: `npm test -- --run 2>&1 | tail -5`
Expected: grønne.

- [ ] **Step 5: Commit**

```bash
git add components/tiltag-form.tsx app/\(app\)/k/\[kommune\]/tiltag/actions.ts app/\(app\)/k/\[kommune\]/tiltag/\[id\]/rediger/page.tsx
git commit -m "feat: effekt-liste i tiltagsformular + gem/indlæs effekter"
```

---

## Task 6: Tabel viser CO₂-sum fra effekter

**Files:**
- Modify: `app/(app)/k/[kommune]/tiltag/page.tsx`
- Modify: `app/(app)/k/[kommune]/tiltag/tiltag-table.tsx`

- [ ] **Step 1: Hent CO₂-summer i tabel-siden**

I `app/(app)/k/[kommune]/tiltag/page.tsx`:

a) Udvid importen:
```ts
import { getAllTiltag, getAllIndsatsOmraader, getCo2SumForTiltag } from '@/db/queries';
```
b) Efter `Promise.all`, hent summerne og berig listen:
```ts
const co2Sum = await getCo2SumForTiltag(allTiltag.map((t) => t.id));
const tiltagMedCo2 = allTiltag.map((t) => ({ ...t, forventetEffektCo2Ton: co2Sum.get(t.id) ?? null }));
```
c) Send `tiltag={tiltagMedCo2}` til `<TiltagTable>` i stedet for `allTiltag`.

(Bemærk: `tiltag-table.tsx`'s `Tiltag`-type beholder feltet `forventetEffektCo2Ton: number | null` — vi udfylder det nu fra summen i stedet for fra kolonnen. Ingen ændring i tabellens egen kode er nødvendig, da feltnavnet er uændret. Hvis tsc klager over at `allTiltag`-rækkerne ikke længere har feltet efter Task 7, er det netop derfor vi beriger her.)

- [ ] **Step 2: Typecheck + tests**

Run: `pkill -f "next dev" || true && npx tsc --noEmit`
Expected: 0 fejl.
Run: `npm test -- --run 2>&1 | tail -5`
Expected: grønne.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/k/\[kommune\]/tiltag/page.tsx
git commit -m "feat: tiltag-tabel viser CO₂-sum fra effekter"
```

---

## Task 7: Drop gamle kolonner + opdater seed

Nu refererer intet de gamle kolonner. Vi dropper dem og retter seed + `TiltagData`.

**Files:**
- Modify: `db/schema/tiltag.ts`
- Create: `db/migrations/0013_*.sql`
- Modify: `db/queries/tiltag.ts`
- Modify: `db/seeds/groenkobing.ts`

- [ ] **Step 1: Fjern kolonnerne fra schema**

I `db/schema/tiltag.ts`, slet de to linjer:
```ts
forventetEffektCo2Ton: real('forventet_effekt_co2_ton'),
forventetEffektKvalitativ: text('forventet_effekt_kvalitativ'),
```

- [ ] **Step 2: Fjern `forventetEffektCo2Ton` fra `TiltagData`**

I `db/queries/tiltag.ts`, slet linjen `forventetEffektCo2Ton?: number;` fra `TiltagData`-typen (linje 14).

- [ ] **Step 3: Opdater seed til at indsætte effekt-rækker**

I `db/seeds/groenkobing.ts`:

a) Sørg for at `tiltagEffekt` er importeret fra schema (tilføj til den eksisterende schema-import, ved siden af `tiltag`).

b) **Behold CO₂-værdierne — flyt dem bare ud af insert.** I `db.insert(tiltag).values([...])`-arrayet: omdøb hver `forventetEffektCo2Ton: <tal>,` til `_co2: <tal>,` (samme værdi, ny nøgle). Tildel arrayet til en `const tiltagSeed` i stedet for at give det inline til `.insert()`. Konkret, ændr:
```ts
const insertedTiltag = await db.insert(tiltag).values([
  { /* ...felter... */ forventetEffektCo2Ton: 42000, /* ... */ },
  // ...
]).returning();
```
til:
```ts
const tiltagSeed = [
  { /* ...felter... */ _co2: 42000, /* ... */ },
  // ...
];
const co2ByTitel = new Map(
  tiltagSeed.filter((t) => t._co2 != null).map((t) => [t.titel, t._co2 as number]),
);
const insertedTiltag = await db
  .insert(tiltag)
  .values(tiltagSeed.map(({ _co2, ...rest }) => rest))
  .returning();
```
`_co2` strippes via destructurering før insert, så den typede drizzle-insert aldrig ser nøglen. Matchning sker på `titel` (unik i seed), ikke på rækkefølge — robust mod RETURNING-orden. Du beholder altså alle de eksisterende tal præcis hvor de står; du omdøber kun nøglen.

c) Efter `insertedTiltag` er hentet, tilføj:
```ts
const effektRows = insertedTiltag
  .filter((t) => co2ByTitel.has(t.titel))
  .map((t) => ({
    tiltagId: t.id,
    kategori: 'co2_reduktion',
    vaerdi: co2ByTitel.get(t.titel)!,
    enhed: 'ton CO₂e/år',
    sortering: 0,
  }));
if (effektRows.length > 0) await db.insert(tiltagEffekt).values(effektRows);
```

- [ ] **Step 4: Generér drop-migrationen**

Run: `pkill -f "next dev" || true && npx drizzle-kit generate`
Expected: ny fil `db/migrations/0013_*.sql` med `ALTER TABLE "tiltag" DROP COLUMN ...` for de to kolonner.

- [ ] **Step 5: Kør migration + re-seed lokalt og verificér**

```bash
docker compose up -d db
npx drizzle-kit migrate
```
Expected: 0013 kører uden fejl (drop af de to kolonner; ingen data at bevare).

Verificér at det opdaterede seed populerer `tiltag_effekt` korrekt. Da eksisterende data er disposabel, kan du roligt nulstille den lokale DB hvis seedet konflikter (`docker compose down -v && docker compose up -d db && npx drizzle-kit migrate`). Kør derefter projektets seed-kommando (fx `npx tsx run-seed.mts`) og tjek:
```bash
docker compose exec -T db psql -U klimastatus -d klimastatus -c "SELECT COUNT(*) FROM tiltag_effekt WHERE kategori='co2_reduktion';"
```
Expected: antal > 0 (svarer til antallet af seed-handlinger med CO₂).

- [ ] **Step 6: Typecheck + tests**

Run: `pkill -f "next dev" || true && npx tsc --noEmit`
Expected: 0 fejl — intet refererer de droppede kolonner længere.
Run: `npm test -- --run 2>&1 | tail -5`
Expected: grønne.

- [ ] **Step 7: Commit**

```bash
git add db/schema/tiltag.ts db/migrations/ db/queries/tiltag.ts db/seeds/groenkobing.ts
git commit -m "feat: drop gamle effekt-kolonner + seed via tiltag_effekt"
```

---

## Task 8: Manuel verifikation + push

- [ ] **Step 1: Kør appen lokalt og test flowet**

```bash
npm run dev
```
I browseren (efter login på Grønkøbing):
- Åbn en eksisterende handling under Handlingsoverblik → Rediger. Bekræft at dens CO₂-effekt vises som en `co2_reduktion`-række i effekt-listen.
- Tilføj en `klimatilpasning`-effekt (fx 200 / "husstande") og en fritekst-effekt. Gem.
- Bekræft at Handlingsoverblik-tabellen stadig viser CO₂-tallet korrekt.
- Opret en ny handling med to `co2_reduktion`-effekter og bekræft at tabellen viser deres sum.

- [ ] **Step 2: Fuld suite + lint**

```bash
pkill -f "next dev" || true
npm test -- --run
npx tsc --noEmit
npm run lint
```
Expected: alle grønne (lint må have den ene præeksisterende `XLSX`-advarsel, 0 errors).

- [ ] **Step 3: Push**

```bash
git push
```
Auto-deploy udløses. Migrationerne 0012 (opret tabel) og 0013 (drop kolonner) kører i rækkefølge ved container-opstart. Der er ingen data-migration — det opdaterede seed genskaber Grønkøbing-data med `tiltag_effekt`-rækker mod det nye schema.

---

## Uden for scope (jf. spec)

- Dashboard-aggregering af CO₂ på tværs af handlinger (modellen er forberedt via `getCo2SumForTiltag`).
- Opfølgning/måling på forventede effekter (dækket af indikator-koblingen fra F2).
- Admin-UI til kategorilisten (konstanten redigeres i kode indtil behov).
