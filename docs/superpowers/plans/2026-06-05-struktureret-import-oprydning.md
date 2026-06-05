# Oprydning + Struktureret Excel/CSV-import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (Trin 0) Fjern 5 tomme macOS-sync-junk-mapper. (Trin 2) Tilføj en deterministisk import af handlingskatalog fra udfyldt Excel/CSV-skabelon — uden AI — der genbruger den eksisterende `bulkImportAction`-persistering.

**Architecture:** En ren, unit-testet parser (`lib/import/`) omdanner regneark-rækker til den eksisterende `ImportIndsats[]`-form. En tynd server action læser filen med `xlsx` (allerede dependency) og kalder parseren; en ny side viser forhåndsvisning med advarsler og genbruger den eksisterende `bulkImportAction` til selve oprettelsen. Den eksisterende AI-PDF-import røres ikke. Ingen schema-ændring — fuldt additivt.

**Tech Stack:** Next.js 16 (Server Components + Server Actions + Route Handlers), Drizzle ORM, `xlsx` ^0.18.5, TypeScript, Vitest ^4.1.5 (`npm test` = `vitest run`).

**Scope-afgrænsning (bevidst UDE):** Trin 1 (baseline-note — bruger skriver selv), Trin 3 (kør ægte løkke — bruger-aktivitet), Trin 4 (byg fra friktionsliste) jf. spec `docs/superpowers/specs/2026-06-05-thisted-driftsloekke-design.md` (validér-så-byg).

---

## File Map

| Fil | Handling | Ansvar |
|-----|----------|--------|
| `lib/widgets/* 2`, `app/(app)/k/[kommune] 2` (5 tomme mapper) | Delete | Fjern sync-junk |
| `lib/import/types.ts` | Create | Delte typer `ImportIndsats`, `ImportHandling` (udtrukket fra AI-importer) |
| `app/(app)/k/[kommune]/indsatser/importer/actions.ts` | Modify | Importér typer fra `@/lib/import/types` i stedet for lokale defs |
| `lib/import/handlingskatalog-skabelon.ts` | Create | Kolonne-spec, header-/enum-aliaser, CSV-skabelon-bygger |
| `lib/import/handlingskatalog-skabelon.test.ts` | Create | Vitest for normalisering + skabelon |
| `lib/import/parse-handlingskatalog.ts` | Create | Ren parser: rækker → `{ indsatser, advarsler }` |
| `lib/import/parse-handlingskatalog.test.ts` | Create | Vitest for parser |
| `app/(app)/k/[kommune]/indsatser/importer-skabelon/actions.ts` | Create | Server action: læs fil → parse → preview (ingen DB-skrivning) |
| `app/api/skabelon/handlingskatalog/route.ts` | Create | GET: download CSV-skabelon |
| `app/(app)/k/[kommune]/indsatser/importer-skabelon/skabelon-importer-client.tsx` | Create | Upload → preview m. advarsler → bekræft → `bulkImportAction` |
| `app/(app)/k/[kommune]/indsatser/importer-skabelon/page.tsx` | Create | Server-shell m. auth-guard |
| `app/(app)/k/[kommune]/indsatser/page.tsx` | Modify | Entry-links til skabelon-import + skabelon-download |

---

## Task 1: Trin 0 — Slet sync-junk-mapper

**Files:**
- Delete: `lib/widgets/co2e-udvikling 2`, `lib/widgets/klimamaal-hero 2`, `lib/widgets/noegletal 2`, `lib/widgets/tekstblok 2`, `app/(app)/k/[kommune] 2`

- [ ] **Step 1: Bekræft at mapperne er tomme og ikke git-trackede**

Run: `git ls-files | grep -c " 2/" ; echo "---" ; find "lib/widgets/co2e-udvikling 2" "lib/widgets/klimamaal-hero 2" "lib/widgets/noegletal 2" "lib/widgets/tekstblok 2" "app/(app)/k/[kommune] 2" -type f 2>/dev/null | wc -l`
Expected: `0` (ingen trackede) og `0` (ingen filer). Hvis tal > 0 — STOP, mapperne indeholder indhold; undersøg før sletning.

- [ ] **Step 2: Slet de tomme mapper**

```bash
rmdir "lib/widgets/co2e-udvikling 2" "lib/widgets/klimamaal-hero 2" "lib/widgets/noegletal 2" "lib/widgets/tekstblok 2" "app/(app)/k/[kommune] 2"
```

- [ ] **Step 3: Bekræft de er væk og at behold-redirects stadig findes**

Run: `ls -d "app/(app)/k/[kommune] 2" 2>/dev/null ; ls "app/(app)/dashboard/page.tsx" "app/(app)/indstillinger/page.tsx"`
Expected: første kommando giver intet (mappen væk); de to redirect-filer listes (bevaret).

- [ ] **Step 4: Ingen commit**

Mapperne var tomme og ikke git-trackede, så `git status` er uændret — der er intet at committe. Dette trin er bevidst tomt.

---

## Task 2: Udtræk delte import-typer (refaktor)

**Files:**
- Create: `lib/import/types.ts`
- Modify: `app/(app)/k/[kommune]/indsatser/importer/actions.ts`

- [ ] **Step 1: Opret `lib/import/types.ts`**

```ts
// Delte typer for import af handlingskatalog. Bruges af både AI-importen
// og den strukturerede skabelon-import. Matcher kolonnerne i bulkImportAction.

export type ImportHandling = {
  titel: string;
  type: 'reduction' | 'adaptation' | 'both';
  status: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  beskrivelse?: string;
};

export type ImportIndsats = {
  navn: string;
  type: 'ghg_reduction' | 'adaptation' | 'consumption' | 'just_transition' | 'cross_cutting';
  sektor: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  beskrivelse?: string;
  handlinger: ImportHandling[];
};
```

- [ ] **Step 2: Erstat de lokale typedefs i AI-importerens `actions.ts`**

I `app/(app)/k/[kommune]/indsatser/importer/actions.ts`: fjern de to lokale `type ImportHandling = {...}` og `type ImportIndsats = {...}` blokke (linje ~8-21) og tilføj i stedet en import øverst (efter `'use server';`):

```ts
import type { ImportIndsats } from '@/lib/import/types';
```

(Kun `ImportIndsats` bruges direkte i filen — `ImportHandling` indgår via `ImportIndsats.handlinger`.)

- [ ] **Step 3: Verificér typecheck — ingen regression i AI-importeren**

Run: `npx tsc --noEmit 2>&1 | grep -E "import/types|importer/actions" || echo "OK"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add lib/import/types.ts "app/(app)/k/[kommune]/indsatser/importer/actions.ts"
git commit -m "refactor: udtræk delte import-typer til lib/import/types"
```

---

## Task 3: Skabelon — kolonne-spec, aliaser og CSV-bygger (TDD)

**Files:**
- Create: `lib/import/handlingskatalog-skabelon.ts`
- Test: `lib/import/handlingskatalog-skabelon.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// lib/import/handlingskatalog-skabelon.test.ts
import { describe, it, expect } from 'vitest';
import {
  normaliserHeader,
  INDSATS_TYPE_ALIAS,
  SEKTOR_ALIAS,
  TILTAG_TYPE_ALIAS,
  TILTAG_STATUS_ALIAS,
  byggSkabelonCsv,
  SKABELON_KOLONNER,
} from './handlingskatalog-skabelon';

describe('normaliserHeader', () => {
  it('genkender danske overskrifter uanset store/små bogstaver og mellemrum', () => {
    expect(normaliserHeader('Indsatsområde')).toBe('indsatsomraade');
    expect(normaliserHeader('  TILTAG-TITEL ')).toBe('tiltag_titel');
    expect(normaliserHeader('Status')).toBe('tiltag_status');
    expect(normaliserHeader('Sektor')).toBe('sektor');
  });
  it('returnerer null for ukendte overskrifter', () => {
    expect(normaliserHeader('Pris i kroner')).toBeNull();
  });
});

describe('enum-aliaser', () => {
  it('oversætter danske labels til enum-værdier', () => {
    expect(INDSATS_TYPE_ALIAS['drivhusgasreduktion']).toBe('ghg_reduction');
    expect(SEKTOR_ALIAS['bygninger']).toBe('buildings');
    expect(TILTAG_TYPE_ALIAS['reduktion']).toBe('reduction');
    expect(TILTAG_STATUS_ALIAS['igangværende']).toBe('in_progress');
  });
  it('accepterer også de rå enum-værdier', () => {
    expect(TILTAG_STATUS_ALIAS['completed']).toBe('completed');
    expect(SEKTOR_ALIAS['energy']).toBe('energy');
  });
});

describe('byggSkabelonCsv', () => {
  it('starter med overskriftsrækken i defineret rækkefølge', () => {
    const csv = byggSkabelonCsv();
    const førsteLinje = csv.split('\n')[0];
    expect(førsteLinje).toBe(SKABELON_KOLONNER.map((k) => k.overskrift).join(','));
  });
  it('indeholder mindst én eksempel-række', () => {
    expect(byggSkabelonCsv().split('\n').length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Kør testen og verificér FAIL**

Run: `npx vitest run lib/import/handlingskatalog-skabelon.test.ts 2>&1 | tail -5`
Expected: FAIL — "Cannot find module './handlingskatalog-skabelon'"

- [ ] **Step 3: Opret `lib/import/handlingskatalog-skabelon.ts`**

```ts
import type { ImportIndsats, ImportHandling } from './types';

/** Kanoniske kolonne-nøgler i skabelonen. */
export type KolonneNoegle =
  | 'indsatsomraade' | 'indsats_type' | 'sektor' | 'indsats_beskrivelse'
  | 'tiltag_titel' | 'tiltag_type' | 'tiltag_status' | 'tiltag_beskrivelse';

/** Synlige danske overskrifter i skabelon-filen (rækkefølge bevares i CSV'en). */
export const SKABELON_KOLONNER: { noegle: KolonneNoegle; overskrift: string; paakraevet: boolean }[] = [
  { noegle: 'indsatsomraade',      overskrift: 'Indsatsområde',       paakraevet: true },
  { noegle: 'indsats_type',        overskrift: 'Indsats-type',        paakraevet: true },
  { noegle: 'sektor',              overskrift: 'Sektor',              paakraevet: true },
  { noegle: 'indsats_beskrivelse', overskrift: 'Indsats-beskrivelse', paakraevet: false },
  { noegle: 'tiltag_titel',        overskrift: 'Tiltag-titel',        paakraevet: true },
  { noegle: 'tiltag_type',         overskrift: 'Tiltag-type',         paakraevet: true },
  { noegle: 'tiltag_status',       overskrift: 'Tiltag-status',       paakraevet: true },
  { noegle: 'tiltag_beskrivelse',  overskrift: 'Tiltag-beskrivelse',  paakraevet: false },
];

// Header-aliaser → kanonisk nøgle. Nøgler er normaliserede (lowercase, trimmet).
// Bevidst INGEN bar 'beskrivelse'-alias — den er tvetydig (indsats vs tiltag).
const HEADER_ALIAS: Record<string, KolonneNoegle> = {
  'indsatsområde': 'indsatsomraade', 'indsatsomraade': 'indsatsomraade', 'indsatsområde-navn': 'indsatsomraade',
  'indsats-type': 'indsats_type', 'indsatstype': 'indsats_type',
  'sektor': 'sektor',
  'indsats-beskrivelse': 'indsats_beskrivelse',
  'tiltag-titel': 'tiltag_titel', 'tiltag': 'tiltag_titel', 'handling': 'tiltag_titel', 'handling-titel': 'tiltag_titel',
  'tiltag-type': 'tiltag_type', 'handling-type': 'tiltag_type',
  'tiltag-status': 'tiltag_status', 'status': 'tiltag_status',
  'tiltag-beskrivelse': 'tiltag_beskrivelse',
};

export function normaliserHeader(raw: string): KolonneNoegle | null {
  return HEADER_ALIAS[raw.trim().toLowerCase()] ?? null;
}

export const INDSATS_TYPE_ALIAS: Record<string, ImportIndsats['type']> = {
  'drivhusgasreduktion': 'ghg_reduction', 'ghg_reduction': 'ghg_reduction', 'reduktion': 'ghg_reduction',
  'klimatilpasning': 'adaptation', 'adaptation': 'adaptation', 'tilpasning': 'adaptation',
  'forbrug': 'consumption', 'consumption': 'consumption',
  'retfærdig omstilling': 'just_transition', 'just_transition': 'just_transition',
  'tværgående': 'cross_cutting', 'cross_cutting': 'cross_cutting',
};

export const SEKTOR_ALIAS: Record<string, ImportIndsats['sektor']> = {
  'energi': 'energy', 'energy': 'energy',
  'transport': 'transport',
  'bygninger': 'buildings', 'buildings': 'buildings',
  'fødevarer': 'food', 'food': 'food',
  'landbrug': 'agriculture', 'agriculture': 'agriculture',
  'affald': 'waste', 'waste': 'waste',
  'klimatilpasning': 'adaptation', 'adaptation': 'adaptation',
  'andet': 'other', 'other': 'other',
};

export const TILTAG_TYPE_ALIAS: Record<string, ImportHandling['type']> = {
  'reduktion': 'reduction', 'reduction': 'reduction',
  'tilpasning': 'adaptation', 'adaptation': 'adaptation',
  'begge': 'both', 'both': 'both',
};

export const TILTAG_STATUS_ALIAS: Record<string, ImportHandling['status']> = {
  'planlagt': 'planned', 'planned': 'planned',
  'igangværende': 'in_progress', 'igangsat': 'in_progress', 'in_progress': 'in_progress',
  'gennemført': 'completed', 'completed': 'completed', 'færdig': 'completed',
  'udgået': 'discontinued', 'discontinued': 'discontinued',
};

/** Bygger en CSV-skabelon med overskrifter + to udfyldte eksempel-rækker. */
export function byggSkabelonCsv(): string {
  const header = SKABELON_KOLONNER.map((k) => k.overskrift);
  const eksempel1 = [
    'Energirenovering af kommunale bygninger', 'Drivhusgasreduktion', 'Bygninger',
    'Reduktion af energiforbrug i kommunens ejendomme',
    'Efterisolering af rådhuset', 'Reduktion', 'Igangværende', 'Loft og facade efterisoleres i 2026',
  ];
  const eksempel2 = [
    'Energirenovering af kommunale bygninger', 'Drivhusgasreduktion', 'Bygninger', '',
    'Solceller på skoletage', 'Reduktion', 'Planlagt', '',
  ];
  const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [header, eksempel1, eksempel2].map((r) => r.map(esc).join(',')).join('\n');
}
```

- [ ] **Step 4: Kør testen og verificér PASS**

Run: `npx vitest run lib/import/handlingskatalog-skabelon.test.ts 2>&1 | tail -5`
Expected: `Tests  6 passed (6)` (eller tilsvarende — alle passerer).

- [ ] **Step 5: Commit**

```bash
git add lib/import/handlingskatalog-skabelon.ts lib/import/handlingskatalog-skabelon.test.ts
git commit -m "feat: skabelon-spec for struktureret handlingskatalog-import"
```

---

## Task 4: Parser — rækker → indsatser + advarsler (TDD)

**Files:**
- Create: `lib/import/parse-handlingskatalog.ts`
- Test: `lib/import/parse-handlingskatalog.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// lib/import/parse-handlingskatalog.test.ts
import { describe, it, expect } from 'vitest';
import { parseHandlingskatalog } from './parse-handlingskatalog';

const r = (o: Record<string, string>) => o;

describe('parseHandlingskatalog', () => {
  it('grupperer rækker med samme indsatsområde til ét område med flere handlinger', () => {
    const { indsatser, advarsler } = parseHandlingskatalog([
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Energi', 'Tiltag-titel': 'Solceller', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Planlagt' }),
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Energi', 'Tiltag-titel': 'Efterisolering', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Igangværende' }),
    ]);
    expect(advarsler).toHaveLength(0);
    expect(indsatser).toHaveLength(1);
    expect(indsatser[0]).toMatchObject({ navn: 'Energi', type: 'ghg_reduction', sektor: 'energy' });
    expect(indsatser[0].handlinger).toHaveLength(2);
    expect(indsatser[0].handlinger[1]).toMatchObject({ titel: 'Efterisolering', status: 'in_progress' });
  });

  it('springer helt tomme rækker over uden advarsel', () => {
    const { indsatser, advarsler } = parseHandlingskatalog([
      r({ 'Indsatsområde': '', 'Tiltag-titel': '' }),
    ]);
    expect(indsatser).toHaveLength(0);
    expect(advarsler).toHaveLength(0);
  });

  it('advarer og springer over ved manglende påkrævet felt', () => {
    const { indsatser, advarsler } = parseHandlingskatalog([
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Energi', 'Tiltag-titel': '', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Planlagt' }),
    ]);
    expect(indsatser).toHaveLength(0);
    expect(advarsler[0]).toContain('tiltag-titel');
  });

  it('advarer og springer over ved ukendt enum-værdi', () => {
    const { advarsler } = parseHandlingskatalog([
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Rumfart', 'Tiltag-titel': 'X', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Planlagt' }),
    ]);
    expect(advarsler[0]).toContain('sektor');
  });

  it('tager indsats-beskrivelse og tiltag-beskrivelse med når de findes', () => {
    const { indsatser } = parseHandlingskatalog([
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Energi', 'Indsats-beskrivelse': 'Tema', 'Tiltag-titel': 'Solceller', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Planlagt', 'Tiltag-beskrivelse': 'På tage' }),
    ]);
    expect(indsatser[0].beskrivelse).toBe('Tema');
    expect(indsatser[0].handlinger[0].beskrivelse).toBe('På tage');
  });
});
```

- [ ] **Step 2: Kør testen og verificér FAIL**

Run: `npx vitest run lib/import/parse-handlingskatalog.test.ts 2>&1 | tail -5`
Expected: FAIL — "Cannot find module './parse-handlingskatalog'"

- [ ] **Step 3: Opret `lib/import/parse-handlingskatalog.ts`**

```ts
import type { ImportIndsats, ImportHandling } from './types';
import {
  normaliserHeader,
  INDSATS_TYPE_ALIAS, SEKTOR_ALIAS, TILTAG_TYPE_ALIAS, TILTAG_STATUS_ALIAS,
  type KolonneNoegle,
} from './handlingskatalog-skabelon';

export type ParseResultat = { indsatser: ImportIndsats[]; advarsler: string[] };

/**
 * Omdanner regneark-rækker (keyet på rå overskrifter) til indsatsområder med
 * nestede handlinger. Rækker grupperes på indsatsområde-navn. Ugyldige rækker
 * springes over med en menneskelæsbar advarsel — aldrig stiltiende datatab.
 */
export function parseHandlingskatalog(raekker: Record<string, string>[]): ParseResultat {
  const advarsler: string[] = [];
  const grupper = new Map<string, ImportIndsats>();

  raekker.forEach((raw, i) => {
    const linje = i + 2; // header er linje 1; data 1-indekseret fra linje 2

    const c: Partial<Record<KolonneNoegle, string>> = {};
    for (const [header, val] of Object.entries(raw)) {
      const noegle = normaliserHeader(header);
      if (noegle) c[noegle] = (val ?? '').toString().trim();
    }

    if (!Object.values(c).some((v) => v && v.length > 0)) return; // helt tom række

    const indsatsNavn = c.indsatsomraade ?? '';
    const tiltagTitel = c.tiltag_titel ?? '';
    if (!indsatsNavn) { advarsler.push(`Linje ${linje}: mangler indsatsområde — sprunget over`); return; }
    if (!tiltagTitel) { advarsler.push(`Linje ${linje}: mangler tiltag-titel — sprunget over`); return; }

    const iType = INDSATS_TYPE_ALIAS[(c.indsats_type ?? '').toLowerCase()];
    const sektor = SEKTOR_ALIAS[(c.sektor ?? '').toLowerCase()];
    const tType = TILTAG_TYPE_ALIAS[(c.tiltag_type ?? '').toLowerCase()];
    const tStatus = TILTAG_STATUS_ALIAS[(c.tiltag_status ?? '').toLowerCase()];
    if (!iType)   { advarsler.push(`Linje ${linje}: ukendt indsats-type "${c.indsats_type ?? ''}" — sprunget over`); return; }
    if (!sektor)  { advarsler.push(`Linje ${linje}: ukendt sektor "${c.sektor ?? ''}" — sprunget over`); return; }
    if (!tType)   { advarsler.push(`Linje ${linje}: ukendt tiltag-type "${c.tiltag_type ?? ''}" — sprunget over`); return; }
    if (!tStatus) { advarsler.push(`Linje ${linje}: ukendt tiltag-status "${c.tiltag_status ?? ''}" — sprunget over`); return; }

    let gruppe = grupper.get(indsatsNavn);
    if (!gruppe) {
      gruppe = {
        navn: indsatsNavn, type: iType, sektor,
        beskrivelse: c.indsats_beskrivelse || undefined,
        handlinger: [],
      };
      grupper.set(indsatsNavn, gruppe);
    } else if (gruppe.type !== iType || gruppe.sektor !== sektor) {
      advarsler.push(`Linje ${linje}: "${indsatsNavn}" har anden type/sektor end første forekomst — beholder den første`);
    }

    const handling: ImportHandling = { titel: tiltagTitel, type: tType, status: tStatus };
    if (c.tiltag_beskrivelse) handling.beskrivelse = c.tiltag_beskrivelse;
    gruppe.handlinger.push(handling);
  });

  return { indsatser: [...grupper.values()], advarsler };
}
```

- [ ] **Step 4: Kør testen og verificér PASS**

Run: `npx vitest run lib/import/parse-handlingskatalog.test.ts 2>&1 | tail -5`
Expected: `Tests  5 passed (5)`

- [ ] **Step 5: Commit**

```bash
git add lib/import/parse-handlingskatalog.ts lib/import/parse-handlingskatalog.test.ts
git commit -m "feat: deterministisk parser for handlingskatalog-skabelon"
```

---

## Task 5: Server action — læs fil og lav forhåndsvisning

**Files:**
- Create: `app/(app)/k/[kommune]/indsatser/importer-skabelon/actions.ts`

Tynd glue: auth-guard + filmlæsning med `xlsx`, delegerer al logik til den allerede testede parser. Skriver IKKE til DB — oprettelse sker først efter brugerens bekræftelse via den eksisterende `bulkImportAction`.

- [ ] **Step 1: Opret `app/(app)/k/[kommune]/indsatser/importer-skabelon/actions.ts`**

```ts
'use server';

import * as XLSX from 'xlsx';
import { requireKommuneContext } from '@/lib/kommune-context';
import { parseHandlingskatalog, type ParseResultat } from '@/lib/import/parse-handlingskatalog';

export type SkabelonPreview = ParseResultat & { fejl?: string };

/** Læser en udfyldt Excel/CSV-skabelon og returnerer en forhåndsvisning (ingen DB-skrivning). */
export async function parseSkabelonAction(slug: string, formData: FormData): Promise<SkabelonPreview> {
  await requireKommuneContext(slug); // auth-guard — kaster hvis ikke autoriseret

  const file = formData.get('file') as File | null;
  if (!file) return { indsatser: [], advarsler: [], fejl: 'Ingen fil modtaget' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    return { indsatser: [], advarsler: [], fejl: `Filtype .${ext} understøttes ikke — brug CSV, XLSX eller XLS` };
  }

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { indsatser: [], advarsler: [], fejl: 'Filen indeholder ingen ark' };
    // raw:false → alle celler som strenge; defval:'' → tomme celler bliver '' frem for udeladt
    const raekker = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
    return parseHandlingskatalog(raekker);
  } catch (e: unknown) {
    return { indsatser: [], advarsler: [], fejl: `Kunne ikke læse filen: ${e instanceof Error ? e.message : e}` };
  }
}
```

- [ ] **Step 2: Verificér typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "importer-skabelon/actions" || echo "OK"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/indsatser/importer-skabelon/actions.ts"
git commit -m "feat: server action til forhåndsvisning af struktureret import"
```

---

## Task 6: Route handler — download CSV-skabelon

**Files:**
- Create: `app/api/skabelon/handlingskatalog/route.ts`

- [ ] **Step 1: Opret `app/api/skabelon/handlingskatalog/route.ts`**

```ts
import { byggSkabelonCsv } from '@/lib/import/handlingskatalog-skabelon';

export function GET() {
  // ﻿ (BOM) sikrer at Excel åbner æ/ø/å korrekt.
  const csv = '﻿' + byggSkabelonCsv();
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="handlingskatalog-skabelon.csv"',
    },
  });
}
```

- [ ] **Step 2: Verificér typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "skabelon/handlingskatalog" || echo "OK"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app/api/skabelon/handlingskatalog/route.ts
git commit -m "feat: download-rute for handlingskatalog-skabelon (CSV)"
```

---

## Task 7: UI — skabelon-importer (client + side)

**Files:**
- Create: `app/(app)/k/[kommune]/indsatser/importer-skabelon/skabelon-importer-client.tsx`
- Create: `app/(app)/k/[kommune]/indsatser/importer-skabelon/page.tsx`

- [ ] **Step 1: Opret client-komponenten**

```tsx
// app/(app)/k/[kommune]/indsatser/importer-skabelon/skabelon-importer-client.tsx
'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { parseSkabelonAction, type SkabelonPreview } from './actions';
import { bulkImportAction } from '../importer/actions';

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planlagt', in_progress: 'Igangværende', completed: 'Gennemført', discontinued: 'Udgået',
};

export function SkabelonImporterClient({ slug }: { slug: string }) {
  const [preview, setPreview] = useState<SkabelonPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  async function vælgFil(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    setPreview(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await parseSkabelonAction(slug, fd);
    setPreview(res);
    setBusy(false);
  }

  function opret() {
    if (!preview || preview.indsatser.length === 0) return;
    startTransition(() => { bulkImportAction(slug, preview.indsatser); });
  }

  const antalHandlinger = preview?.indsatser.reduce((n, io) => n + io.handlinger.length, 0) ?? 0;

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Indsatsområder</div>
          <h1>Importer udfyldt skabelon</h1>
          <p className="sub">Har du dit handlingskatalog i et regneark? Hent skabelonen, udfyld den, og upload den her — uden AI, helt forudsigeligt.</p>
        </div>
        <div className="actions">
          <Link href={`/k/${slug}/indsatser`} className="ks-btn ks-btn-secondary">← Tilbage</Link>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        <div className="ks-card" style={{ marginBottom: 20, background: 'var(--moss-50)', border: '1px solid var(--moss-100)' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6 }}>
            <strong>1.</strong> <a href="/api/skabelon/handlingskatalog" style={{ color: 'var(--forest-900)', fontWeight: 600 }}>Hent CSV-skabelonen</a> &nbsp;·&nbsp;
            <strong>2.</strong> Udfyld én række pr. handling (gentag indsatsområdet på tværs af rækker) &nbsp;·&nbsp;
            <strong>3.</strong> Upload den udfyldte fil herunder.
          </div>
        </div>

        <button className="ks-btn ks-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Læser…' : '↑ Vælg udfyldt skabelon (CSV/XLSX)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => vælgFil(e.target.files?.[0] ?? null)}
        />
        {fileName && <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--ink-500)' }}>{fileName}</span>}
      </div>

      {preview?.fejl && (
        <div className="ks-empty" style={{ maxWidth: 640, marginTop: 20 }}>
          <h3>Kunne ikke læse filen</h3>
          <p>{preview.fejl}</p>
        </div>
      )}

      {preview && !preview.fejl && (
        <div style={{ maxWidth: 640, marginTop: 24 }}>
          <div style={{ fontSize: 14, color: 'var(--ink-500)', marginBottom: 16 }}>
            Klar til at oprette <strong style={{ color: 'var(--ink-900)' }}>{preview.indsatser.length} indsatsområder</strong> med <strong style={{ color: 'var(--ink-900)' }}>{antalHandlinger} handlinger</strong>.
          </div>

          {preview.advarsler.length > 0 && (
            <div className="ks-card" style={{ marginBottom: 16, background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>
                {preview.advarsler.length} række(r) blev sprunget over:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                {preview.advarsler.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {preview.indsatser.map((io, i) => (
              <div key={i} className="ks-card">
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-900)', marginBottom: io.handlinger.length ? 12 : 0 }}>
                  {io.navn} <span className="ks-badge ks-badge-neutral" style={{ fontSize: 11 }}>{io.sektor}</span>
                </div>
                {io.handlinger.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--sand-200)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {io.handlinger.map((h, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, color: 'var(--ink-900)', flex: 1 }}>{h.titel}</span>
                        <span className="ks-badge ks-badge-neutral" style={{ fontSize: 11 }}>{STATUS_LABEL[h.status]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ks-btn ks-btn-primary" onClick={opret} disabled={preview.indsatser.length === 0 || isPending}>
              {isPending ? 'Opretter…' : `Opret ${preview.indsatser.length} indsatsområder + ${antalHandlinger} handlinger`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Opret side-shell**

```tsx
// app/(app)/k/[kommune]/indsatser/importer-skabelon/page.tsx
import { requireKommuneContext } from '@/lib/kommune-context';
import { SkabelonImporterClient } from './skabelon-importer-client';

export const metadata = { title: 'Importer skabelon — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function ImporterSkabelonPage({ params }: Props) {
  const { kommune: slug } = await params;
  await requireKommuneContext(slug); // auth-guard
  return <SkabelonImporterClient slug={slug} />;
}
```

- [ ] **Step 3: Verificér typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "importer-skabelon" || echo "OK"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/k/[kommune]/indsatser/importer-skabelon/"
git commit -m "feat: UI til struktureret skabelon-import med forhåndsvisning"
```

---

## Task 8: Entry-links på /indsatser

**Files:**
- Modify: `app/(app)/k/[kommune]/indsatser/page.tsx`

- [ ] **Step 1: Tilføj skabelon-link i empty-state**

I `app/(app)/k/[kommune]/indsatser/page.tsx`, i `ks-empty`-blokken (linje ~75-78), tilføj en knap mellem "Importer fra fil" og "Nyt indsatsområde":

```tsx
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href={`/k/${slug}/indsatser/importer`} className="ks-btn ks-btn-secondary">↑ Importer med AI (PDF/Word)</Link>
            <Link href={`/k/${slug}/indsatser/importer-skabelon`} className="ks-btn ks-btn-secondary">↑ Importer udfyldt skabelon</Link>
            <Link href={`/k/${slug}/indsatser/ny`} className="ks-btn ks-btn-primary">+ Nyt indsatsområde</Link>
          </div>
```

- [ ] **Step 2: Opdatér hjælpe-kortets tredje kolonne så den peger på skabelonen**

Erstat afsnittet i tredje kolonne ("Har du allerede et handlingskatalog?", linje ~62-67) med:

```tsx
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--forest-900)', marginBottom: 6 }}>Har du allerede et handlingskatalog?</div>
            <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6, margin: 0 }}>
              Ligger det i et regneark? <Link href={`/k/${slug}/indsatser/importer-skabelon`} style={{ color: 'var(--forest-900)', fontWeight: 600 }}>Importer en udfyldt skabelon</Link> — forudsigeligt og uden AI. Er det et tekstdokument (PDF/Word)? <Link href={`/k/${slug}/indsatser/importer`} style={{ color: 'var(--forest-900)', fontWeight: 600 }}>Lad AI analysere det</Link>.
            </p>
          </div>
```

- [ ] **Step 3: Tilføj en header-action så skabelon-import også er tilgængelig når der allerede findes indsatsområder**

I `ks-page-header`'s `actions`-div (linje ~42-44), tilføj før "+ Nyt indsatsområde":

```tsx
        <div className="actions">
          <Link href={`/k/${slug}/indsatser/importer-skabelon`} className="ks-btn ks-btn-secondary">↑ Importer skabelon</Link>
          <Link href={`/k/${slug}/indsatser/ny`} className="ks-btn ks-btn-primary">+ Nyt indsatsområde</Link>
        </div>
```

- [ ] **Step 4: Verificér typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "indsatser/page" || echo "OK"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/k/[kommune]/indsatser/page.tsx"
git commit -m "feat: entry-links til skabelon-import på indsatser-siden"
```

---

## Task 9: Samlet verifikation

- [ ] **Step 1: Kør HELE testsuiten (regression)**

Run: `npm test 2>&1 | tail -12`
Expected: alle tests PASS, inkl. de nye `handlingskatalog-skabelon`- og `parse-handlingskatalog`-tests.

- [ ] **Step 2: Fuld typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: ingen fejl.

- [ ] **Step 3: Verifikation i preview (brug preview_*-værktøjer, ikke Bash)**

- Start dev-server. Log ind som koordinator for en seed-kommune (jf. `db/seeds/groenkobing.ts` for credentials).
- Hent skabelonen: naviger til `/api/skabelon/handlingskatalog` — bekræft CSV downloades med danske overskrifter.
- Naviger til `/k/<slug>/indsatser/importer-skabelon`. Upload den udfyldte eksempel-skabelon (eller en kopi). Bekræft: forhåndsvisningen viser 1 indsatsområde + 2 handlinger, ingen advarsler.
- Tilføj bevidst en række med ukendt sektor i en testfil; bekræft at den vises som advarsel og springes over (ikke stiltiende tab).
- Klik "Opret" — bekræft redirect til `/k/<slug>/indsatser` og at de nye rækker er oprettet.
- Bekræft at den eksisterende AI-import (`/k/<slug>/indsatser/importer`) stadig virker uændret.
- Tjek konsol-/server-logs for fejl (preview_console_logs / preview_logs).

- [ ] **Step 4: Afsluttende commit (hvis preview afslørede rettelser)**

```bash
git add -A
git commit -m "fix: rettelser fra preview-verifikation af struktureret import"
```

---

## Self-Review

**1. Spec coverage (Trin 0 + Trin 2):**
- ✅ Slet 5 tomme " 2"-mapper → Task 1
- ✅ Behold backward-compat redirects → Task 1 Step 3 verificerer de findes
- ✅ Standard import-skabelon (kendte kolonner) → Task 3 (`SKABELON_KOLONNER`, `byggSkabelonCsv`) + Task 6 (download)
- ✅ Deterministisk parser, ingen AI, ingen afkortning → Task 4 (ren funktion, ingen char-limit)
- ✅ Forhåndsvisning før commit, ugyldige rækker flages → Task 4 (advarsler) + Task 7 (preview-UI)
- ✅ Bevar eksisterende AI-PDF-import → AI-importeren røres kun i Task 2 (typeimport, ingen adfærdsændring); Task 9 Step 3 verificerer den uændret
- ✅ Onboarding triviel for fremtidige kommuner → genbrugbar skabelon + entry-links (Task 8)
- ✅ Additivt, ingen schema-ændring → genbruger `indsatsOmraade`/`tiltag` + `bulkImportAction`

**2. Placeholder-scan:** Ingen TBD/TODO. Al kode er fuldt udskrevet inkl. tests og styling.

**3. Type-konsistens:**
- `ImportIndsats`/`ImportHandling` defineret i Task 2, importeret i Task 3/4 og brugt i `bulkImportAction` (eksisterende, uændret signatur `bulkImportAction(slug, indsatser)`).
- `KolonneNoegle` defineret i Task 3, brugt i Task 4.
- `ParseResultat` defineret i Task 4, udvidet til `SkabelonPreview` i Task 5, forbrugt i Task 7.
- `parseSkabelonAction(slug, formData)` (Task 5) og `bulkImportAction(slug, indsatser)` (eksisterende) kaldes med matchende argumenter i Task 7.
- `byggSkabelonCsv()` defineret i Task 3, brugt i Task 6.

**4. Trin-afgrænsning:** Trin 1/3/4 er bevidst ikke i planen (validér-så-byg) — dokumenteret i header. Ingen task forsøger at bygge skelet-features på gæt.
