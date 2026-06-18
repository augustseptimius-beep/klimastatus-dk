# Fase 3 — Datafriskhed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Et value-first datafriskheds-lag der proaktivt gør kommunens koordinator opmærksom på data der trænger til et kig (emissionsdata forælder, kadence forfalden, indikatorer der ikke er opdateret) — i hjælpende sprog, aldrig som compliance-dom, og uden falske positiver.

**Architecture:** Én ren motor (`lib/datafriskhed/motor.ts`) holder al niveau-logik (frisk/snart/forældet) som testbare funktioner der tager allerede-hentede data + et injiceret "nu". Et query-lag (`db/queries/datafriskhed.ts`) henter rækkerne og kører motoren. En delt badge-komponent renderer ét niveau konsistent. Eksisterende sektioner (/dashboard, /data, /indsatser) henter de indsigter de vil vise (filtreret på `type`) og renderer dem inline.

**Tech Stack:** Next.js 16 (App Router, server components), Drizzle ORM + postgres.js, Vitest, TypeScript.

---

## Kildegrundlag

Spec: `docs/superpowers/specs/2026-06-17-fase3-datafriskhed-design.md`. CCTF-tærskler: evidensgrundlag §5 (regnskab min. hvert 2.-3. år `[D1 s.19]`).

## Verificerede fund (codebase, 2026-06-17)

- **Emissionskilde:** Dashboard (`app/(app)/k/[kommune]/dashboard/page.tsx`) viser CO₂e fra den **klimaregnskab-sourcede indikators** seneste `indikator_maaling.aar`. `drivhusgasregnskab_post` læses kun af fetch-jobbet, aldrig i UI → emissions-friskhed beregnes fra den klimaregnskab-indikators seneste måling-år.
- **Indikator-friskhed i dag:** `StalenessStatus` i `app/(app)/k/[kommune]/data/page.tsx` viser "Senest hentet: X dage siden" baseret på `kommune_indikator.sidstHentet` (gul > 35 dage). **Hul:** manuelle indikatorer har `sidstHentet = null` → viser permanent "Afventer første hentning", selvom de har målinger. Det fikser vi.
- **Kadence:** `kommune.indhentningsKadence` (enum: maanedlig/kvartalsvis/halvaarlig/aarlig/manuel, default aarlig). Ingen eksisterende "tid til opdatering"-signal.
- **Mål:** `db/queries/maal.ts` har `getReduktionsMaal(kommuneId)` (primært SMART-reduktionsmål). Reduktions-`maal` har `kategori='reduction'`.
- **Date.now()-mønster:** server-komponenter bruger `Date.now()` med `// eslint-disable-next-line react-hooks/purity`. Motoren tager derimod `nu: Date` som parameter (ren + testbar); kun page-laget kalder `new Date()`.
- `indikator_maaling` har `dato` (date) + `aar` (integer). `kommune_indikator` har `sidstHentet`, `sidsteFejl`, `sidsteFejlBesked`.

## Designbeslutninger (afgjort her)

1. **Indsigt-model uden `sektion`-felt:** motoren returnerer `Indsigt[]`; hver side filtrerer på `type` (dashboard: emissionsdata+kadence; data: emissionsdata+indikator; indsatser: delmaal). Enklere end et sektion-felt.
2. **Frisk = ingen banner.** Motoren returnerer altid niveau (inkl. `frisk`) når der ER data; UI viser kun banners for `snart`/`forældet`. Per-indikator-badge må vise `frisk` (grøn) som i dag.
3. **Ingen data → `null` (intet signal).** En netop-onboardet kommune uden emissionsdata får ALDRIG en "forældet"-advarsel.
4. **Emissions-tærskler (årsbaseret):** alder = `nu.år − senesteÅr`. `frisk` ≤1, `snart` =2, `forældet` ≥3.

## File Structure

**Nye filer:**
- `lib/datafriskhed/motor.ts` — ren motor: typer + funktioner pr. signal + `beregnIndsigter`.
- `lib/datafriskhed/motor.test.ts` — enhedstests (injiceret `nu`).
- `db/queries/datafriskhed.ts` — `getDatafriskhed(kommuneId, nu)` henter data + kører motoren.
- `db/queries/datafriskhed.test.ts` — mock-`@/db`-test.
- `components/datafriskhed/friskhed-badge.tsx` — delt inline-visning af ét niveau.

**Ændrede filer:**
- `app/(app)/k/[kommune]/dashboard/page.tsx` — emissions- + kadence-nudge.
- `app/(app)/k/[kommune]/data/page.tsx` — emissions-banner + `StalenessStatus` udvidet (manuelle indikatorer).
- `app/(app)/k/[kommune]/indsatser/page.tsx` — bonus delmål-indsigt.

---

### Task 1: Motor-typer + emissionsdata-signal

**Files:**
- Create: `lib/datafriskhed/motor.ts`
- Test: `lib/datafriskhed/motor.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/datafriskhed/motor.test.ts
import { describe, it, expect } from 'vitest';
import { emissionsdataFriskhed } from './motor';

const NU = new Date('2026-06-17T00:00:00Z');

describe('emissionsdataFriskhed', () => {
  it('giver intet signal når der ingen emissionsdata er (undgå falsk positiv)', () => {
    expect(emissionsdataFriskhed(null, NU)).toBeNull();
  });

  it('er frisk når seneste år er 0-1 år gammelt', () => {
    expect(emissionsdataFriskhed(2025, NU)?.niveau).toBe('frisk');
    expect(emissionsdataFriskhed(2026, NU)?.niveau).toBe('frisk');
  });

  it('er snart når seneste år er 2 år gammelt', () => {
    const i = emissionsdataFriskhed(2024, NU);
    expect(i?.niveau).toBe('snart');
    expect(i?.type).toBe('emissionsdata');
    expect(i?.besked).toMatch(/2024/);
  });

  it('er forældet når seneste år er 3+ år gammelt', () => {
    expect(emissionsdataFriskhed(2023, NU)?.niveau).toBe('forældet');
    expect(emissionsdataFriskhed(2019, NU)?.niveau).toBe('forældet');
  });

  it('bruger hjælpende sprog uden compliance-ord', () => {
    const i = emissionsdataFriskhed(2022, NU);
    expect(i?.besked).not.toMatch(/fejl|ugyldig|kan ikke godkendes/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/datafriskhed/motor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement types + emissionsdataFriskhed**

```typescript
// lib/datafriskhed/motor.ts
// Value-first datafriskheds-motor. Ren logik: tager allerede-hentede data + injiceret "nu".
// Sproget er hjælp, aldrig dom. Ingen data → null (ingen falsk advarsel).

export type FriskhedsNiveau = 'frisk' | 'snart' | 'forældet';
export type IndsigtType = 'emissionsdata' | 'indikator' | 'kadence' | 'delmaal';

export type Indsigt = {
  type: IndsigtType;
  niveau: FriskhedsNiveau;
  besked: string;
  link?: string;
  entitetId?: string;
};

/**
 * Emissionsdata-friskhed ud fra seneste tilgængelige dataår.
 * CCTF anbefaler opdatering min. hvert 2.-3. år [evidensgrundlag §5].
 */
export function emissionsdataFriskhed(senesteAar: number | null, nu: Date): Indsigt | null {
  if (senesteAar == null) return null;
  const alder = nu.getFullYear() - senesteAar;
  const niveau: FriskhedsNiveau = alder >= 3 ? 'forældet' : alder === 2 ? 'snart' : 'frisk';
  const besked =
    niveau === 'forældet'
      ? `Jeres seneste drivhusgasregnskab er fra ${senesteAar}. Nyere tal giver bedre styring og mere troværdige tal til byrådet.`
      : niveau === 'snart'
        ? `Jeres drivhusgasregnskab (${senesteAar}) nærmer sig at skulle opdateres — nye tal holder styringsgrundlaget skarpt.`
        : `Drivhusgasregnskabet er opdateret (${senesteAar}).`;
  return { type: 'emissionsdata', niveau, besked, link: 'data' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/datafriskhed/motor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/datafriskhed/motor.ts lib/datafriskhed/motor.test.ts
git commit -m "feat(fase3): datafriskheds-motor — typer + emissionsdata-signal

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Kadence-signal

**Files:**
- Modify: `lib/datafriskhed/motor.ts`
- Modify: `lib/datafriskhed/motor.test.ts`

- [ ] **Step 1: Write the failing test (append to motor.test.ts)**

```typescript
import { kadenceFriskhed } from './motor';

describe('kadenceFriskhed', () => {
  const NU = new Date('2026-06-17T00:00:00Z');

  it('intet signal ved manuel kadence', () => {
    expect(kadenceFriskhed('manuel', new Date('2020-01-01'), NU)).toBeNull();
  });

  it('intet signal når der aldrig er opdateret (ingen måling) — undgå falsk positiv', () => {
    expect(kadenceFriskhed('aarlig', null, NU)).toBeNull();
  });

  it('er frisk når seneste opdatering er inden for intervallet', () => {
    // kvartalsvis = 3 mdr; opdateret for 1 md siden
    expect(kadenceFriskhed('kvartalsvis', new Date('2026-05-17'), NU)?.niveau).toBe('frisk');
  });

  it('er forældet når intervallet er overskredet', () => {
    // aarlig = 12 mdr; seneste opdatering for 2 år siden
    const i = kadenceFriskhed('aarlig', new Date('2024-06-17'), NU);
    expect(i?.niveau).toBe('forældet');
    expect(i?.type).toBe('kadence');
  });

  it('er snart når opdatering nærmer sig (inden for sidste 20% af intervallet)', () => {
    // halvaarlig = 6 mdr; opdateret for ~5,5 md siden → snart
    expect(kadenceFriskhed('halvaarlig', new Date('2026-01-01'), NU)?.niveau).toBe('snart');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/datafriskhed/motor.test.ts`
Expected: FAIL — `kadenceFriskhed` not exported.

- [ ] **Step 3: Implement kadenceFriskhed (append to motor.ts)**

```typescript
export type Kadence = 'maanedlig' | 'kvartalsvis' | 'halvaarlig' | 'aarlig' | 'manuel';

const KADENCE_MAANEDER: Record<Exclude<Kadence, 'manuel'>, number> = {
  maanedlig: 1,
  kvartalsvis: 3,
  halvaarlig: 6,
  aarlig: 12,
};

const KADENCE_ORD: Record<Exclude<Kadence, 'manuel'>, string> = {
  maanedlig: 'månedlige',
  kvartalsvis: 'kvartalsvise',
  halvaarlig: 'halvårlige',
  aarlig: 'årlige',
};

/**
 * Kadence-påmindelse ud fra kommunens valgte opdateringsrytme og seneste dataopdatering.
 * manuel → intet signal. Ingen opdatering endnu → intet signal (undgå falsk positiv).
 */
export function kadenceFriskhed(kadence: Kadence, senesteOpdatering: Date | null, nu: Date): Indsigt | null {
  if (kadence === 'manuel') return null;
  if (senesteOpdatering == null) return null;

  const intervalMaaneder = KADENCE_MAANEDER[kadence];
  const maanederSiden =
    (nu.getFullYear() - senesteOpdatering.getFullYear()) * 12 +
    (nu.getMonth() - senesteOpdatering.getMonth());

  let niveau: FriskhedsNiveau;
  if (maanederSiden > intervalMaaneder) niveau = 'forældet';
  else if (maanederSiden >= intervalMaaneder * 0.8) niveau = 'snart';
  else niveau = 'frisk';

  const ord = KADENCE_ORD[kadence];
  const besked =
    niveau === 'forældet'
      ? `Det er tid til jeres ${ord} dataopdatering — seneste var for ${maanederSiden} måneder siden.`
      : niveau === 'snart'
        ? `Jeres ${ord} dataopdatering nærmer sig.`
        : `I er ajour med jeres ${ord} opdateringsrytme.`;
  return { type: 'kadence', niveau, besked, link: 'data' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/datafriskhed/motor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/datafriskhed/motor.ts lib/datafriskhed/motor.test.ts
git commit -m "feat(fase3): kadence-påmindelse i datafriskheds-motor

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Indikator-friskhed (inkl. manuelle)

**Files:**
- Modify: `lib/datafriskhed/motor.ts`
- Modify: `lib/datafriskhed/motor.test.ts`

**Kontekst:** Per-indikator-signal. API-indikatorer vurderes på `sidstHentet` (som i dag, >35 dage = snart). Manuelle indikatorer (kilde = null) har `sidstHentet = null` og vurderes i stedet på seneste målings-dato (det huller-fix der giver værdi). Fejl-tilstand (`sidsteFejl` nyere end `sidstHentet`) → forældet med fejlbesked.

- [ ] **Step 1: Write the failing test (append)**

```typescript
import { indikatorFriskhed, type IndikatorInput } from './motor';

describe('indikatorFriskhed', () => {
  const NU = new Date('2026-06-17T00:00:00Z');
  const base: IndikatorInput = {
    kommuneIndikatorId: 'ki1', visningsnavn: 'Solceller', kilde: 'energidataservice',
    sidstHentet: new Date('2026-06-10'), sidsteFejl: null, sidsteFejlBesked: null,
    senesteMaalingDato: null, senesteMaalingAar: 2025,
  };

  it('API-indikator frisk når nyligt hentet', () => {
    expect(indikatorFriskhed(base, NU)?.niveau).toBe('frisk');
  });

  it('API-indikator snart når > 35 dage siden hentning', () => {
    expect(indikatorFriskhed({ ...base, sidstHentet: new Date('2026-04-01') }, NU)?.niveau).toBe('snart');
  });

  it('fejl-tilstand → forældet med fejlbesked', () => {
    const i = indikatorFriskhed({ ...base, sidsteFejl: new Date('2026-06-12'), sidsteFejlBesked: 'HTTP 500' }, NU);
    expect(i?.niveau).toBe('forældet');
    expect(i?.besked).toMatch(/HTTP 500/);
  });

  it('manuel indikator vurderes på seneste målings-år (ikke sidstHentet)', () => {
    const manuel: IndikatorInput = {
      ...base, kilde: null, sidstHentet: null,
      senesteMaalingDato: new Date('2024-01-01'), senesteMaalingAar: 2024,
    };
    const i = indikatorFriskhed(manuel, NU);
    expect(i?.niveau).toBe('snart'); // ~2,5 år gammelt
    expect(i?.entitetId).toBe('ki1');
  });

  it('manuel indikator uden nogen måling → intet signal (ikke "afventer for evigt")', () => {
    expect(indikatorFriskhed({ ...base, kilde: null, sidstHentet: null, senesteMaalingDato: null, senesteMaalingAar: null }, NU)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/datafriskhed/motor.test.ts`
Expected: FAIL — `indikatorFriskhed`/`IndikatorInput` not exported.

- [ ] **Step 3: Implement (append to motor.ts)**

```typescript
export type IndikatorInput = {
  kommuneIndikatorId: string;
  visningsnavn: string;
  kilde: string | null;
  sidstHentet: Date | null;
  sidsteFejl: Date | null;
  sidsteFejlBesked: string | null;
  senesteMaalingDato: Date | null;
  senesteMaalingAar: number | null;
};

const DAG_MS = 1000 * 60 * 60 * 24;

/**
 * Per-indikator friskhed. API-indikatorer: sidstHentet (>35 dage = snart).
 * Manuelle (kilde=null): seneste målings-år. Fejl: forældet. Ingen data → null.
 */
export function indikatorFriskhed(i: IndikatorInput, nu: Date): Indsigt | null {
  const baseIndsigt = (niveau: FriskhedsNiveau, besked: string): Indsigt => ({
    type: 'indikator', niveau, besked, entitetId: i.kommuneIndikatorId, link: 'data',
  });

  if (i.sidsteFejl && (!i.sidstHentet || i.sidsteFejl > i.sidstHentet)) {
    return baseIndsigt('forældet', `Fejl ved seneste hentning${i.sidsteFejlBesked ? `: ${i.sidsteFejlBesked}` : ''}.`);
  }

  // API-indikator: vurdér på sidstHentet
  if (i.kilde != null) {
    if (i.sidstHentet == null) return null; // afventer første hentning — intet advarende signal
    const dage = Math.floor((nu.getTime() - i.sidstHentet.getTime()) / DAG_MS);
    const niveau: FriskhedsNiveau = dage > 35 ? 'snart' : 'frisk';
    return baseIndsigt(niveau, niveau === 'snart' ? `Senest hentet for ${dage} dage siden.` : `Hentet ${i.sidstHentet.toLocaleDateString('da-DK')}.`);
  }

  // Manuel indikator: vurdér på seneste målings-år
  if (i.senesteMaalingAar == null) return null;
  const alder = nu.getFullYear() - i.senesteMaalingAar;
  const niveau: FriskhedsNiveau = alder >= 3 ? 'forældet' : alder === 2 ? 'snart' : 'frisk';
  return baseIndsigt(niveau, `Seneste data: ${i.senesteMaalingAar}.`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/datafriskhed/motor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/datafriskhed/motor.ts lib/datafriskhed/motor.test.ts
git commit -m "feat(fase3): indikator-friskhed inkl. manuelle indikatorer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Delmål-tjek (bonus) + beregnIndsigter-aggregator

**Files:**
- Modify: `lib/datafriskhed/motor.ts`
- Modify: `lib/datafriskhed/motor.test.ts`

- [ ] **Step 1: Write the failing test (append)**

```typescript
import { delmaalTjek, beregnIndsigter, type MotorInput } from './motor';

describe('delmaalTjek', () => {
  it('intet signal når der ikke er noget reduktionsmål endnu', () => {
    expect(delmaalTjek(false, 0)).toBeNull();
  });
  it('indsigt når der er et mål men < 2 delmål', () => {
    const i = delmaalTjek(true, 1);
    expect(i?.niveau).toBe('snart');
    expect(i?.type).toBe('delmaal');
  });
  it('intet signal når der er ≥ 2 delmål', () => {
    expect(delmaalTjek(true, 2)).toBeNull();
  });
});

describe('beregnIndsigter', () => {
  const NU = new Date('2026-06-17T00:00:00Z');
  it('samler alle ikke-null signaler', () => {
    const input: MotorInput = {
      senesteEmissionsAar: 2022,
      kadence: 'aarlig',
      senesteDataopdatering: new Date('2024-01-01'),
      indikatorer: [],
      harReduktionsMaal: true,
      antalReduktionsDelmaal: 1,
    };
    const out = beregnIndsigter(input, NU);
    const typer = out.map((i) => i.type);
    expect(typer).toContain('emissionsdata');
    expect(typer).toContain('kadence');
    expect(typer).toContain('delmaal');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/datafriskhed/motor.test.ts`
Expected: FAIL — `delmaalTjek`/`beregnIndsigter`/`MotorInput` not exported.

- [ ] **Step 3: Implement (append to motor.ts)**

```typescript
/** Bonus: et reduktionsmål uden delmål undervejs gør det umuligt at følge fremdrift. */
export function delmaalTjek(harReduktionsMaal: boolean, antalDelmaal: number): Indsigt | null {
  if (!harReduktionsMaal) return null;
  if (antalDelmaal >= 2) return null;
  return {
    type: 'delmaal',
    niveau: 'snart',
    besked: 'I har et reduktionsmål, men ingen delmål undervejs — uden dem kan I ikke følge fremdriften løbende.',
    link: 'indsatser',
  };
}

export type MotorInput = {
  senesteEmissionsAar: number | null;
  kadence: Kadence;
  senesteDataopdatering: Date | null;
  indikatorer: IndikatorInput[];
  harReduktionsMaal: boolean;
  antalReduktionsDelmaal: number;
};

/** Kører alle signaler og returnerer de ikke-null indsigter. */
export function beregnIndsigter(input: MotorInput, nu: Date): Indsigt[] {
  const ud: (Indsigt | null)[] = [
    emissionsdataFriskhed(input.senesteEmissionsAar, nu),
    kadenceFriskhed(input.kadence, input.senesteDataopdatering, nu),
    delmaalTjek(input.harReduktionsMaal, input.antalReduktionsDelmaal),
    ...input.indikatorer.map((i) => indikatorFriskhed(i, nu)),
  ];
  return ud.filter((i): i is Indsigt => i !== null);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/datafriskhed/motor.test.ts`
Expected: PASS. Full motor suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/datafriskhed/motor.ts lib/datafriskhed/motor.test.ts
git commit -m "feat(fase3): delmål-tjek + beregnIndsigter-aggregator

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Query-lag — getDatafriskhed

**Files:**
- Create: `db/queries/datafriskhed.ts`
- Test: `db/queries/datafriskhed.test.ts`
- Modify: `db/queries/index.ts` (barrel)

**Kontekst:** Henter de data motoren skal bruge og kalder `beregnIndsigter`. Følg det eksisterende query-mønster (raw `db.select(...)`). `nu` injiceres med default `new Date()` så funktionen er testbar.

- [ ] **Step 1: Write the failing test**

```typescript
// db/queries/datafriskhed.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/datafriskhed/motor', async (orig) => {
  const actual = await orig<typeof import('@/lib/datafriskhed/motor')>();
  return { ...actual, beregnIndsigter: vi.fn(() => [{ type: 'emissionsdata', niveau: 'forældet', besked: 'x' }]) };
});

// Minimal db-mock: kæderne returnerer tomme arrays / sentinel.
vi.mock('@/db', () => {
  const chain: any = {
    select: () => chain, from: () => chain, innerJoin: () => chain, leftJoin: () => chain,
    where: () => chain, orderBy: () => chain, limit: () => Promise.resolve([]),
  };
  return { db: { ...chain, query: { kommune: { findFirst: vi.fn(() => Promise.resolve({ id: 'k1', indhentningsKadence: 'aarlig' })) } } } };
});

describe('getDatafriskhed', () => {
  it('kalder motoren og returnerer indsigter', async () => {
    const { getDatafriskhed } = await import('./datafriskhed');
    const out = await getDatafriskhed('k1', new Date('2026-06-17'));
    expect(Array.isArray(out)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run db/queries/datafriskhed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the query**

```typescript
// db/queries/datafriskhed.ts
import { db } from '@/db';
import { kommune, kommuneIndikator, indikatorTemplate, indikatorMaaling, maal, indsatsOmraade } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { beregnIndsigter, type Indsigt, type IndikatorInput, type Kadence } from '@/lib/datafriskhed/motor';

export async function getDatafriskhed(kommuneId: string, nu: Date = new Date()): Promise<Indsigt[]> {
  const k = await db.query.kommune.findFirst({ where: eq(kommune.id, kommuneId) });
  if (!k) return [];

  // Aktive indikatorer + seneste måling pr. indikator
  const aktive = await db
    .select({
      kommuneIndikatorId: kommuneIndikator.id,
      visningsnavn: kommuneIndikator.visningsnavn,
      titel: indikatorTemplate.titel,
      kilde: indikatorTemplate.kilde,
      sidstHentet: kommuneIndikator.sidstHentet,
      sidsteFejl: kommuneIndikator.sidsteFejl,
      sidsteFejlBesked: kommuneIndikator.sidsteFejlBesked,
      indikatorId: kommuneIndikator.indikatorId,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(eq(kommuneIndikator.kommuneId, kommuneId), eq(kommuneIndikator.aktiv, true)));

  const indikatorer: IndikatorInput[] = [];
  let senesteEmissionsAar: number | null = null;
  let senesteDataopdatering: Date | null = null;

  for (const a of aktive) {
    const [latest] = await db
      .select({ aar: indikatorMaaling.aar, dato: indikatorMaaling.dato })
      .from(indikatorMaaling)
      .where(eq(indikatorMaaling.indikatorId, a.indikatorId))
      .orderBy(desc(indikatorMaaling.aar))
      .limit(1);

    const maalDato = latest?.dato ? new Date(latest.dato) : null;
    indikatorer.push({
      kommuneIndikatorId: a.kommuneIndikatorId,
      visningsnavn: a.visningsnavn ?? a.titel,
      kilde: a.kilde,
      sidstHentet: a.sidstHentet,
      sidsteFejl: a.sidsteFejl,
      sidsteFejlBesked: a.sidsteFejlBesked,
      senesteMaalingDato: maalDato,
      senesteMaalingAar: latest?.aar ?? null,
    });

    // Emissions-friskhed: den klimaregnskab-sourcede indikators seneste år
    if (a.kilde === 'klimaregnskab' && latest?.aar != null) {
      senesteEmissionsAar = Math.max(senesteEmissionsAar ?? 0, latest.aar);
    }
    // Seneste dataopdatering på tværs (til kadence): nyeste sidstHentet eller målings-dato
    const opdat = a.sidstHentet ?? maalDato;
    if (opdat && (!senesteDataopdatering || opdat > senesteDataopdatering)) senesteDataopdatering = opdat;
  }

  // Reduktionsmål + delmål-antal
  const reduktionsMaal = await db
    .select({ id: maal.id })
    .from(maal)
    .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
    .where(and(eq(indsatsOmraade.kommuneId, kommuneId), eq(maal.kategori, 'reduction')));

  return beregnIndsigter(
    {
      senesteEmissionsAar,
      kadence: (k.indhentningsKadence as Kadence) ?? 'aarlig',
      senesteDataopdatering,
      indikatorer,
      harReduktionsMaal: reduktionsMaal.length > 0,
      antalReduktionsDelmaal: reduktionsMaal.length,
    },
    nu,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run db/queries/datafriskhed.test.ts`
Expected: PASS.

- [ ] **Step 5: Add barrel export**

In `db/queries/index.ts`, after `export * from './standardtiltag';` (or any existing line), add:
```typescript
export * from './datafriskhed';
```

- [ ] **Step 6: Verify typecheck + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Clean; all green.

- [ ] **Step 7: Commit**

```bash
git add db/queries/datafriskhed.ts db/queries/datafriskhed.test.ts db/queries/index.ts
git commit -m "feat(fase3): getDatafriskhed query der kører motoren

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: FriskhedBadge-komponent

**Files:**
- Create: `components/datafriskhed/friskhed-badge.tsx`

- [ ] **Step 1: Implement the shared badge**

Følger det eksisterende Tailwind-mønster (`text-yellow-600`, `text-red-600`, `text-green-600` fra `StalenessStatus`). Server-komponent (ingen hooks).

```tsx
// components/datafriskhed/friskhed-badge.tsx
import type { FriskhedsNiveau } from '@/lib/datafriskhed/motor';

const STIL: Record<FriskhedsNiveau, string> = {
  frisk: 'text-green-600',
  snart: 'text-yellow-600',
  forældet: 'text-red-600',
};
const IKON: Record<FriskhedsNiveau, string> = { frisk: '', snart: '⚠', forældet: '⚠' };

export function FriskhedBadge({ niveau, besked }: { niveau: FriskhedsNiveau; besked: string }) {
  return (
    <span className={`text-xs ${STIL[niveau]}`}>
      {IKON[niveau] && `${IKON[niveau]} `}{besked}
    </span>
  );
}

/** Banner-variant til /dashboard + /data (kun snart/forældet). */
export function FriskhedBanner({ niveau, besked, href }: { niveau: FriskhedsNiveau; besked: string; href?: string }) {
  const farve = niveau === 'forældet'
    ? 'border-red-300 bg-red-50 text-red-800'
    : 'border-yellow-300 bg-yellow-50 text-yellow-800';
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${farve}`}>
      ⚠ {besked}{' '}
      {href && <a href={href} className="underline">Gå til data</a>}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 3: Commit**

```bash
git add components/datafriskhed/friskhed-badge.tsx
git commit -m "feat(fase3): delt FriskhedBadge + FriskhedBanner

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Wire ind på /dashboard (emissions + kadence)

**Files:**
- Modify: `app/(app)/k/[kommune]/dashboard/page.tsx`

**Kontekst:** Læs den fulde fil først. Tilføj emissions- og kadence-banners øverst i return (før `ks-page-header` eller lige efter). Hent indsigter via `getDatafriskhed`.

- [ ] **Step 1: Add the import and data fetch**

Tilføj import:
```typescript
import { getDatafriskhed } from '@/db/queries/datafriskhed';
import { FriskhedBanner } from '@/components/datafriskhed/friskhed-badge';
```
I komponenten, efter `const { kommune } = await requireKommuneContext(slug);`, tilføj:
```typescript
  // eslint-disable-next-line react-hooks/purity
  const indsigter = await getDatafriskhed(kommune.id, new Date());
  const dashboardBanners = indsigter.filter(
    (i) => (i.type === 'emissionsdata' || i.type === 'kadence') && i.niveau !== 'frisk',
  );
```

- [ ] **Step 2: Render the banners**

Lige efter `<>` (før `<div className="ks-page-header">`), tilføj:
```tsx
      {dashboardBanners.map((i, n) => (
        <FriskhedBanner key={n} niveau={i.niveau} besked={i.besked} href={`/k/${slug}/data`} />
      ))}
```

- [ ] **Step 3: Verify typecheck + lint + suite**

Run: `npx tsc --noEmit && npx eslint app/(app)/k/[kommune]/dashboard/page.tsx && npx vitest run`
Expected: Clean; green.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/k/[kommune]/dashboard/page.tsx"
git commit -m "feat(fase3): emissions- og kadence-nudge på dashboard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Wire ind på /data (emissions-banner + manuelle indikatorer)

**Files:**
- Modify: `app/(app)/k/[kommune]/data/page.tsx`

**Kontekst:** Læs den fulde fil først (allerede kortlagt: `StalenessStatus`-komponent, `aktiveWithValue`-tabel). To ændringer: (1) emissions-banner øverst; (2) erstat per-række `StalenessStatus`-output med motorens indikator-indsigt, så manuelle indikatorer også får et fornuftigt signal. Behold fejl/grøn-visning.

- [ ] **Step 1: Fetch indsigter + map per indikator**

Tilføj import:
```typescript
import { getDatafriskhed } from '@/db/queries/datafriskhed';
import { FriskhedBadge, FriskhedBanner } from '@/components/datafriskhed/friskhed-badge';
```
Efter `const { kommune } = await requireKommuneContext(slug);`:
```typescript
  // eslint-disable-next-line react-hooks/purity
  const friskhed = await getDatafriskhed(kommune.id, new Date());
  const emissionsBanner = friskhed.find((i) => i.type === 'emissionsdata' && i.niveau !== 'frisk');
  const indikatorIndsigt = new Map(
    friskhed.filter((i) => i.type === 'indikator' && i.entitetId).map((i) => [i.entitetId!, i]),
  );
```

- [ ] **Step 2: Render emissions-banner**

Lige inde i den yderste `<div>` (før `foraeldreloese`-banneret), tilføj:
```tsx
      {emissionsBanner && (
        <FriskhedBanner niveau={emissionsBanner.niveau} besked={emissionsBanner.besked} />
      )}
```

- [ ] **Step 3: Erstat StalenessStatus-kaldet i tabellen**

Find i tabellens `Status`-celle:
```tsx
                        <StalenessStatus
                          sidstHentet={ki.sidstHentet}
                          sidsteFejl={ki.sidsteFejl}
                          sidsteFejlBesked={ki.sidsteFejlBesked}
                        />
```
Erstat med:
```tsx
                        {(() => {
                          const ind = indikatorIndsigt.get(ki.id);
                          return ind
                            ? <FriskhedBadge niveau={ind.niveau} besked={ind.besked} />
                            : <span className="text-xs text-gray-400">Afventer første hentning</span>;
                        })()}
```
Fjern derefter den nu ubrugte `StalenessStatus`-funktion (linje 22-48) og dens ubrugte `KILDE_LABEL`-afhængigheder hvis de bliver ubrugte (tjek: `KILDE_LABEL` bruges stadig i kilde-chippen — behold den).

- [ ] **Step 4: Verify typecheck + lint + suite**

Run: `npx tsc --noEmit && npx eslint "app/(app)/k/[kommune]/data/page.tsx" && npx vitest run`
Expected: Clean (ingen ubrugt `StalenessStatus`); green.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/k/[kommune]/data/page.tsx"
git commit -m "feat(fase3): emissions-banner + indikator-friskhed (inkl. manuelle) på /data

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Bonus — delmål-indsigt på /indsatser

**Files:**
- Modify: `app/(app)/k/[kommune]/indsatser/page.tsx`

**Kontekst:** Læs den fulde fil først (henter `getAllIndsatsOmraader`). Tilføj delmål-indsigt som en venlig banner øverst. Hvis filstrukturen gør det akavet, rapportér DONE_WITH_CONCERNS frem for at presse det ind.

- [ ] **Step 1: Fetch + render**

Tilføj import:
```typescript
import { getDatafriskhed } from '@/db/queries/datafriskhed';
import { FriskhedBanner } from '@/components/datafriskhed/friskhed-badge';
```
Efter kommune-context er hentet:
```typescript
  // eslint-disable-next-line react-hooks/purity
  const delmaal = (await getDatafriskhed(kommune.id, new Date())).find((i) => i.type === 'delmaal');
```
Øverst i return (inde i den yderste container):
```tsx
      {delmaal && <FriskhedBanner niveau={delmaal.niveau} besked={delmaal.besked} />}
```

- [ ] **Step 2: Verify typecheck + lint + suite**

Run: `npx tsc --noEmit && npx eslint "app/(app)/k/[kommune]/indsatser/page.tsx" && npx vitest run`
Expected: Clean; green.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/k/[kommune]/indsatser/page.tsx"
git commit -m "feat(fase3): bonus delmål-fremdriftsindsigt på /indsatser

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Afsluttende verifikation

- [ ] `npx tsc --noEmit && npx vitest run && npx eslint` — alt grønt.
- [ ] Ingen forekomst af "fejl/ugyldigt/kan ikke godkendes" i bruger-vendt tekst (motorens beskeder).
- [ ] Motor-tests dækker eksplicit: ingen data → null (ingen falsk positiv) for hvert signal.

## Self-Review (udført ved planskrivning)

**1. Spec-dækning:**
- Emissionsdata forælder (NYT, flagskib) → Task 1 + 7 + 8 ✓
- Indikator-måling forælder (udvid StalenessStatus, manuelle) → Task 3 + 8 ✓
- Tid til opdatering (kadence) → Task 2 + 7 ✓
- Bonus delmål → Task 4 + 9 ✓
- Princip "sprog er hjælp, aldrig dom" → motorens beskeder + eksplicit test (Task 1 Step 1) ✓
- "Ingen falske positiver" → null-ved-manglende-data i hvert signal + eksplicitte tests ✓
- Ren motor + query + delt badge → Task 1-6 ✓
- To åbne beslutninger afgjort: emissionskilde = klimaregnskab-indikators seneste år (Task 5); tærskler årsbaserede (Task 1-3) ✓

**2. Placeholder-scan:** Ingen TBD/vage steps. Wiring-tasks (7-9) instruerer "læs filen først" fordi de rører eksisterende JSX — men de angiver præcис import, fetch og indsættelsespunkt med fuld kode.

**3. Type-konsistens:** `Indsigt`/`FriskhedsNiveau`/`IndikatorInput`/`Kadence`/`MotorInput` defineres i Task 1-4 og bruges konsistent i query (Task 5), komponent (Task 6) og wiring (Task 7-9). `getDatafriskhed(kommuneId, nu)`-signatur ens overalt. `Indsigt.entitetId` = `kommuneIndikator.id`, matcher `indikatorIndsigt`-mappen i Task 8.

**Bemærkning til eksekvering:** Task 9 er bonus — kan springes hvis /indsatser-strukturen gør det akavet. Task 1-8 er kernen.
