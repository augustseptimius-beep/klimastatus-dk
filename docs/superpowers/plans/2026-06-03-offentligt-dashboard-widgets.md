# Offentligt Dashboard — Widget-system (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gør det offentlige dashboard (`/[slug]`) konfigurerbart: hver kommune sammensætter sit dashboard af widgets via en composer-UI med live preview, og fire kerne-widgets leverer rigtige visualiseringer.

**Architecture:** Widget-konfiguration gemmes som en ordnet JSONB-liste på `kommune`. Hver widget-type er et modul opdelt i `definition.ts` (klient-sikker metadata), `load.ts` (server-side data) og `Component.tsx` (visning). Den offentlige side læser listen, loader hver widgets data parallelt og renderer i et 4-kolonners grid. Composeren (admin) bruger kun definitionerne og skriver hele listen via en server action.

**Tech Stack:** Next.js 16, Drizzle ORM (postgres-js), Recharts, Vitest (mockede db-tests), React 19.

**Spec:** `docs/superpowers/specs/2026-06-03-offentligt-dashboard-widgets-design.md`

**Forudsætninger:**
- Branch: `feat/dashboard-widgets` (allerede oprettet).
- Lokal Postgres på `localhost:5432/klimastatus`.
- Hele suiten: `npm test`. Enkelt-test: `npx vitest run <sti>`.
- Admin-UI bruger Tailwind-klasser (se `app/(app)/indstillinger/page.tsx`). Det offentlige dashboard bruger inline-styles (se eksisterende `_components`). Følg det respektive mønster.

## Fil-struktur

**Delt fundament:**
- `lib/widgets/types.ts` — alle delte typer (klient-sikker, ingen imports af db/react).
- `lib/widgets/beregninger.ts` — rene beregningsfunktioner (% reduktion, år-til-mål m.m.).
- `lib/widgets/validering.ts` — sanering af widget-liste mod definitioner (ren, testbar).
- `lib/widgets/definitioner.ts` — array af alle `WidgetDefinition` (klient-sikker).
- `lib/widgets/standard-skabelon.ts` — default widget-liste.
- `lib/widgets/server-registry.ts` — map `type → { loadData, Component }` (server-only).

**Pr. widget (`lib/widgets/<type>/`):**
- `definition.ts`, `load.ts` (hvor relevant), `Component.tsx`.

**Data:**
- `db/schema/kommune.ts` — ny `publicWidgets` jsonb-kolonne.
- `db/migrations/0008_*.sql` — migration.
- `db/queries/maal.ts` — `getReduktionsMaal`.

**Offentlig side:**
- `app/(public)/[slug]/_components/widget-grid.tsx` — grid-layout.
- `app/(public)/[slug]/page.tsx` — omskrives til widget-render.

**Composer (admin):**
- `app/(app)/indstillinger/dashboard/page.tsx` — server-side data + ramme.
- `app/(app)/indstillinger/dashboard/_composer.tsx` — klient-komponent (byg + preview).
- `app/(app)/indstillinger/dashboard/actions.ts` — `updateDashboardWidgets` server action.

**Seed:**
- `db/seeds/groenkobing.ts` — sæt standard-widgets + justér reduktions-mål.

---

### Task 1: Installér Recharts + tilføj `publicWidgets`-kolonne

**Files:**
- Modify: `package.json` (via npm)
- Modify: `db/schema/kommune.ts:19-20`
- Create: `db/migrations/0008_*.sql` (genereres)
- Test: `db/schema/kommune-widgets.test.ts`

- [ ] **Step 1: Installér recharts**

Run: `npm install recharts`
Expected: `recharts` tilføjes til `dependencies` i package.json.

- [ ] **Step 2: Skriv den fejlende test**

```ts
// db/schema/kommune-widgets.test.ts
import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';

describe('kommune.public_widgets', () => {
  it('har en public_widgets jsonb-kolonne', () => {
    const cfg = getTableConfig(kommune);
    const col = cfg.columns.find((c) => c.name === 'public_widgets');
    expect(col).toBeDefined();
    expect(col?.dataType).toBe('json');
  });
});
```

- [ ] **Step 3: Kør testen og bekræft at den fejler**

Run: `npx vitest run db/schema/kommune-widgets.test.ts`
Expected: FAIL — kolonnen findes ikke.

- [ ] **Step 4: Tilføj kolonnen til schemaet**

I `db/schema/kommune.ts`: tilføj importen `jsonb` til drizzle-importen øverst:

```ts
import { pgTable, uuid, text, integer, real, date, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
```

Tilføj feltet efter `publicHighlights` (linje 19):

```ts
  publicWidgets: jsonb('public_widgets'),
```

- [ ] **Step 5: Kør testen og bekræft at den passerer**

Run: `npx vitest run db/schema/kommune-widgets.test.ts`
Expected: PASS.

- [ ] **Step 6: Generér migrationen**

Run: `npx drizzle-kit generate`
Expected: Ny fil `db/migrations/0008_*.sql` med `ALTER TABLE "kommune" ADD COLUMN "public_widgets" jsonb;`. Den er sikker (nullable, ingen backfill nødvendig).

- [ ] **Step 7: Anvend migration lokalt**

Run: `node scripts/migrate.mjs`
Expected: `[migrate] Færdig.`

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json db/schema/kommune.ts db/schema/kommune-widgets.test.ts db/migrations
git commit -m "feat: recharts + public_widgets jsonb-kolonne"
```

---

### Task 2: Delte widget-typer

**Files:**
- Create: `lib/widgets/types.ts`

- [ ] **Step 1: Opret typerne**

Ingen test — ren typedeklaration (verificeres via tsc i senere tasks).

```ts
// lib/widgets/types.ts
export type WidgetBredde = 1 | 2 | 3 | 4;

export type ConfigFelt =
  | { key: string; type: 'text'; label: string; standard: string; multiline?: boolean }
  | { key: string; type: 'number'; label: string; standard: number; min?: number; max?: number }
  | { key: string; type: 'select'; label: string; standard: string; valg: { value: string; label: string }[] }
  | {
      key: string;
      type: 'multiselect';
      label: string;
      standard: string[];
      maxValg?: number;
      kilde?: 'kommuneIndikatorer';
    };

export type WidgetDefinition = {
  type: string;
  navn: string;
  beskrivelse: string;
  ikon: string; // lucide-react ikon-navn
  tilladteBredder: WidgetBredde[];
  standardBredde: WidgetBredde;
  configFelter: ConfigFelt[];
};

export type WidgetInstans = {
  id: string;
  type: string;
  width: WidgetBredde;
  enabled: boolean;
  config: Record<string, unknown>;
};

export type WidgetProps<TData> = {
  data: TData;
  config: Record<string, unknown>;
  width: WidgetBredde;
};
```

- [ ] **Step 2: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl fra denne fil.

- [ ] **Step 3: Commit**

```bash
git add lib/widgets/types.ts
git commit -m "feat: delte widget-typer"
```

---

### Task 3: Rene beregningsfunktioner

**Files:**
- Create: `lib/widgets/beregninger.ts`
- Test: `lib/widgets/beregninger.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// lib/widgets/beregninger.test.ts
import { describe, it, expect } from 'vitest';
import { reduktionPct, aarTilMaal, aendringPct, maalProgressPct } from './beregninger';

describe('reduktionPct', () => {
  it('beregner procentvis reduktion fra baseline', () => {
    expect(reduktionPct(1000, 700)).toBeCloseTo(30);
  });
  it('returnerer negativt tal når udledning er steget', () => {
    expect(reduktionPct(1000, 1100)).toBeCloseTo(-10);
  });
  it('returnerer 0 ved baseline 0', () => {
    expect(reduktionPct(0, 500)).toBe(0);
  });
});

describe('aarTilMaal', () => {
  it('trækker nuværende år fra mål-år', () => {
    expect(aarTilMaal(2030, 2024)).toBe(6);
  });
});

describe('aendringPct', () => {
  it('beregner ændring fra forrige år', () => {
    expect(aendringPct(200, 180)).toBeCloseTo(-10);
  });
  it('returnerer null ved forrige værdi 0', () => {
    expect(aendringPct(0, 100)).toBeNull();
  });
});

describe('maalProgressPct', () => {
  it('andel af planlagt reduktion der er opnået', () => {
    // baseline 1000 → mål 400 = planlagt reduktion 600; nu 700 = opnået 300 = 50%
    expect(maalProgressPct(1000, 700, 400)).toBeCloseTo(50);
  });
  it('klamper til 0 når udledning er steget', () => {
    expect(maalProgressPct(1000, 1100, 400)).toBe(0);
  });
  it('klamper til 100 når målet er nået/overgået', () => {
    expect(maalProgressPct(1000, 300, 400)).toBe(100);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run lib/widgets/beregninger.test.ts`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Implementér beregningerne**

```ts
// lib/widgets/beregninger.ts
export function reduktionPct(baseline: number, nuvaerende: number): number {
  if (baseline === 0) return 0;
  return ((baseline - nuvaerende) / baseline) * 100;
}

export function aarTilMaal(maalAar: number, nuAar: number): number {
  return maalAar - nuAar;
}

export function aendringPct(forrige: number, nuvaerende: number): number | null {
  if (forrige === 0) return null;
  return ((nuvaerende - forrige) / forrige) * 100;
}

export function maalProgressPct(baseline: number, nuvaerende: number, maal: number): number {
  const planlagt = baseline - maal;
  if (planlagt <= 0) return 0;
  const opnaaet = baseline - nuvaerende;
  return Math.max(0, Math.min(100, (opnaaet / planlagt) * 100));
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npx vitest run lib/widgets/beregninger.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/widgets/beregninger.ts lib/widgets/beregninger.test.ts
git commit -m "feat: rene beregningsfunktioner til widgets"
```

---

### Task 4: `getReduktionsMaal`-query

**Files:**
- Create: `db/queries/maal.ts`
- Test: `db/queries/maal.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// db/queries/maal.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const where = vi.fn();
const orderBy = vi.fn();
const innerJoin = vi.fn(() => ({ where }));
const from = vi.fn(() => ({ innerJoin }));
const select = vi.fn(() => ({ from }));

vi.mock('@/db', () => ({ db: { select: (...a: unknown[]) => select(...a) } }));

import { getReduktionsMaal } from './maal';

beforeEach(() => {
  vi.clearAllMocks();
  where.mockReturnValue({ orderBy });
});

describe('getReduktionsMaal', () => {
  it('returnerer det første mål med komplette baseline/mål-felter', async () => {
    orderBy.mockResolvedValueOnce([
      { maalAar: 2030, maalVaerdi: 225000, baselineAar: 2018, baselineVaerdi: 750000, enhed: 'ton CO₂e/år' },
    ]);
    const result = await getReduktionsMaal('k1');
    expect(result).toEqual({
      maalAar: 2030, maalVaerdi: 225000, baselineAar: 2018, baselineVaerdi: 750000, enhed: 'ton CO₂e/år',
    });
  });

  it('returnerer null når intet mål har komplette felter', async () => {
    orderBy.mockResolvedValueOnce([
      { maalAar: null, maalVaerdi: null, baselineAar: null, baselineVaerdi: null, enhed: null },
    ]);
    const result = await getReduktionsMaal('k1');
    expect(result).toBeNull();
  });

  it('returnerer null når ingen mål findes', async () => {
    orderBy.mockResolvedValueOnce([]);
    expect(await getReduktionsMaal('k1')).toBeNull();
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run db/queries/maal.test.ts`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Implementér query**

```ts
// db/queries/maal.ts
import { db } from '@/db';
import { maal, indsatsOmraade } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type ReduktionsMaal = {
  maalAar: number;
  maalVaerdi: number;
  baselineAar: number;
  baselineVaerdi: number;
  enhed: string | null;
};

/** Det primære SMART-reduktionsmål for en kommune (nyeste mål-år først). */
export async function getReduktionsMaal(kommuneId: string): Promise<ReduktionsMaal | null> {
  const rows = await db
    .select({
      maalAar: maal.maalAar,
      maalVaerdi: maal.maalVaerdi,
      baselineAar: maal.baselineAar,
      baselineVaerdi: maal.baselineVaerdi,
      enhed: maal.enhed,
    })
    .from(maal)
    .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
    .where(
      and(
        eq(indsatsOmraade.kommuneId, kommuneId),
        eq(maal.kategori, 'reduction'),
        eq(maal.type, 'smart'),
      ),
    )
    .orderBy(desc(maal.maalAar));

  const v = rows.find(
    (r) => r.maalAar != null && r.maalVaerdi != null && r.baselineVaerdi != null && r.baselineAar != null,
  );
  if (!v) return null;
  return {
    maalAar: v.maalAar!,
    maalVaerdi: v.maalVaerdi!,
    baselineAar: v.baselineAar!,
    baselineVaerdi: v.baselineVaerdi!,
    enhed: v.enhed,
  };
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npx vitest run db/queries/maal.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add db/queries/maal.ts db/queries/maal.test.ts
git commit -m "feat: getReduktionsMaal-query"
```

---

### Task 5: Validering/sanering af widget-liste

**Files:**
- Create: `lib/widgets/validering.ts`
- Test: `lib/widgets/validering.test.ts`

`saneerWidgets` tager en rå liste + et map af definitioner og returnerer en valid liste: ukendte typer fjernes, bredder klampes til `tilladteBredder`, ukendte config-nøgler fjernes, manglende config får standard.

- [ ] **Step 1: Skriv den fejlende test**

```ts
// lib/widgets/validering.test.ts
import { describe, it, expect } from 'vitest';
import { saneerWidgets } from './validering';
import type { WidgetDefinition } from './types';

const defs: Record<string, WidgetDefinition> = {
  tekstblok: {
    type: 'tekstblok', navn: 'Tekst', beskrivelse: '', ikon: 'Type',
    tilladteBredder: [2, 3, 4], standardBredde: 4,
    configFelter: [{ key: 'overskrift', type: 'text', label: 'Overskrift', standard: 'Hej' }],
  },
};

describe('saneerWidgets', () => {
  it('fjerner widgets med ukendt type', () => {
    const result = saneerWidgets(
      [{ id: 'a', type: 'findes-ikke', width: 4, enabled: true, config: {} }],
      defs,
    );
    expect(result).toHaveLength(0);
  });

  it('klamper bredde til nærmeste tilladte', () => {
    const result = saneerWidgets(
      [{ id: 'a', type: 'tekstblok', width: 1, enabled: true, config: {} }],
      defs,
    );
    expect(result[0].width).toBe(2); // 1 er ikke tilladt → nærmeste tilladte (2)
  });

  it('udfylder manglende config med standard', () => {
    const result = saneerWidgets(
      [{ id: 'a', type: 'tekstblok', width: 4, enabled: true, config: {} }],
      defs,
    );
    expect(result[0].config.overskrift).toBe('Hej');
  });

  it('fjerner ukendte config-nøgler', () => {
    const result = saneerWidgets(
      [{ id: 'a', type: 'tekstblok', width: 4, enabled: true, config: { overskrift: 'X', spam: 1 } }],
      defs,
    );
    expect(result[0].config).toEqual({ overskrift: 'X' });
  });

  it('bevarer rækkefølge og enabled-flag', () => {
    const result = saneerWidgets(
      [
        { id: 'a', type: 'tekstblok', width: 4, enabled: false, config: {} },
        { id: 'b', type: 'tekstblok', width: 4, enabled: true, config: {} },
      ],
      defs,
    );
    expect(result.map((w) => w.id)).toEqual(['a', 'b']);
    expect(result[0].enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run lib/widgets/validering.test.ts`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Implementér saneringen**

```ts
// lib/widgets/validering.ts
import type { WidgetBredde, WidgetDefinition, WidgetInstans, ConfigFelt } from './types';

function naermesteBredde(oenske: number, tilladte: WidgetBredde[]): WidgetBredde {
  return [...tilladte].sort((a, b) => Math.abs(a - oenske) - Math.abs(b - oenske))[0];
}

function standardForFelt(felt: ConfigFelt): unknown {
  return felt.standard;
}

function saneerConfig(raw: unknown, felter: ConfigFelt[]): Record<string, unknown> {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const felt of felter) {
    out[felt.key] = felt.key in input ? input[felt.key] : standardForFelt(felt);
  }
  return out;
}

export function saneerWidgets(
  raw: WidgetInstans[],
  defs: Record<string, WidgetDefinition>,
): WidgetInstans[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w) => w && typeof w.type === 'string' && defs[w.type])
    .map((w) => {
      const def = defs[w.type];
      return {
        id: typeof w.id === 'string' ? w.id : crypto.randomUUID(),
        type: w.type,
        width: def.tilladteBredder.includes(w.width)
          ? w.width
          : naermesteBredde(w.width ?? def.standardBredde, def.tilladteBredder),
        enabled: w.enabled !== false,
        config: saneerConfig(w.config, def.configFelter),
      };
    });
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npx vitest run lib/widgets/validering.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/widgets/validering.ts lib/widgets/validering.test.ts
git commit -m "feat: sanering/validering af widget-liste"
```

---

### Task 6: `tekstblok`-widget (enkleste — ingen data)

**Files:**
- Create: `lib/widgets/tekstblok/definition.ts`
- Create: `lib/widgets/tekstblok/Component.tsx`

- [ ] **Step 1: Opret definition**

```ts
// lib/widgets/tekstblok/definition.ts
import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'tekstblok',
  navn: 'Tekstblok',
  beskrivelse: 'Fri introtekst — fx en velkomst eller kontekst til borgerne.',
  ikon: 'Type',
  tilladteBredder: [2, 3, 4],
  standardBredde: 4,
  configFelter: [
    { key: 'overskrift', type: 'text', label: 'Overskrift', standard: 'Om vores klimaindsats' },
    { key: 'tekst', type: 'text', label: 'Brødtekst', standard: '', multiline: true },
  ],
};
```

- [ ] **Step 2: Opret komponenten**

```tsx
// lib/widgets/tekstblok/Component.tsx
import type { WidgetProps } from '../types';

export function Component({ config }: WidgetProps<null>) {
  const overskrift = typeof config.overskrift === 'string' ? config.overskrift : '';
  const tekst = typeof config.tekst === 'string' ? config.tekst : '';
  return (
    <section style={{ borderTop: '1px solid #1A1A18', paddingTop: 16 }}>
      {overskrift && (
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          {overskrift}
        </h2>
      )}
      {tekst && (
        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#3D3D38', margin: 0, whiteSpace: 'pre-wrap' }}>
          {tekst}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl.

- [ ] **Step 4: Commit**

```bash
git add lib/widgets/tekstblok
git commit -m "feat: tekstblok-widget"
```

---

### Task 7: `noegletal`-widget

Genbruger `getPublicHighlights` fra `db/queries/public-dashboard.ts`. Config-nøgle `indikatorer` (multiselect).

**Files:**
- Create: `lib/widgets/noegletal/definition.ts`
- Create: `lib/widgets/noegletal/load.ts`
- Create: `lib/widgets/noegletal/Component.tsx`

- [ ] **Step 1: Opret definition**

```ts
// lib/widgets/noegletal/definition.ts
import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'noegletal',
  navn: 'Nøgletal',
  beskrivelse: 'Op til 5 udvalgte indikatorer med seneste værdi og udvikling.',
  ikon: 'Gauge',
  tilladteBredder: [2, 3, 4],
  standardBredde: 4,
  configFelter: [
    { key: 'indikatorer', type: 'multiselect', label: 'Vælg indikatorer', standard: [], maxValg: 5, kilde: 'kommuneIndikatorer' },
  ],
};
```

- [ ] **Step 2: Opret data-loader**

```ts
// lib/widgets/noegletal/load.ts
import { getPublicHighlights, type PublicHighlight } from '@/db/queries/public-dashboard';

export type NoegletalData = PublicHighlight[];

export async function loadData(kommuneId: string, config: Record<string, unknown>): Promise<NoegletalData> {
  const ids = Array.isArray(config.indikatorer) ? (config.indikatorer as string[]) : [];
  return getPublicHighlights(kommuneId, ids);
}
```

- [ ] **Step 3: Opret komponenten**

```tsx
// lib/widgets/noegletal/Component.tsx
import type { WidgetProps } from '../types';
import type { NoegletalData } from './load';

export function Component({ data }: WidgetProps<NoegletalData>) {
  if (data.length === 0) return null;
  return (
    <section>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16 }}>
        Nøgletal
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.length, 5)}, 1fr)`, gap: 0, borderTop: '1px solid #1A1A18' }}>
        {data.map((h, i) => (
          <div key={h.kommuneIndikatorId} style={{ padding: '16px 20px 16px 0', borderRight: i < data.length - 1 ? '1px solid #D9D2C2' : undefined, borderBottom: '1px solid #D9D2C2', paddingLeft: i > 0 ? 20 : 0 }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 6, lineHeight: 1.3 }}>{h.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {h.senesteVaerdi !== null ? (
                <>
                  {h.senesteVaerdi.toLocaleString('da-DK', { maximumFractionDigits: 1 })}
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#6B6B63', marginLeft: 4 }}>
                    {h.enhed}{h.senesteAar ? ` (${h.senesteAar})` : ''}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 16, color: '#9A9A8E' }}>Ingen data</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl.

- [ ] **Step 5: Commit**

```bash
git add lib/widgets/noegletal
git commit -m "feat: noegletal-widget"
```

---

### Task 8: `klimamaal-hero`-widget (fikser maalAar-buggen)

**Files:**
- Create: `lib/widgets/klimamaal-hero/definition.ts`
- Create: `lib/widgets/klimamaal-hero/load.ts`
- Create: `lib/widgets/klimamaal-hero/Component.tsx`

- [ ] **Step 1: Opret definition**

```ts
// lib/widgets/klimamaal-hero/definition.ts
import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'klimamaal-hero',
  navn: 'Klimamål (forside-blok)',
  beskrivelse: 'Stor forside-blok: nuværende udledning, reduktion siden baseline og fremdrift mod målet.',
  ikon: 'Target',
  tilladteBredder: [4],
  standardBredde: 4,
  configFelter: [
    { key: 'overskrift', type: 'text', label: 'Overskrift', standard: 'Klimastatus' },
  ],
};
```

- [ ] **Step 2: Opret data-loader**

`loadData` henter CO₂e-serien (klimaregnskab, total ton) + reduktionsmålet og udregner nøgletallene. Baseline tages fra målet; "nuværende" er seneste måling.

```ts
// lib/widgets/klimamaal-hero/load.ts
import { getCo2eSeries } from '@/db/queries/public-dashboard';
import { getReduktionsMaal } from '@/db/queries/maal';
import { reduktionPct, aarTilMaal, maalProgressPct } from '../beregninger';

export type HeroData = {
  kommuneNavn: string;
  nuvaerendeAar: number | null;
  nuvaerendeVaerdi: number | null;
  enhed: string | null;
  reduktionPct: number | null;
  maalAar: number | null;
  aarTilMaal: number | null;
  progressPct: number | null;
};

export async function loadData(
  kommuneId: string,
  _config: Record<string, unknown>,
  kommuneNavn: string,
  nuAar: number,
): Promise<HeroData> {
  const [serie, maal] = await Promise.all([getCo2eSeries(kommuneId), getReduktionsMaal(kommuneId)]);
  const medAar = serie.filter((d) => d.aar !== null);
  const seneste = medAar.length ? medAar[medAar.length - 1] : null;

  let red: number | null = null;
  let progress: number | null = null;
  if (maal && seneste) {
    red = reduktionPct(maal.baselineVaerdi, seneste.vaerdi);
    progress = maalProgressPct(maal.baselineVaerdi, seneste.vaerdi, maal.maalVaerdi);
  }

  return {
    kommuneNavn,
    nuvaerendeAar: seneste?.aar ?? null,
    nuvaerendeVaerdi: seneste?.vaerdi ?? null,
    enhed: maal?.enhed ?? 'ton CO₂e',
    reduktionPct: red,
    maalAar: maal?.maalAar ?? null,
    aarTilMaal: maal ? aarTilMaal(maal.maalAar, nuAar) : null,
    progressPct: progress,
  };
}
```

> Bemærk: `loadData` for denne widget har ekstra parametre (`kommuneNavn`, `nuAar`). Server-registeret (Task 11) kalder loaders med `(kommuneId, config, ctx)` hvor `ctx = { kommuneNavn, nuAar }`. Andre loaders ignorerer ctx.

- [ ] **Step 3: Opret komponenten**

```tsx
// lib/widgets/klimamaal-hero/Component.tsx
import type { WidgetProps } from '../types';
import type { HeroData } from './load';

export function Component({ data, config }: WidgetProps<HeroData>) {
  const overskrift = typeof config.overskrift === 'string' ? config.overskrift : 'Klimastatus';
  return (
    <section>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 6 }}>
        {overskrift}{data.nuvaerendeAar ? ` ${data.nuvaerendeAar}` : ''}
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 24px', lineHeight: 1.1 }}>
        {data.kommuneNavn} Kommune
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', borderTop: '2px solid #1A1A18' }}>
        <div style={{ padding: '20px 24px 20px 0', borderRight: '1px solid #D9D2C2', borderBottom: '1px solid #D9D2C2' }}>
          <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8 }}>Udledning {data.nuvaerendeAar ?? ''}</div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
            {data.nuvaerendeVaerdi !== null ? (
              <>{data.nuvaerendeVaerdi.toLocaleString('da-DK', { maximumFractionDigits: 0 })} <span style={{ fontSize: 15, fontWeight: 500, color: '#6B6B63' }}>{data.enhed}</span></>
            ) : <span style={{ fontSize: 20, color: '#9A9A8E' }}>Ingen data</span>}
          </div>
        </div>

        {data.reduktionPct !== null && (
          <div style={{ padding: '20px 24px', borderRight: '1px solid #D9D2C2', borderBottom: '1px solid #D9D2C2' }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8 }}>Reduktion siden baseline</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: data.reduktionPct >= 0 ? '#1E6B3A' : '#8B2E2E' }}>
              {data.reduktionPct >= 0 ? '−' : '+'}{Math.abs(data.reduktionPct).toFixed(1)}%
            </div>
          </div>
        )}

        {data.aarTilMaal !== null && (
          <div style={{ padding: '20px 0 20px 24px', borderBottom: '1px solid #D9D2C2' }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8 }}>År til mål ({data.maalAar})</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: '#1E6B3A' }}>{data.aarTilMaal}</div>
          </div>
        )}
      </div>

      {data.progressPct !== null && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6B63', marginBottom: 6 }}>
            <span>Fremdrift mod {data.maalAar}-målet</span>
            <span style={{ fontWeight: 600, color: '#1A1A18' }}>{data.progressPct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 10, background: '#E0D8C7', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${data.progressPct}%`, height: '100%', background: '#1E6B3A' }} />
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl.

- [ ] **Step 5: Commit**

```bash
git add lib/widgets/klimamaal-hero
git commit -m "feat: klimamaal-hero-widget med mål-progression"
```

---

### Task 9: `co2e-udvikling`-widget (Recharts-graf med målstreg)

**Files:**
- Create: `lib/widgets/co2e-udvikling/definition.ts`
- Create: `lib/widgets/co2e-udvikling/load.ts`
- Create: `lib/widgets/co2e-udvikling/Component.tsx`

- [ ] **Step 1: Opret definition**

```ts
// lib/widgets/co2e-udvikling/definition.ts
import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'co2e-udvikling',
  navn: 'CO₂e-udvikling',
  beskrivelse: 'Graf over udledningen pr. år med målstreg mod målåret.',
  ikon: 'TrendingDown',
  tilladteBredder: [2, 3, 4],
  standardBredde: 4,
  configFelter: [
    { key: 'titel', type: 'text', label: 'Titel', standard: 'Udvikling i CO₂e-udledning' },
    {
      key: 'enhed', type: 'select', label: 'Enhed', standard: 'total',
      valg: [{ value: 'total', label: 'Total (ton)' }, { value: 'per_capita', label: 'Pr. indbygger' }],
    },
  ],
};
```

- [ ] **Step 2: Opret data-loader**

Henter CO₂e-serien + befolkningstal (til per_capita) + reduktionsmål (til målstreg). Returnerer punkter + mål-info.

```ts
// lib/widgets/co2e-udvikling/load.ts
import { getCo2eSeries } from '@/db/queries/public-dashboard';
import { getReduktionsMaal } from '@/db/queries/maal';

export type Co2ePunkt = { aar: number; vaerdi: number };
export type Co2eUdviklingData = {
  punkter: Co2ePunkt[];
  enhed: 'total' | 'per_capita';
  enhedLabel: string;
  maalAar: number | null;
  maalVaerdi: number | null;
};

export async function loadData(
  kommuneId: string,
  config: Record<string, unknown>,
  ctx: { befolkningstal: number | null },
): Promise<Co2eUdviklingData> {
  const enhed = config.enhed === 'per_capita' ? 'per_capita' : 'total';
  const [serie, maal] = await Promise.all([getCo2eSeries(kommuneId), getReduktionsMaal(kommuneId)]);
  const pop = ctx.befolkningstal ?? null;

  const skala = (v: number) => (enhed === 'per_capita' && pop ? v / pop : v);
  const punkter = serie
    .filter((d): d is { aar: number; vaerdi: number } => d.aar !== null)
    .map((d) => ({ aar: d.aar, vaerdi: Number(skala(d.vaerdi).toFixed(enhed === 'per_capita' ? 2 : 0)) }));

  return {
    punkter,
    enhed,
    enhedLabel: enhed === 'per_capita' ? 'ton CO₂e/indb.' : 'ton CO₂e',
    maalAar: maal?.maalAar ?? null,
    maalVaerdi: maal ? Number(skala(maal.maalVaerdi).toFixed(enhed === 'per_capita' ? 2 : 0)) : null,
  };
}
```

- [ ] **Step 3: Opret komponenten (klient — Recharts)**

```tsx
// lib/widgets/co2e-udvikling/Component.tsx
'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import type { WidgetProps } from '../types';
import type { Co2eUdviklingData } from './load';

export function Component({ data, config }: WidgetProps<Co2eUdviklingData>) {
  const titel = typeof config.titel === 'string' ? config.titel : 'Udvikling i CO₂e-udledning';
  if (data.punkter.length === 0) {
    return (
      <section>
        <SektionsTitel titel={titel} />
        <div style={{ fontSize: 15, color: '#9A9A8E', padding: '24px 0' }}>Ingen data endnu.</div>
      </section>
    );
  }
  return (
    <section>
      <SektionsTitel titel={titel} />
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data.punkter} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#E0D8C7" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="aar" tick={{ fontSize: 12, fill: '#6B6B63' }} axisLine={{ stroke: '#D9D2C2' }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#6B6B63' }} axisLine={false} tickLine={false} width={56}
              tickFormatter={(v) => Number(v).toLocaleString('da-DK')} />
            <Tooltip
              formatter={(v: number) => [`${v.toLocaleString('da-DK')} ${data.enhedLabel}`, 'Udledning']}
              labelStyle={{ color: '#1A1A18' }} contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #D9D2C2' }} />
            {data.maalVaerdi !== null && (
              <ReferenceLine y={data.maalVaerdi} stroke="#1E6B3A" strokeDasharray="6 4"
                label={{ value: `Mål ${data.maalAar ?? ''}`, position: 'insideTopRight', fontSize: 11, fill: '#1E6B3A' }} />
            )}
            <Line type="monotone" dataKey="vaerdi" stroke="#8B2E2E" strokeWidth={2.5} dot={{ r: 3, fill: '#8B2E2E' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function SektionsTitel({ titel }: { titel: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16 }}>
      {titel}
    </div>
  );
}
```

- [ ] **Step 4: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl.

- [ ] **Step 5: Commit**

```bash
git add lib/widgets/co2e-udvikling
git commit -m "feat: co2e-udvikling-widget med målstreg (recharts)"
```

---

### Task 10: Definitioner-register + standard-skabelon

**Files:**
- Create: `lib/widgets/definitioner.ts`
- Create: `lib/widgets/standard-skabelon.ts`
- Test: `lib/widgets/definitioner.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// lib/widgets/definitioner.test.ts
import { describe, it, expect } from 'vitest';
import { DEFINITIONER, definitionListe } from './definitioner';

describe('DEFINITIONER', () => {
  it('indeholder de fire Fase 1-widgets', () => {
    expect(Object.keys(DEFINITIONER).sort()).toEqual(
      ['co2e-udvikling', 'klimamaal-hero', 'noegletal', 'tekstblok'],
    );
  });
  it('hver definitions type matcher dens nøgle', () => {
    for (const [key, def] of Object.entries(DEFINITIONER)) {
      expect(def.type).toBe(key);
      expect(def.tilladteBredder).toContain(def.standardBredde);
    }
  });
  it('definitionListe er et array af alle definitioner', () => {
    expect(definitionListe()).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run lib/widgets/definitioner.test.ts`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Opret definitioner-register**

```ts
// lib/widgets/definitioner.ts
import type { WidgetDefinition } from './types';
import { definition as klimamaalHero } from './klimamaal-hero/definition';
import { definition as co2eUdvikling } from './co2e-udvikling/definition';
import { definition as noegletal } from './noegletal/definition';
import { definition as tekstblok } from './tekstblok/definition';

export const DEFINITIONER: Record<string, WidgetDefinition> = {
  'klimamaal-hero': klimamaalHero,
  'co2e-udvikling': co2eUdvikling,
  noegletal,
  tekstblok,
};

export function definitionListe(): WidgetDefinition[] {
  return Object.values(DEFINITIONER);
}
```

- [ ] **Step 4: Opret standard-skabelon**

```ts
// lib/widgets/standard-skabelon.ts
import type { WidgetInstans } from './types';

/** Bruges når en kommune endnu ikke har konfigureret sit dashboard. */
export function standardSkabelon(): WidgetInstans[] {
  return [
    { id: 'std-hero', type: 'klimamaal-hero', width: 4, enabled: true, config: { overskrift: 'Klimastatus' } },
    { id: 'std-graf', type: 'co2e-udvikling', width: 4, enabled: true, config: { titel: 'Udvikling i CO₂e-udledning', enhed: 'total' } },
    { id: 'std-noegletal', type: 'noegletal', width: 4, enabled: true, config: { indikatorer: [] } },
  ];
}
```

- [ ] **Step 5: Kør testen og bekræft at den passerer**

Run: `npx vitest run lib/widgets/definitioner.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/widgets/definitioner.ts lib/widgets/definitioner.test.ts lib/widgets/standard-skabelon.ts
git commit -m "feat: widget-definitioner-register + standard-skabelon"
```

---

### Task 11: Server-registry (loaders + komponenter)

Server-only modul der mapper `type → { loadData?, Component }`. Importerer widget-komponenter og loaders (server-side). Kalder loaders med fælles `ctx`.

**Files:**
- Create: `lib/widgets/server-registry.ts`

- [ ] **Step 1: Opret server-registry**

```ts
// lib/widgets/server-registry.ts
import type { ComponentType } from 'react';
import type { WidgetProps } from './types';

import { loadData as heroLoad, type HeroData } from './klimamaal-hero/load';
import { Component as HeroComponent } from './klimamaal-hero/Component';
import { loadData as co2eLoad, type Co2eUdviklingData } from './co2e-udvikling/load';
import { Component as Co2eComponent } from './co2e-udvikling/Component';
import { loadData as noegletalLoad, type NoegletalData } from './noegletal/load';
import { Component as NoegletalComponent } from './noegletal/Component';
import { Component as TekstblokComponent } from './tekstblok/Component';

export type WidgetCtx = {
  kommuneNavn: string;
  nuAar: number;
  befolkningstal: number | null;
};

type ServerWidget = {
  loadData: (kommuneId: string, config: Record<string, unknown>, ctx: WidgetCtx) => Promise<unknown>;
  Component: ComponentType<WidgetProps<never>>;
};

export const SERVER_REGISTRY: Record<string, ServerWidget> = {
  'klimamaal-hero': {
    loadData: (id, cfg, ctx) => heroLoad(id, cfg, ctx.kommuneNavn, ctx.nuAar),
    Component: HeroComponent as ComponentType<WidgetProps<never>>,
  },
  'co2e-udvikling': {
    loadData: (id, cfg, ctx) => co2eLoad(id, cfg, { befolkningstal: ctx.befolkningstal }),
    Component: Co2eComponent as ComponentType<WidgetProps<never>>,
  },
  noegletal: {
    loadData: (id, cfg) => noegletalLoad(id, cfg),
    Component: NoegletalComponent as ComponentType<WidgetProps<never>>,
  },
  tekstblok: {
    loadData: async () => null,
    Component: TekstblokComponent as ComponentType<WidgetProps<never>>,
  },
};

// Eksplicit type-eksport så TData-typerne ikke pruner væk (bruges af tests/fremtidige loaders)
export type { HeroData, Co2eUdviklingData, NoegletalData };
```

- [ ] **Step 2: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add lib/widgets/server-registry.ts
git commit -m "feat: server-registry for widgets"
```

---

### Task 12: Grid-komponent

**Files:**
- Create: `app/(public)/[slug]/_components/widget-grid.tsx`
- Test: `app/(public)/[slug]/_components/widget-grid.test.tsx`

Grid'et modtager allerede-renderede widget-noder + deres bredder og placerer dem i 4-kolonners grid. Den rene mapping `bredde → span` testes.

- [ ] **Step 1: Skriv den fejlende test**

```tsx
// app/(public)/[slug]/_components/widget-grid.test.tsx
import { describe, it, expect } from 'vitest';
import { spanForBredde } from './widget-grid';

describe('spanForBredde', () => {
  it('mapper bredde til grid-column span', () => {
    expect(spanForBredde(1)).toBe('span 1');
    expect(spanForBredde(2)).toBe('span 2');
    expect(spanForBredde(4)).toBe('span 4');
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run "app/(public)/[slug]/_components/widget-grid.test.tsx"`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Opret grid-komponenten**

```tsx
// app/(public)/[slug]/_components/widget-grid.tsx
import type { ReactNode } from 'react';
import type { WidgetBredde } from '@/lib/widgets/types';

export function spanForBredde(bredde: WidgetBredde): string {
  return `span ${bredde}`;
}

export type GridItem = { id: string; bredde: WidgetBredde; node: ReactNode };

export function WidgetGrid({ items }: { items: GridItem[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 32,
        alignItems: 'start',
      }}
      className="widget-grid"
    >
      {items.map((it) => (
        <div key={it.id} style={{ gridColumn: spanForBredde(it.bredde), minWidth: 0 }} className="widget-cell">
          {it.node}
        </div>
      ))}
      <style>{`
        @media (max-width: 768px) {
          .widget-grid { grid-template-columns: 1fr !important; }
          .widget-cell { grid-column: span 1 !important; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npx vitest run "app/(public)/[slug]/_components/widget-grid.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/[slug]/_components/widget-grid.tsx" "app/(public)/[slug]/_components/widget-grid.test.tsx"
git commit -m "feat: widget-grid (4-kolonners layout)"
```

---

### Task 13: Omskriv den offentlige side til widget-render

**Files:**
- Modify: `app/(public)/[slug]/page.tsx` (erstat indhold)

- [ ] **Step 1: Erstat page.tsx**

```tsx
// app/(public)/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getKommuneBySubdomain } from '@/db/queries/kommune';
import { SERVER_REGISTRY, type WidgetCtx } from '@/lib/widgets/server-registry';
import { DEFINITIONER } from '@/lib/widgets/definitioner';
import { saneerWidgets } from '@/lib/widgets/validering';
import { standardSkabelon } from '@/lib/widgets/standard-skabelon';
import { WidgetGrid, type GridItem } from './_components/widget-grid';
import type { WidgetInstans } from '@/lib/widgets/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const kommune = await getKommuneBySubdomain(slug);
  if (!kommune?.publicEnabled) return {};
  return { title: `${kommune.navn} — Klimastatus` };
}

export default async function PublicDashboardPage({ params }: Props) {
  const { slug } = await params;
  const kommune = await getKommuneBySubdomain(slug);
  if (!kommune || !kommune.publicEnabled) notFound();

  const raw = (kommune.publicWidgets as WidgetInstans[] | null) ?? [];
  const saneret = saneerWidgets(raw, DEFINITIONER);
  const widgets = saneret.length > 0 ? saneret : standardSkabelon();

  const ctx: WidgetCtx = {
    kommuneNavn: kommune.navn,
    nuAar: new Date().getFullYear(),
    befolkningstal: kommune.befolkningstal ?? null,
  };

  const aktive = widgets.filter((w) => w.enabled);
  const items: GridItem[] = await Promise.all(
    aktive.map(async (w) => {
      const reg = SERVER_REGISTRY[w.type];
      const data = await reg.loadData(kommune.id, w.config, ctx);
      const Comp = reg.Component;
      return {
        id: w.id,
        bredde: w.width,
        node: <Comp data={data as never} config={w.config} width={w.width} />,
      };
    }),
  );

  return <WidgetGrid items={items} />;
}
```

- [ ] **Step 2: Verificér typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Manuel verifikation mod lokal DB**

```bash
node scripts/migrate.mjs
```
Start dev-server (eller brug eksisterende). Åbn `http://localhost:3000/groenkobing`.
Expected: standard-skabelonen vises (hero + graf + nøgletal). Hero viser udledning + reduktion + år-til-mål; grafen viser kurve med målstreg. (Nøgletal kan være tomt indtil seed sætter highlights — Task 14.)

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/[slug]/page.tsx"
git commit -m "feat: render offentligt dashboard via widget-system"
```

---

### Task 14: Server action til at gemme widget-listen

**Files:**
- Create: `app/(app)/indstillinger/dashboard/actions.ts`
- Test: `app/(app)/indstillinger/dashboard/actions.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// app/(app)/indstillinger/dashboard/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const set = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
const update = vi.fn(() => ({ set }));
vi.mock('@/db', () => ({ db: { update: (...a: unknown[]) => update(...a) } }));
vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }));

import { updateDashboardWidgets } from './actions';
import { verifySession } from '@/lib/dal';

beforeEach(() => vi.clearAllMocks());

describe('updateDashboardWidgets', () => {
  it('afviser uden session', async () => {
    (verifySession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateDashboardWidgets([]);
    expect(res.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('saner og gemmer widgets for kommunen', async () => {
    (verifySession as ReturnType<typeof vi.fn>).mockResolvedValue({ kommuneId: 'k1' });
    const res = await updateDashboardWidgets([
      { id: 'a', type: 'tekstblok', width: 9 as never, enabled: true, config: { overskrift: 'Hej', spam: 1 } },
      { id: 'b', type: 'ukendt', width: 4 as never, enabled: true, config: {} },
    ]);
    expect(res.ok).toBe(true);
    const gemt = set.mock.calls[0][0].publicWidgets;
    // ukendt fjernet, bredde klampet, spam fjernet
    expect(gemt).toHaveLength(1);
    expect(gemt[0].type).toBe('tekstblok');
    expect(gemt[0].config).toEqual({ overskrift: 'Hej', tekst: '' });
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npx vitest run "app/(app)/indstillinger/dashboard/actions.test.ts"`
Expected: FAIL — modul findes ikke.

- [ ] **Step 3: Implementér server action**

```ts
// app/(app)/indstillinger/dashboard/actions.ts
'use server';

import { verifySession } from '@/lib/dal';
import { db } from '@/db';
import { kommune } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { saneerWidgets } from '@/lib/widgets/validering';
import { DEFINITIONER } from '@/lib/widgets/definitioner';
import type { WidgetInstans } from '@/lib/widgets/types';

export async function updateDashboardWidgets(
  widgets: WidgetInstans[],
): Promise<{ ok: boolean; error?: string }> {
  const session = await verifySession();
  if (!session?.kommuneId) return { ok: false, error: 'Ikke autoriseret' };

  const saneret = saneerWidgets(widgets, DEFINITIONER);

  await db
    .update(kommune)
    .set({ publicWidgets: saneret, updatedAt: new Date() })
    .where(eq(kommune.id, session.kommuneId));

  return { ok: true };
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npx vitest run "app/(app)/indstillinger/dashboard/actions.test.ts"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/indstillinger/dashboard/actions.ts" "app/(app)/indstillinger/dashboard/actions.test.ts"
git commit -m "feat: updateDashboardWidgets server action"
```

---

### Task 15: Composer-UI (byg + live preview)

**Files:**
- Create: `app/(app)/indstillinger/dashboard/page.tsx`
- Create: `app/(app)/indstillinger/dashboard/_composer.tsx`

- [ ] **Step 1: Opret server-siden**

```tsx
// app/(app)/indstillinger/dashboard/page.tsx
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { getAktiveKommuneIndikatorer } from '@/db/queries/public-dashboard';
import { redirect } from 'next/navigation';
import { Composer } from './_composer';
import { definitionListe } from '@/lib/widgets/definitioner';
import { saneerWidgets } from '@/lib/widgets/validering';
import { DEFINITIONER } from '@/lib/widgets/definitioner';
import { standardSkabelon } from '@/lib/widgets/standard-skabelon';
import type { WidgetInstans } from '@/lib/widgets/types';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

export default async function DashboardComposerPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');
  const kommune = await getKommuneById(session.kommuneId);
  if (!kommune) redirect('/login');

  const indikatorer = await getAktiveKommuneIndikatorer(session.kommuneId);
  const raw = (kommune.publicWidgets as WidgetInstans[] | null) ?? [];
  const saneret = saneerWidgets(raw, DEFINITIONER);
  const initielle = saneret.length > 0 ? saneret : standardSkabelon();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Offentligt dashboard</h1>
      <p className="mb-6 text-sm text-gray-500">
        Vælg og arrangér de widgets der vises på{' '}
        <a href={`/${kommune.subdomain}`} target="_blank" rel="noopener noreferrer" className="font-mono text-green-700">
          klimastatus.dk/{kommune.subdomain}
        </a>.
      </p>
      <Composer
        subdomain={kommune.subdomain}
        initielle={initielle}
        definitioner={definitionListe()}
        indikatorer={indikatorer.map((i) => ({ value: i.id, label: `${i.label} (${i.enhed})` }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Opret composer-klientkomponenten**

```tsx
// app/(app)/indstillinger/dashboard/_composer.tsx
'use client';

import { useState, useTransition, useRef } from 'react';
import { updateDashboardWidgets } from './actions';
import type { WidgetDefinition, WidgetInstans, WidgetBredde, ConfigFelt } from '@/lib/widgets/types';

type Option = { value: string; label: string };

type Props = {
  subdomain: string;
  initielle: WidgetInstans[];
  definitioner: WidgetDefinition[];
  indikatorer: Option[];
};

export function Composer({ subdomain, initielle, definitioner, indikatorer }: Props) {
  const [widgets, setWidgets] = useState<WidgetInstans[]>(initielle);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const dragIndex = useRef<number | null>(null);
  const defMap = Object.fromEntries(definitioner.map((d) => [d.type, d]));

  function opdater(i: number, patch: Partial<WidgetInstans>) {
    setWidgets((ws) => ws.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }
  function fjern(i: number) {
    setWidgets((ws) => ws.filter((_, idx) => idx !== i));
  }
  function tilfoej(def: WidgetDefinition) {
    const config: Record<string, unknown> = {};
    for (const f of def.configFelter) config[f.key] = f.standard;
    setWidgets((ws) => [
      ...ws,
      { id: crypto.randomUUID(), type: def.type, width: def.standardBredde, enabled: true, config },
    ]);
  }
  function flyt(fra: number, til: number) {
    setWidgets((ws) => {
      const kopi = [...ws];
      const [item] = kopi.splice(fra, 1);
      kopi.splice(til, 0, item);
      return kopi;
    });
  }

  function gem() {
    startTransition(async () => {
      const res = await updateDashboardWidgets(widgets);
      setStatus(res.ok ? 'saved' : 'error');
      if (res.ok) {
        setPreviewKey((k) => k + 1);
        setTimeout(() => setStatus('idle'), 2000);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Venstre: byg */}
      <div className="flex flex-col gap-3">
        {widgets.map((w, i) => {
          const def = defMap[w.type];
          if (!def) return null;
          return (
            <div
              key={w.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== null && dragIndex.current !== i) flyt(dragIndex.current, i);
                dragIndex.current = null;
              }}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="cursor-grab text-gray-400" title="Træk for at flytte">⠿</span>
                  <span className="font-semibold text-gray-900">{def.navn}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" checked={w.enabled} onChange={(e) => opdater(i, { enabled: e.target.checked })} />
                    Vis
                  </label>
                  <button onClick={() => fjern(i)} className="text-sm text-red-700 hover:underline">Fjern</button>
                </div>
              </div>

              <p className="mt-1 text-xs text-gray-500">{def.beskrivelse}</p>

              {/* Bredde */}
              {def.tilladteBredder.length > 1 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Bredde:</span>
                  {def.tilladteBredder.map((b) => (
                    <button
                      key={b}
                      onClick={() => opdater(i, { width: b })}
                      className={`rounded border px-2 py-0.5 text-xs ${w.width === b ? 'border-green-700 bg-green-50 text-green-800' : 'border-gray-300 text-gray-600'}`}
                    >
                      {b === 4 ? 'Fuld' : b === 3 ? '¾' : b === 2 ? '½' : '¼'}
                    </button>
                  ))}
                </div>
              )}

              {/* Config-felter */}
              {def.configFelter.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {def.configFelter.map((felt) => (
                    <ConfigInput
                      key={felt.key}
                      felt={felt}
                      value={w.config[felt.key]}
                      indikatorer={indikatorer}
                      onChange={(v) => opdater(i, { config: { ...w.config, [felt.key]: v } })}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Tilføj widget */}
        <details className="rounded-lg border border-dashed border-gray-300 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-green-700">+ Tilføj widget</summary>
          <div className="mt-3 flex flex-col gap-2">
            {definitioner.map((def) => (
              <button
                key={def.type}
                onClick={() => tilfoej(def)}
                className="rounded border border-gray-200 p-2 text-left hover:bg-gray-50"
              >
                <div className="text-sm font-medium text-gray-900">{def.navn}</div>
                <div className="text-xs text-gray-500">{def.beskrivelse}</div>
              </button>
            ))}
          </div>
        </details>

        <div className="flex items-center gap-3">
          <button
            onClick={gem}
            disabled={isPending}
            className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Gemmer…' : 'Gem dashboard'}
          </button>
          {status === 'saved' && <span className="text-sm text-green-700">Gemt ✓ — preview opdateret</span>}
          {status === 'error' && <span className="text-sm text-red-700">Fejl — prøv igen</span>}
        </div>
      </div>

      {/* Højre: live preview */}
      <div className="lg:sticky lg:top-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Live preview</div>
        <div className="overflow-hidden rounded-lg border border-gray-200" style={{ height: 700 }}>
          <iframe key={previewKey} src={`/${subdomain}`} title="Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
        <p className="mt-2 text-xs text-gray-400">Previewet viser den senest gemte version.</p>
      </div>
    </div>
  );
}

function ConfigInput({
  felt,
  value,
  indikatorer,
  onChange,
}: {
  felt: ConfigFelt;
  value: unknown;
  indikatorer: Option[];
  onChange: (v: unknown) => void;
}) {
  if (felt.type === 'text') {
    return (
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {felt.label}
        {felt.multiline ? (
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
          />
        ) : (
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
          />
        )}
      </label>
    );
  }
  if (felt.type === 'select') {
    return (
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {felt.label}
        <select
          value={typeof value === 'string' ? value : felt.standard}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
        >
          {felt.valg.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
    );
  }
  if (felt.type === 'number') {
    return (
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {felt.label}
        <input
          type="number"
          value={typeof value === 'number' ? value : felt.standard}
          min={felt.min}
          max={felt.max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
        />
      </label>
    );
  }
  // multiselect (kun kilde 'kommuneIndikatorer' i Fase 1)
  const valgte = Array.isArray(value) ? (value as string[]) : [];
  const maxN = felt.maxValg ?? Infinity;
  return (
    <div className="flex flex-col gap-1 text-xs text-gray-600">
      <span>{felt.label} ({valgte.length}{felt.maxValg ? `/${felt.maxValg}` : ''})</span>
      <div className="flex flex-col gap-1">
        {indikatorer.length === 0 && <span className="text-gray-400">Ingen aktive indikatorer endnu.</span>}
        {indikatorer.map((o) => {
          const checked = valgte.includes(o.value);
          return (
            <label key={o.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && valgte.length >= maxN}
                onChange={() =>
                  onChange(checked ? valgte.filter((v) => v !== o.value) : [...valgte, o.value])
                }
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificér typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: ingen fejl.

- [ ] **Step 4: Manuel verifikation**

Log ind (augustseptimius@gmail.com). Åbn `http://localhost:3000/indstillinger/dashboard`.
Expected: Venstre viser de tre standard-widgets med bredde-vælger + config. Højre viser preview-iframe. Tilføj en tekstblok, skriv tekst, vælg nøgletal-indikatorer, træk for at omarrangere, klik Gem → preview genindlæses med ændringerne.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/indstillinger/dashboard/page.tsx" "app/(app)/indstillinger/dashboard/_composer.tsx"
git commit -m "feat: dashboard-composer UI med live preview"
```

---

### Task 16: Link fra indstillinger + seed-data

**Files:**
- Modify: `app/(app)/indstillinger/page.tsx` (tilføj link til composer)
- Modify: `db/seeds/groenkobing.ts` (standard-widgets + justeret reduktions-mål)

- [ ] **Step 1: Tilføj link i indstillinger-siden**

I `app/(app)/indstillinger/page.tsx`, tilføj efter `<PublicConfigForm ... />`-blokken (inden i samme kort eller som nyt kort):

```tsx
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Dashboard-opbygning</h2>
        <p className="mb-4 text-sm text-gray-500">Vælg og arrangér widgets på den offentlige side.</p>
        <a
          href="/indstillinger/dashboard"
          className="inline-block rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Åbn dashboard-opbygning →
        </a>
      </div>
```

- [ ] **Step 2: Justér reduktions-målet i seed til realistiske demo-værdier**

I `db/seeds/groenkobing.ts`, find `maal`-insertet (det første mål, `kategori: 'reduction'`). Sæt baseline/mål så demoen viser positiv fremdrift mod den reelle Herning-data (seneste ~657.000 ton):

```ts
        maalAar: 2030,
        maalVaerdi: 225000,
        enhed: 'ton CO₂e/år',
        baselineVaerdi: 750000,
        baselineAar: 2018,
```

(Erstat de eksisterende `maalVaerdi: 154800` / `baselineVaerdi: 516000`. Behold resten af mål-objektet. Opdatér også beskrivelsen til "70% reduktion ... fra 750.000 til 225.000 ton CO₂e/år".)

- [ ] **Step 3: Sæt standard-widgets på Grønkøbing i seed**

I `db/seeds/groenkobing.ts`, i **både** opdater-stien (eksisterende kommune) og ny-kommune-stien (`db.insert(kommune)`), sæt `publicWidgets`. Importér standard-skabelonen øverst:

```ts
import { standardSkabelon } from '../../lib/widgets/standard-skabelon';
```

I `db.insert(kommune).values({ ... })` tilføj feltet:

```ts
      publicWidgets: standardSkabelon(),
```

I `db.update(kommune).set({ ... })` (opdater-stien) tilføj ligeledes:

```ts
        publicWidgets: standardSkabelon(),
```

> Bemærk: seed sætter også nøgletal-widgetens `indikatorer` til de fundne highlight-ID'er. Efter `highlightKiIds` er beregnet (findes allerede i begge stier), erstat `noegletal`-widgetens config. Tilføj denne hjælper lige før kommune-update/insert og brug den i stedet for `standardSkabelon()`:

```ts
    const widgetsMedNoegletal = standardSkabelon().map((w) =>
      w.type === 'noegletal' ? { ...w, config: { indikatorer: highlightKiIds } } : w,
    );
```

og brug `publicWidgets: widgetsMedNoegletal` i update-stien. (I insert-stien køres koden før `highlightKiIds` findes, så brug `standardSkabelon()` der — nøgletal udfyldes ved næste seed-kørsel via update-stien, eller flyt kommune-insert efter highlight-beregningen hvis det er nemt. Vælg den enkleste korrekte variant ved implementering og notér valget.)

- [ ] **Step 4: Genopbyg kompileret seed + kør mod lokal DB**

```bash
node_modules/.bin/esbuild db/seed.ts --bundle --platform=node --format=esm --alias:@=. --external:@node-rs/argon2 --external:postgres --external:drizzle-orm --external:"drizzle-orm/*" --outfile=scripts/seed-compiled.mjs
node scripts/seed-compiled.mjs
```
Expected: kører fejlfrit; `Grønkøbing Kommune: konfiguration opdateret.`

- [ ] **Step 5: Verificér i browser**

Åbn `http://localhost:3000/groenkobing`.
Expected: Hero viser reduktion fra 750.000-baseline (positiv %), graf med målstreg ved 225.000, nøgletal udfyldt.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/indstillinger/page.tsx" db/seeds/groenkobing.ts scripts/seed-compiled.mjs
git commit -m "feat: link til composer + seed standard-widgets og justeret mål"
```

---

### Task 17: Fuld verifikation

**Files:** ingen ændringer.

- [ ] **Step 1: Hele testsuiten**

Run: `npm test`
Expected: alle tests grønne (inkl. eksisterende `public-dashboard.test.ts`).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: ingen nye fejl.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build lykkes (fanger server/klient-grænse-fejl — vigtigt da widgets blander server-loaders og klient-komponenter).

- [ ] **Step 5: Branch-status**

```bash
git log --oneline main..HEAD
git status
```
Expected: ~16 feature-commits, ren working tree.

---

## Self-Review Notes

- **Spec-dækning:** Lagring (Task 1), typer/kontrakt (Task 2, 6-11), beregninger+maal-fix (Task 3-4, 8), validering/sanering (Task 5, 14), 4 widgets (Task 6-9), register+skabelon (Task 10-11), grid (Task 12), render-flow (Task 13), composer (Task 14-15), standard-skabelon i seed + branding-fri (Task 16). Branding og Fase 2/3-widgets bevidst udeladt — matcher spec.
- **Klient/server-grænse:** definitioner og validering er rene (klient-sikre); kun `server-registry` og widget-`load.ts` rører db; recharts-komponenten er `'use client'`. `npm run build` i Task 17 verificerer grænsen.
- **Type-konsistens:** `WidgetInstans`, `WidgetDefinition`, `WidgetProps`, `WidgetCtx` bruges ens på tværs; `saneerWidgets(raw, defs)`-signaturen er ens i Task 5, 13, 14, 15.
- **Kendt afvejning:** hero-baseline tages fra `maal`, ikke fra CO₂e-serien (serien starter 2022, baseline er 2018). Derfor justeres seed-målet i Task 16 så demoen er retvisende.
