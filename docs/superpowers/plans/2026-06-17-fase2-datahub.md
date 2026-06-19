# Fase 2 — Datahub (provenance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gør datagrundlaget ærligt og læsbart: markér hver indikator som national-kontekst (top-down) eller lokal-styring (bottom-up) + aggregeret/operationel, vis det som et tillids-badge på /data, og gør Fase 1's nationale benchmark synlig ("jeres værdi vs. national målværdi") — så koordinatoren ved hvad de kan styre på.

**Architecture:** To nullable enum-felter på `indikator_template` (provenance er katalog-metadata, hvor kilde/niveau/benchmark allerede bor). En ren helper (`lib/datahub/provenans.ts`) holder labels + benchmark-%-beregning ude af UI. Seed sætter provenance på eksisterende templates; nye templates defaulter ud fra kilde-tilstedeværelse. /data-queryen henter felterne med (de joines allerede fra template) og viser badge + benchmark inline.

**Tech Stack:** Next.js 16 (App Router, server components), Drizzle ORM + postgres.js, Vitest, TypeScript. Migration via `drizzle-kit generate` (næste nr.: 0018).

---

## Kildegrundlag

Spec: `docs/superpowers/specs/2026-06-17-fase2-datahub-design.md`. Evidens: §6.6 (top-down vs bottom-up), §4.2 (dikotomier — vi bruger kun to).

## Verificerede fund (codebase, 2026-06-17)

- `indikator_template` (db/schema/indikator-template.ts) har: titel, kilde (apiKildeEnum, nullable), apiQuery, enhed, beskrivelse, cctfKriterier, niveau, sektor, nationalMaalvaerdi, nationalMaalvaerdiNote, aktiv, timestamps, uniqueIndex(titel). **Provenance-felterne tilføjes her.**
- Templates oprettes af admin: `app/admin/indikatorer/actions.ts` → `createTemplateAction` → `createTemplate({ titel, kilde, apiQuery, enhed, beskrivelse, cctfKriterier })` (db/queries/indikator-template.ts). `kilde` er valgfri — fraværende kilde = manuel/benchmark-template.
- Seed (db/seed.ts): 3 API-templates (klimaregnskab/energidataservice/dst) + 9 omstillingsindikatorer, begge med `onConflictDoUpdate({ target: titel, set: {...} })`.
- /data (app/(app)/k/[kommune]/data/page.tsx, EFTER Fase 3): `aktiveKI`-select joiner `indikatorTemplate` og henter id, visningsnavn, sidstHentet, sidsteFejl, sidsteFejlBesked, templateId, indikatorId, titel, kilde, enhed. Pr. indikator hentes seneste `indikatorMaaling` (vaerdi, aar). Status-cellen viser nu `FriskhedBadge` (Fase 3) — den rører vi ikke; vi tilføjer i Indikator- og Seneste-cellerne.
- Latest migration = 0017 (Fase 1). Fase 2 = 0018. Fase 3 havde ingen migrationer.

## File Structure

**Nye filer:**
- `lib/datahub/provenans.ts` — labels + `benchmarkProcent`.
- `lib/datahub/provenans.test.ts`.
- `components/datahub/provenans-badge.tsx` — lille badge-komponent.

**Ændrede filer:**
- `db/schema/enums.ts` — `dataProvenansEnum`, `dataKarakterEnum`.
- `db/schema/indikator-template.ts` — to nullable kolonner.
- `db/queries/indikator-template.ts` — `createTemplate` får optional provenance.
- `app/admin/indikatorer/actions.ts` — default provenance ud fra kilde.
- `db/seed.ts` — provenance på de eksisterende template-seeds.
- `app/(app)/k/[kommune]/data/page.tsx` — provenance-badge + benchmark inline.

---

### Task 1: Enums + template-kolonner + migration

**Files:**
- Modify: `db/schema/enums.ts`
- Modify: `db/schema/indikator-template.ts`
- Create: `db/migrations/0018_*.sql` (genereret)

- [ ] **Step 1: Tilføj enums i `db/schema/enums.ts`** (efter `standardtiltagKategoriEnum`):
```typescript
export const dataProvenansEnum = pgEnum('data_provenans', ['top_down', 'bottom_up']);
export const dataKarakterEnum = pgEnum('data_karakter', ['aggregeret', 'operationel']);
```

- [ ] **Step 2: Tilføj kolonner i `db/schema/indikator-template.ts`.** Opdatér enum-importen og tilføj to nullable felter (efter `sektor`):
```typescript
import { apiKildeEnum, indikatorNiveauEnum, sektorEnum, dataProvenansEnum, dataKarakterEnum } from './enums';
```
```typescript
  dataProvenans: dataProvenansEnum('data_provenans'),
  dataKarakter: dataKarakterEnum('data_karakter'),
```

- [ ] **Step 3: Generér migration**

Run: `npx drizzle-kit generate`
Expected: `db/migrations/0018_*.sql` med `CREATE TYPE "public"."data_provenans" ...`, `CREATE TYPE "public"."data_karakter" ...`, og to `ALTER TABLE "indikator_template" ADD COLUMN`.

- [ ] **Step 4: Verificér SQL er additiv**

Run: `cat db/migrations/0018_*.sql`
Expected: kun CREATE TYPE + ADD COLUMN. Ingen DROP. Paste SQL i rapporten.

- [ ] **Step 5: Verificér typecheck**

Run: `npx tsc --noEmit` — clean (ignorér `.next/`).

- [ ] **Step 6: Commit**

```bash
git add db/schema/enums.ts db/schema/indikator-template.ts db/migrations
git commit -m "feat(fase2): data_provenans + data_karakter på indikator-template + migration

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Provenance-helper (labels + benchmark-%)

**Files:**
- Create: `lib/datahub/provenans.ts`
- Test: `lib/datahub/provenans.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/datahub/provenans.test.ts
import { describe, it, expect } from 'vitest';
import { PROVENANS_LABEL, KARAKTER_LABEL, benchmarkProcent } from './provenans';

describe('provenans-labels', () => {
  it('mapper provenance til dansk', () => {
    expect(PROVENANS_LABEL.top_down).toBe('National kontekst');
    expect(PROVENANS_LABEL.bottom_up).toBe('Lokal styring');
  });
  it('mapper karakter til dansk', () => {
    expect(KARAKTER_LABEL.aggregeret).toBe('Aggregeret');
    expect(KARAKTER_LABEL.operationel).toBe('Operationel');
  });
});

describe('benchmarkProcent', () => {
  it('beregner procent af national målværdi', () => {
    expect(benchmarkProcent(18200, 27000)).toBe(67);
  });
  it('returnerer null ved manglende data (ingen falsk procent)', () => {
    expect(benchmarkProcent(null, 27000)).toBeNull();
    expect(benchmarkProcent(100, null)).toBeNull();
  });
  it('returnerer null ved målværdi 0 (ingen division med 0)', () => {
    expect(benchmarkProcent(100, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/datahub/provenans.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// lib/datahub/provenans.ts
// Datahub-provenance: gør lokal-styring vs national-kontekst læsbar. Ren logik.

export type DataProvenans = 'top_down' | 'bottom_up';
export type DataKarakter = 'aggregeret' | 'operationel';

export const PROVENANS_LABEL: Record<DataProvenans, string> = {
  top_down: 'National kontekst',
  bottom_up: 'Lokal styring',
};

export const KARAKTER_LABEL: Record<DataKarakter, string> = {
  aggregeret: 'Aggregeret',
  operationel: 'Operationel',
};

/** Kommunens værdi som procent af national målværdi. Null ved manglende/0-data (ingen falsk procent). */
export function benchmarkProcent(vaerdi: number | null, maalvaerdi: number | null): number | null {
  if (vaerdi == null || maalvaerdi == null || maalvaerdi === 0) return null;
  return Math.round((vaerdi / maalvaerdi) * 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/datahub/provenans.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/datahub/provenans.ts lib/datahub/provenans.test.ts
git commit -m "feat(fase2): provenance-labels + benchmark-%-helper

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Seed provenance + createTemplate/action default

**Files:**
- Modify: `db/queries/indikator-template.ts`
- Modify: `app/admin/indikatorer/actions.ts`
- Modify: `db/seed.ts`
- Test: `app/admin/indikatorer/actions.test.ts` (hvis findes — ellers spring testen og verificér via tsc)

- [ ] **Step 1: Udvid `createTemplate`** (db/queries/indikator-template.ts) med optional provenance:
```typescript
  dataProvenans?: 'top_down' | 'bottom_up';
  dataKarakter?: 'aggregeret' | 'operationel';
```
(tilføj de to linjer i `data`-objektets type, før `}) {`. Resten uændret — `db.insert(...).values(data)` tager dem med.)

- [ ] **Step 2: Default i `createTemplateAction`** (app/admin/indikatorer/actions.ts). Læs filen først. Ved kaldet til `createTemplate(...)`, udled provenance fra kilde:
```typescript
    const dataProvenans = kilde ? 'top_down' as const : 'bottom_up' as const;
    const dataKarakter = kilde ? 'aggregeret' as const : 'operationel' as const;
    await createTemplate({ titel, kilde, apiQuery, enhed, beskrivelse, cctfKriterier: cctfArr, dataProvenans, dataKarakter });
```
(Tilpas variabelnavne til den eksisterende action. Hvis `kilde` kan være tom streng frem for undefined, behandl tom streng som manuel: `const erApi = !!kilde;`.)

- [ ] **Step 3: Seed provenance på eksisterende templates** (db/seed.ts). I de TO eksisterende template-seed-blokke:
  - **3 API-templates** (klimaregnskab/energidataservice/dst): tilføj `dataProvenans: 'top_down', dataKarakter: 'aggregeret'` til hvert values-objekt, OG føj dem til `onConflictDoUpdate`-`set` så eksisterende rækker backfilles:
    ```typescript
    .onConflictDoUpdate({
      target: indikatorTemplate.titel,
      set: { updatedAt: new Date(), dataProvenans: 'top_down', dataKarakter: 'aggregeret' },
    });
    ```
  - **9 omstillingsindikatorer**: tilføj `dataProvenans: 'top_down', dataKarakter: 'aggregeret'` i `.map(...)`-objektet, OG i deres `onConflictDoUpdate`-`set` (samme mønster).

- [ ] **Step 4: (Hvis `app/admin/indikatorer/actions.test.ts` findes) tilføj en test** der verificerer at `createTemplate` kaldes med `dataProvenans: 'top_down'` når kilde sættes, og `'bottom_up'` når kilde mangler. Følg mock-mønstret i den eksisterende fil. Hvis filen ikke findes, spring dette step.

- [ ] **Step 5: Verificér typecheck + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; alle grønne.

- [ ] **Step 6: Commit**

```bash
git add db/queries/indikator-template.ts app/admin/indikatorer/actions.ts db/seed.ts app/admin/indikatorer/actions.test.ts
git commit -m "feat(fase2): seed provenance + default ud fra kilde ved template-oprettelse

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: /data — provenance-badge + benchmark inline

**Files:**
- Create: `components/datahub/provenans-badge.tsx`
- Modify: `app/(app)/k/[kommune]/data/page.tsx`

**Kontekst:** Læs den fulde /data-fil først (den har Fase 3-ændringer: `FriskhedBadge` i Status-cellen, emissions-banner). Vi rører IKKE Status-cellen; vi tilføjer (a) et provenance-badge i Indikator-cellen ved siden af kilde-chippen, og (b) benchmark-tekst i Seneste-cellen.

- [ ] **Step 1: Provenance-badge-komponent**

```tsx
// components/datahub/provenans-badge.tsx
import { PROVENANS_LABEL, type DataProvenans } from '@/lib/datahub/provenans';

export function ProvenansBadge({ provenans }: { provenans: DataProvenans | null }) {
  if (!provenans) return null;
  const erLokal = provenans === 'bottom_up';
  const stil = erLokal ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${stil}`}>{PROVENANS_LABEL[provenans]}</span>
  );
}
```

- [ ] **Step 2: Hent provenance + benchmark i /data-queryen.** I `aktiveKI`-select'en (app/(app)/k/[kommune]/data/page.tsx), tilføj tre felter fra `indikatorTemplate`:
```typescript
      dataProvenans: indikatorTemplate.dataProvenans,
      dataKarakter: indikatorTemplate.dataKarakter,
      nationalMaalvaerdi: indikatorTemplate.nationalMaalvaerdi,
```

- [ ] **Step 3: Render badge + benchmark.** Tilføj importer:
```typescript
import { ProvenansBadge } from '@/components/datahub/provenans-badge';
import { benchmarkProcent } from '@/lib/datahub/provenans';
```
I Indikator-cellen, ved siden af den eksisterende kilde-chip (`<span className="rounded-full bg-blue-100 ...">{ki.kilde ? ... : '—'}</span>`), tilføj:
```tsx
                        <ProvenansBadge provenans={ki.dataProvenans} />
```
I Seneste-cellen, erstat den eksisterende værdi-visning:
```tsx
                        {ki.latest ? `${ki.latest.vaerdi} ${ki.enhed} (${ki.latest.aar})` : '—'}
```
med en variant der tilføjer benchmark når `nationalMaalvaerdi` findes:
```tsx
                        {ki.latest ? (
                          <>
                            {ki.latest.vaerdi} {ki.enhed} ({ki.latest.aar})
                            {(() => {
                              const pct = benchmarkProcent(ki.latest.vaerdi, ki.nationalMaalvaerdi);
                              return pct != null ? (
                                <span className="block text-xs text-gray-400">
                                  National målværdi: {ki.nationalMaalvaerdi} ({pct}%)
                                </span>
                              ) : null;
                            })()}
                          </>
                        ) : '—'}
```

- [ ] **Step 4: Verificér typecheck + lint + suite**

Run: `npx tsc --noEmit && npx eslint "app/(app)/k/[kommune]/data/page.tsx" "components/datahub/provenans-badge.tsx" && npx vitest run`
Expected: clean; grønne.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/k/[kommune]/data/page.tsx" components/datahub/provenans-badge.tsx
git commit -m "feat(fase2): provenance-badge + national benchmark inline på /data

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Afsluttende verifikation

- [ ] `npx tsc --noEmit && npx vitest run && npx eslint` — alt grønt, 0 errors.
- [ ] `npx drizzle-kit generate` — "No schema changes" (0018 i sync).
- [ ] Migration 0018 er additiv (kun CREATE TYPE + ADD COLUMN).
- [ ] `git status --short` rent; meta/0018_snapshot.json + _journal.json committet (tjek `git ls-tree HEAD db/migrations/meta/ | grep 0018`).

## Self-Review (udført ved planskrivning)

**1. Spec-dækning:**
- Provenance-felter (top-down/bottom-up + aggregeret/operationel) på template → Task 1 ✓
- Helper (labels + benchmark-%) → Task 2 ✓
- Seed-defaults + default ved oprettelse → Task 3 ✓
- Tillids-badge på /data → Task 4 ✓
- Benchmark synlig ("jeres værdi vs. national målværdi %") → Task 4 ✓
- BBR / 5 kvalitetskriterier / friskhed → bevidst ude (spec §0/§4) ✓
- Ingen falske benchmark-procenter → `benchmarkProcent` null-guards + test (Task 2) ✓

**2. Placeholder-scan:** Ingen TBD. Task 3 Step 2/4 instruerer "læs filen først" fordi de rører eksisterende action/test, men angiver præcis logik. Task 4 rører Fase 3-ændret fil — instruks siger eksplicit hvilke celler (ikke Status).

**3. Type-konsistens:** `DataProvenans`/`DataKarakter` defineres i Task 2, bruges i createTemplate (Task 3), badge (Task 4). `benchmarkProcent(vaerdi, maalvaerdi)`-signatur ens. `indikatorTemplate.dataProvenans`-kolonne (Task 1) matcher query-select (Task 4). Migration-meta skal committes (tjek i afsluttende verifikation — undgå Fase 1's 0017-metadata-bug hvor `git add db/migrations` blev udeladt).

**Bemærkning:** Task 1 er deterministisk schema (kan selv-verificeres). Task 2 er ren logik (review). Task 3 (seed/default) + Task 4 (UI) fortjener uafhængig review.
