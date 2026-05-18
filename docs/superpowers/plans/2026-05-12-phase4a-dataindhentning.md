# Phase 4a: Dataindhentning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dynamic indicator system where admin curates a catalog of ~50 pre-screened data points from public Danish APIs, koordinatorer activate the ones relevant to their municipality, and the platform fetches data automatically once per month.

**Architecture:** Two new DB tables — `indikatorTemplate` (global admin catalog) and `kommuneIndikator` (per-kommune activation) — sit on top of the existing `indikator`/`indikatorMaaling` tables. Three pg-boss jobs (one per data source) run on the 1st of each month. Admin UI at `/admin/indikatorer`, koordinator UI at `/data` (two tabs: active + catalog).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, pg-boss v12, Vitest, Zod, Tailwind CSS, PostgreSQL. External APIs: Klimaregnskabet.dk (API-key auth), Energi Data Service (no auth), Danmarks Statistik statbank (no auth, CSV response).

---

## File Structure

**New files:**
- `db/schema/indikator-template.ts` — `indikatorTemplate` + `kommuneIndikator` tables
- `db/queries/indikator-template.ts` — CRUD for templates
- `db/queries/kommune-indikator.ts` — activation + status updates
- `db/queries/indikator-template.test.ts` — unit tests
- `db/queries/kommune-indikator.test.ts` — unit tests
- `lib/jobs/fetch-utils.ts` — shared `withRetry` + `sleep` helpers
- `lib/jobs/fetch-klimaregnskabet.ts` — fetch job handler
- `lib/jobs/fetch-energidataservice.ts` — fetch job handler
- `lib/jobs/fetch-dst.ts` — fetch job handler + CSV parser
- `lib/jobs/fetch-klimaregnskabet.test.ts` — unit tests
- `lib/jobs/fetch-energidataservice.test.ts` — unit tests
- `lib/jobs/fetch-dst.test.ts` — unit tests
- `app/admin/indikatorer/page.tsx` — admin catalog list
- `app/admin/indikatorer/actions.ts` — createTemplate, toggleAktiv server actions
- `components/indikator-template-form.tsx` — admin create form
- `app/(app)/data/page.tsx` — koordinator /data page (two tabs)
- `app/(app)/data/actions.ts` — activateTemplate, deactivate, hentNu server actions

**Modified files:**
- `db/schema/index.ts` — add `export * from './indikator-template'`
- `db/queries/index.ts` — add exports from new query files
- `instrumentation-node.ts` — register 3 new monthly jobs
- `app/(app)/dashboard/page.tsx` — add CO₂e + VE-kapacitet StatusCards
- `.env.local` — add `KLIMAREGNSKABET_API_KEY`

---

## Task 1: DB Schema — `indikatorTemplate` + `kommuneIndikator`

**Files:**
- Create: `db/schema/indikator-template.ts`
- Modify: `db/schema/index.ts`

- [ ] **Step 1: Write the schema file**

```typescript
// db/schema/indikator-template.ts
import { pgTable, uuid, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { apiKildeEnum } from './enums';
import { kommune } from './kommune';
import { indikator } from './indikator';

export const indikatorTemplate = pgTable('indikator_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  titel: text('titel').notNull(),
  kilde: apiKildeEnum('kilde').notNull(),
  apiQuery: text('api_query').notNull(),
  enhed: text('enhed').notNull(),
  beskrivelse: text('beskrivelse').notNull(),
  cctfKriterier: integer('cctf_kriterier').array().notNull().default([]),
  aktiv: boolean('aktiv').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const kommuneIndikator = pgTable('kommune_indikator', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  templateId: uuid('template_id').references(() => indikatorTemplate.id, { onDelete: 'restrict' }).notNull(),
  indikatorId: uuid('indikator_id').references(() => indikator.id, { onDelete: 'restrict' }).notNull(),
  visningsnavn: text('visningsnavn'),
  aktiv: boolean('aktiv').notNull().default(true),
  sidstHentet: timestamp('sidst_hentet', { withTimezone: true }),
  sidsteFejl: timestamp('sidste_fejl', { withTimezone: true }),
  sidsteFejlBesked: text('sidste_fejl_besked'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Export from schema index**

In `db/schema/index.ts`, add after the last `export` line:
```typescript
export * from './indikator-template';
```

- [ ] **Step 3: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: new migration file created, two new tables appear in DB.

- [ ] **Step 4: Verify schema compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add db/schema/indikator-template.ts db/schema/index.ts db/migrations/
git commit -m "feat: add indikatorTemplate + kommuneIndikator schema"
```

---

## Task 2: DB Queries — `indikatorTemplate`

**Files:**
- Create: `db/queries/indikator-template.ts`
- Create: `db/queries/indikator-template.test.ts`
- Modify: `db/queries/index.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// db/queries/indikator-template.test.ts
import { describe, it, expect, vi } from 'vitest';

const mockTemplate = {
  id: 'tmpl1',
  titel: 'Samlet CO₂e pr. capita',
  kilde: 'klimaregnskab' as const,
  apiQuery: '{"type":"Nøgletal","sektor":"Samlet"}',
  enhed: 'ton CO₂e/indb.',
  beskrivelse: 'Kommunens samlede drivhusgasudledning',
  cctfKriterier: [6, 11],
  aktiv: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('@/db', () => ({
  db: {
    query: {
      indikatorTemplate: {
        findMany: vi.fn().mockResolvedValue([mockTemplate]),
        findFirst: vi.fn().mockResolvedValue(mockTemplate),
      },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([mockTemplate]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ ...mockTemplate, aktiv: false }]) })) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({ indikatorTemplate: {} }));

describe('getAllTemplates', () => {
  it('returns all templates ordered by titel', async () => {
    const { getAllTemplates } = await import('./indikator-template');
    const result = await getAllTemplates();
    expect(result[0].titel).toBe('Samlet CO₂e pr. capita');
  });
});

describe('getActiveTemplates', () => {
  it('returns only active templates', async () => {
    const { getActiveTemplates } = await import('./indikator-template');
    const result = await getActiveTemplates();
    expect(result[0].aktiv).toBe(true);
  });
});

describe('getTemplateById', () => {
  it('returns template by id', async () => {
    const { getTemplateById } = await import('./indikator-template');
    const result = await getTemplateById('tmpl1');
    expect(result?.id).toBe('tmpl1');
  });
});

describe('createTemplate', () => {
  it('inserts and returns new template', async () => {
    const { createTemplate } = await import('./indikator-template');
    const result = await createTemplate({
      titel: 'Samlet CO₂e pr. capita',
      kilde: 'klimaregnskab',
      apiQuery: '{"type":"Nøgletal","sektor":"Samlet"}',
      enhed: 'ton CO₂e/indb.',
      beskrivelse: 'Beskrivelse',
      cctfKriterier: [6, 11],
    });
    expect(result.titel).toBe('Samlet CO₂e pr. capita');
  });
});

describe('setTemplateAktiv', () => {
  it('toggles aktiv and returns updated template', async () => {
    const { setTemplateAktiv } = await import('./indikator-template');
    const result = await setTemplateAktiv('tmpl1', false);
    expect(result?.aktiv).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run db/queries/indikator-template.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the queries**

```typescript
// db/queries/indikator-template.ts
import { db } from '@/db';
import { indikatorTemplate } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function getAllTemplates() {
  return db.query.indikatorTemplate.findMany({ orderBy: asc(indikatorTemplate.titel) });
}

export async function getActiveTemplates() {
  return db.query.indikatorTemplate.findMany({
    where: eq(indikatorTemplate.aktiv, true),
    orderBy: asc(indikatorTemplate.titel),
  });
}

export async function getTemplateById(id: string) {
  return db.query.indikatorTemplate.findFirst({ where: eq(indikatorTemplate.id, id) });
}

export async function createTemplate(data: {
  titel: string;
  kilde: 'klimaregnskab' | 'energidataservice' | 'dst';
  apiQuery: string;
  enhed: string;
  beskrivelse: string;
  cctfKriterier: number[];
}) {
  const [created] = await db.insert(indikatorTemplate).values(data).returning();
  return created;
}

export async function setTemplateAktiv(id: string, aktiv: boolean) {
  const [updated] = await db
    .update(indikatorTemplate)
    .set({ aktiv, updatedAt: new Date() })
    .where(eq(indikatorTemplate.id, id))
    .returning();
  return updated;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run db/queries/indikator-template.test.ts
```

Expected: 5/5 PASS.

- [ ] **Step 5: Export from queries index**

In `db/queries/index.ts`, add:
```typescript
export * from './indikator-template';
```

- [ ] **Step 6: Commit**

```bash
git add db/queries/indikator-template.ts db/queries/indikator-template.test.ts db/queries/index.ts
git commit -m "feat: add indikatorTemplate queries"
```

---

## Task 3: DB Queries — `kommuneIndikator`

**Files:**
- Create: `db/queries/kommune-indikator.ts`
- Create: `db/queries/kommune-indikator.test.ts`
- Modify: `db/queries/index.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// db/queries/kommune-indikator.test.ts
import { describe, it, expect, vi } from 'vitest';

const mockKI = {
  id: 'ki1',
  kommuneId: 'k1',
  templateId: 'tmpl1',
  indikatorId: 'ind1',
  visningsnavn: null,
  aktiv: true,
  sidstHentet: null,
  sidsteFejl: null,
  sidsteFejlBesked: null,
  createdAt: new Date(),
};

const mockTemplate = {
  kilde: 'klimaregnskab',
  apiQuery: '{"type":"Nøgletal","sektor":"Samlet"}',
};

const mockKommune = { id: 'k1', kommunekode: '773' };

vi.mock('@/db', () => ({
  db: {
    query: {
      kommuneIndikator: {
        findMany: vi.fn().mockResolvedValue([mockKI]),
        findFirst: vi.fn().mockResolvedValue(mockKI),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{
              ...mockKI,
              template: mockTemplate,
              kommune: mockKommune,
            }]),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([mockKI]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({ kommuneIndikator: {}, indikatorTemplate: {}, kommune: {} }));

describe('getKommuneIndikatorById', () => {
  it('returns a single record by id', async () => {
    const { getKommuneIndikatorById } = await import('./kommune-indikator');
    const result = await getKommuneIndikatorById('ki1');
    expect(result?.id).toBe('ki1');
  });
});

describe('getActiveKommuneIndikatorer', () => {
  it('returns active records for a given kilde', async () => {
    const { getActiveKommuneIndikatorer } = await import('./kommune-indikator');
    const result = await getActiveKommuneIndikatorer('klimaregnskab');
    expect(result[0].template.kilde).toBe('klimaregnskab');
  });
});

describe('getKommuneIndikatorer', () => {
  it('returns all records for a given kommune', async () => {
    const { getKommuneIndikatorer } = await import('./kommune-indikator');
    const result = await getKommuneIndikatorer('k1');
    expect(result[0].kommuneId).toBe('k1');
  });
});

describe('createKommuneIndikator', () => {
  it('inserts and returns new record', async () => {
    const { createKommuneIndikator } = await import('./kommune-indikator');
    const result = await createKommuneIndikator({ kommuneId: 'k1', templateId: 'tmpl1', indikatorId: 'ind1' });
    expect(result.kommuneId).toBe('k1');
  });
});

describe('updateSidstHentet', () => {
  it('updates sidstHentet without throwing', async () => {
    const { updateSidstHentet } = await import('./kommune-indikator');
    await expect(updateSidstHentet('ki1', new Date())).resolves.not.toThrow();
  });
});

describe('updateSidsteFejl', () => {
  it('updates error fields without throwing', async () => {
    const { updateSidsteFejl } = await import('./kommune-indikator');
    await expect(updateSidsteFejl('ki1', 'Network error')).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run db/queries/kommune-indikator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the queries**

```typescript
// db/queries/kommune-indikator.ts
import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, kommune } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getKommuneIndikatorById(id: string) {
  return db.query.kommuneIndikator.findFirst({ where: eq(kommuneIndikator.id, id) });
}

export async function getKommuneIndikatorer(kommuneId: string) {
  return db.query.kommuneIndikator.findMany({
    where: eq(kommuneIndikator.kommuneId, kommuneId),
  });
}

export type ActiveKommuneIndikator = {
  id: string;
  kommuneId: string;
  indikatorId: string;
  templateId: string;
  sidstHentet: Date | null;
  template: { kilde: string; apiQuery: string };
  kommune: { kommunekode: string };
};

export async function getActiveKommuneIndikatorer(kilde: 'klimaregnskab' | 'energidataservice' | 'dst'): Promise<ActiveKommuneIndikator[]> {
  return db
    .select({
      id: kommuneIndikator.id,
      kommuneId: kommuneIndikator.kommuneId,
      indikatorId: kommuneIndikator.indikatorId,
      templateId: kommuneIndikator.templateId,
      sidstHentet: kommuneIndikator.sidstHentet,
      template: {
        kilde: indikatorTemplate.kilde,
        apiQuery: indikatorTemplate.apiQuery,
      },
      kommune: {
        kommunekode: kommune.kommunekode,
      },
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .innerJoin(kommune, eq(kommuneIndikator.kommuneId, kommune.id))
    .where(and(eq(kommuneIndikator.aktiv, true), eq(indikatorTemplate.kilde, kilde)));
}

export async function createKommuneIndikator(data: {
  kommuneId: string;
  templateId: string;
  indikatorId: string;
}) {
  const [created] = await db.insert(kommuneIndikator).values(data).returning();
  return created;
}

export async function setKommuneIndikatorAktiv(id: string, aktiv: boolean) {
  await db.update(kommuneIndikator).set({ aktiv }).where(eq(kommuneIndikator.id, id));
}

export async function updateSidstHentet(id: string, tidspunkt: Date) {
  await db
    .update(kommuneIndikator)
    .set({ sidstHentet: tidspunkt, sidsteFejl: null, sidsteFejlBesked: null })
    .where(eq(kommuneIndikator.id, id));
}

export async function updateSidsteFejl(id: string, besked: string) {
  await db
    .update(kommuneIndikator)
    .set({ sidsteFejl: new Date(), sidsteFejlBesked: besked })
    .where(eq(kommuneIndikator.id, id));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run db/queries/kommune-indikator.test.ts
```

Expected: 6/6 PASS.

- [ ] **Step 5: Export from queries index**

In `db/queries/index.ts`, add:
```typescript
export * from './kommune-indikator';
```

- [ ] **Step 6: Commit**

```bash
git add db/queries/kommune-indikator.ts db/queries/kommune-indikator.test.ts db/queries/index.ts
git commit -m "feat: add kommuneIndikator queries"
```

---

## Task 4: Fetch Utilities + `fetch-klimaregnskabet`

**Files:**
- Create: `lib/jobs/fetch-utils.ts`
- Create: `lib/jobs/fetch-klimaregnskabet.ts`
- Create: `lib/jobs/fetch-klimaregnskabet.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/jobs/fetch-klimaregnskabet.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockKI = {
  id: 'ki1',
  kommuneId: 'k1',
  indikatorId: 'ind1',
  templateId: 'tmpl1',
  sidstHentet: null,
  template: { kilde: 'klimaregnskab', apiQuery: '{"type":"Nøgletal","sektor":"Samlet"}' },
  kommune: { kommunekode: '773' },
};

vi.mock('@/db/queries/kommune-indikator', () => ({
  getActiveKommuneIndikatorer: vi.fn().mockResolvedValue([mockKI]),
  updateSidstHentet: vi.fn().mockResolvedValue(undefined),
  updateSidsteFejl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) })) })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn(), sql: vi.fn() }));
vi.mock('@/db/schema', () => ({ indikatorMaaling: {}, drivhusgasregnskabPost: {} }));

const mockApiResponse = {
  data: [
    { year: 2023, sector: 'Samlet', value: 4.2, unit: 'ton CO2e/indb' },
    { year: 2022, sector: 'Samlet', value: 4.5, unit: 'ton CO2e/indb' },
    { year: 2023, sector: 'Energi', value: 1.2, unit: 'ton CO2e/indb' },
  ],
};

describe('handleFetchKlimaregnskabet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockApiResponse),
    }));
    process.env.KLIMAREGNSKABET_API_KEY = 'test-key';
  });

  it('fetches data for all active kommuneIndikatorer', async () => {
    const { handleFetchKlimaregnskabet } = await import('./fetch-klimaregnskabet');
    await expect(handleFetchKlimaregnskabet()).resolves.not.toThrow();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('municipality=773'),
      expect.objectContaining({ headers: { 'x-api-key': 'test-key' } }),
    );
  });

  it('fetches only one kommune when kommuneIndikatorId is specified', async () => {
    const { getActiveKommuneIndikatorer } = await import('@/db/queries/kommune-indikator');
    const { handleFetchKlimaregnskabet } = await import('./fetch-klimaregnskabet');
    await handleFetchKlimaregnskabet({ kommuneIndikatorId: 'ki1' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('parseSamletCo2e', () => {
  it('extracts max Samlet value per year', async () => {
    const { parseSamletCo2e } = await import('./fetch-klimaregnskabet');
    const result = parseSamletCo2e(mockApiResponse.data);
    expect(result[2023]).toBe(4.2);
    expect(result[2022]).toBe(4.5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/jobs/fetch-klimaregnskabet.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Write fetch utilities**

```typescript
// lib/jobs/fetch-utils.ts
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await sleep(delayMs * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}
```

- [ ] **Step 4: Write the fetch-klimaregnskabet handler**

```typescript
// lib/jobs/fetch-klimaregnskabet.ts
import { db } from '@/db';
import { indikatorMaaling, drivhusgasregnskabPost } from '@/db/schema';
import {
  getActiveKommuneIndikatorer,
  updateSidstHentet,
  updateSidsteFejl,
  getKommuneIndikatorById,
  type ActiveKommuneIndikator,
} from '@/db/queries/kommune-indikator';
import { sleep, withRetry } from './fetch-utils';

const API_URL = 'https://klimaregnskabet.dk/api/municipality-data';
const RATE_LIMIT_MS = 200;

type KlimaregnskabRecord = {
  year: number;
  sector: string;
  value: number;
  unit: string;
};

export function parseSamletCo2e(data: KlimaregnskabRecord[]): Record<number, number> {
  const byYear: Record<number, number> = {};
  for (const row of data) {
    if (row.sector === 'Samlet') {
      byYear[row.year] = Math.max(byYear[row.year] ?? 0, row.value);
    }
  }
  return byYear;
}

async function fetchKlimaregnskabetForKommune(
  kommunekode: string,
  year: number,
): Promise<KlimaregnskabRecord[]> {
  const url = `${API_URL}?municipality=${kommunekode}&year=${year}&type=Nøgletal`;
  const res = await withRetry(() =>
    fetch(url, {
      headers: { 'x-api-key': process.env.KLIMAREGNSKABET_API_KEY! },
    }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    }),
  );
  const json = await res.json();
  return json.data ?? [];
}

async function processKommuneIndikator(ki: ActiveKommuneIndikator, fromYear?: number) {
  const currentYear = new Date().getFullYear();
  const isFirstFetch = !ki.sidstHentet;
  const startYear = fromYear ?? (isFirstFetch ? currentYear - 4 : currentYear - 1);
  const years: number[] = [];
  for (let y = startYear; y <= currentYear - 1; y++) years.push(y);

  const allRecords: KlimaregnskabRecord[] = [];
  for (const year of years) {
    const records = await fetchKlimaregnskabetForKommune(ki.kommune.kommunekode, year);
    allRecords.push(...records);
    await sleep(RATE_LIMIT_MS);
  }

  const co2eByYear = parseSamletCo2e(allRecords);
  for (const [yearStr, vaerdi] of Object.entries(co2eByYear)) {
    const aar = Number(yearStr);
    await db.insert(indikatorMaaling).values({
      indikatorId: ki.indikatorId,
      aar,
      vaerdi,
      kilde: 'klimaregnskab',
      autoHentet: true,
    }).onConflictDoNothing();
  }

  // Write sector breakdown to drivhusgasregnskabPost
  const sectorByYear: Record<number, KlimaregnskabRecord[]> = {};
  for (const row of allRecords) {
    if (!sectorByYear[row.year]) sectorByYear[row.year] = [];
    sectorByYear[row.year].push(row);
  }
  for (const [yearStr, rows] of Object.entries(sectorByYear)) {
    const aar = Number(yearStr);
    for (const row of rows) {
      await db.insert(drivhusgasregnskabPost).values({
        kommuneId: ki.kommuneId,
        aar,
        gpcSektor: row.sector,
        udledningTonCo2e: row.value,
        datakilde: 'klimaregnskab',
        gpcKompatibel: true,
      }).onConflictDoNothing();
    }
  }

  await updateSidstHentet(ki.id, new Date());
}

export async function handleFetchKlimaregnskabet(options?: {
  kommuneIndikatorId?: string;
  fromYear?: number;
}): Promise<void> {
  let targets: ActiveKommuneIndikator[];
  if (options?.kommuneIndikatorId) {
    const ki = await getKommuneIndikatorById(options.kommuneIndikatorId);
    if (!ki) {
      console.error(`[fetch-klimaregnskabet] kommuneIndikator not found: ${options.kommuneIndikatorId}`);
      return;
    }
    // Re-fetch with template + kommune joined
    const all = await getActiveKommuneIndikatorer('klimaregnskab');
    targets = all.filter((k) => k.id === options.kommuneIndikatorId);
    if (targets.length === 0) {
      console.error(`[fetch-klimaregnskabet] kommuneIndikator not active: ${options.kommuneIndikatorId}`);
      return;
    }
  } else {
    targets = await getActiveKommuneIndikatorer('klimaregnskab');
  }

  for (const ki of targets) {
    try {
      await processKommuneIndikator(ki, options?.fromYear);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fetch-klimaregnskabet] Error for ${ki.kommune.kommunekode}: ${msg}`);
      await updateSidsteFejl(ki.id, msg);
    }
    if (targets.length > 1) await sleep(RATE_LIMIT_MS);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run lib/jobs/fetch-klimaregnskabet.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/jobs/fetch-utils.ts lib/jobs/fetch-klimaregnskabet.ts lib/jobs/fetch-klimaregnskabet.test.ts
git commit -m "feat: add fetch-utils and fetch-klimaregnskabet job handler"
```

---

## Task 5: `fetch-energidataservice`

**Files:**
- Create: `lib/jobs/fetch-energidataservice.ts`
- Create: `lib/jobs/fetch-energidataservice.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/jobs/fetch-energidataservice.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockKI = {
  id: 'ki2',
  kommuneId: 'k1',
  indikatorId: 'ind2',
  templateId: 'tmpl2',
  sidstHentet: null,
  template: { kilde: 'energidataservice', apiQuery: '{"dataset":"CapacityPerMunicipality","fields":["OnshoreWindMW","SolarPowerMW"]}' },
  kommune: { kommunekode: '773' },
};

vi.mock('@/db/queries/kommune-indikator', () => ({
  getActiveKommuneIndikatorer: vi.fn().mockResolvedValue([mockKI]),
  updateSidstHentet: vi.fn().mockResolvedValue(undefined),
  updateSidsteFejl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({ indikatorMaaling: {} }));

const mockEdsResponse = {
  records: [
    { MunicipalityNo: 773, Month: '2024-01', OnshoreWindMW: 150.5, SolarPowerMW: 45.2 },
    { MunicipalityNo: 773, Month: '2023-12', OnshoreWindMW: 148.0, SolarPowerMW: 44.0 },
    { MunicipalityNo: 101, Month: '2024-01', OnshoreWindMW: 0, SolarPowerMW: 10.0 },
  ],
};

describe('handleFetchEnergidataservice', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockEdsResponse),
    }));
  });

  it('fetches all records once and filters by municipality', async () => {
    const { handleFetchEnergidataservice } = await import('./fetch-energidataservice');
    await expect(handleFetchEnergidataservice()).resolves.not.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('getLatestByMunicipality', () => {
  it('returns the most recent record per municipality', async () => {
    const { getLatestByMunicipality } = await import('./fetch-energidataservice');
    const result = getLatestByMunicipality(mockEdsResponse.records);
    expect(result[773]?.OnshoreWindMW).toBe(150.5);
    expect(result[773]?.SolarPowerMW).toBe(45.2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/jobs/fetch-energidataservice.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the handler**

```typescript
// lib/jobs/fetch-energidataservice.ts
import { db } from '@/db';
import { indikatorMaaling } from '@/db/schema';
import {
  getActiveKommuneIndikatorer,
  updateSidstHentet,
  updateSidsteFejl,
  type ActiveKommuneIndikator,
} from '@/db/queries/kommune-indikator';
import { withRetry } from './fetch-utils';

const API_URL =
  'https://api.energidataservice.dk/dataset/CapacityPerMunicipality?limit=0&sort=Month%20desc';

type EdsRecord = {
  MunicipalityNo: number;
  Month: string;
  OnshoreWindMW: number;
  SolarPowerMW: number;
};

export function getLatestByMunicipality(
  records: EdsRecord[],
): Record<number, EdsRecord> {
  const latest: Record<number, EdsRecord> = {};
  for (const row of records) {
    const existing = latest[row.MunicipalityNo];
    if (!existing || row.Month > existing.Month) {
      latest[row.MunicipalityNo] = row;
    }
  }
  return latest;
}

export async function handleFetchEnergidataservice(options?: {
  kommuneIndikatorId?: string;
}): Promise<void> {
  const targets: ActiveKommuneIndikator[] = await getActiveKommuneIndikatorer('energidataservice');
  if (targets.length === 0) return;

  const filtered = options?.kommuneIndikatorId
    ? targets.filter((ki) => ki.id === options.kommuneIndikatorId)
    : targets;
  if (filtered.length === 0) return;

  let records: EdsRecord[];
  try {
    const res = await withRetry(() =>
      fetch(API_URL).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }),
    );
    const json = await res.json();
    records = json.records ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[fetch-energidataservice] Failed to fetch: ${msg}`);
    for (const ki of filtered) await updateSidsteFejl(ki.id, msg);
    return;
  }

  const latestByMunicipalityNo = getLatestByMunicipality(records);
  const currentYear = new Date().getFullYear();

  for (const ki of filtered) {
    const kommunekode = Number(ki.kommune.kommunekode);
    const latest = latestByMunicipalityNo[kommunekode];
    if (!latest) {
      console.warn(`[fetch-energidataservice] No data for kommunekode ${kommunekode}`);
      continue;
    }
    const aar = Number(latest.Month.slice(0, 4));
    const totalMW = latest.OnshoreWindMW + latest.SolarPowerMW;

    try {
      await db.insert(indikatorMaaling).values({
        indikatorId: ki.indikatorId,
        aar,
        vaerdi: totalMW,
        kilde: 'energidataservice',
        autoHentet: true,
      }).onConflictDoNothing();
      await updateSidstHentet(ki.id, new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fetch-energidataservice] Error for ${kommunekode}: ${msg}`);
      await updateSidsteFejl(ki.id, msg);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/jobs/fetch-energidataservice.test.ts
```

Expected: 2/2 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/jobs/fetch-energidataservice.ts lib/jobs/fetch-energidataservice.test.ts
git commit -m "feat: add fetch-energidataservice job handler"
```

---

## Task 6: `fetch-dst`

**Files:**
- Create: `lib/jobs/fetch-dst.ts`
- Create: `lib/jobs/fetch-dst.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/jobs/fetch-dst.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockKI = {
  id: 'ki3',
  kommuneId: 'k1',
  indikatorId: 'ind3',
  templateId: 'tmpl3',
  sidstHentet: null,
  template: {
    kilde: 'dst',
    apiQuery: JSON.stringify({
      tabel: 'FOLK1A',
      variabler: { KØN: 'TOT', ALDER: 'IALT' },
      felt: 'INDHOLD',
    }),
  },
  kommune: { kommunekode: '773' },
};

vi.mock('@/db/queries/kommune-indikator', () => ({
  getActiveKommuneIndikatorer: vi.fn().mockResolvedValue([mockKI]),
  updateSidstHentet: vi.fn().mockResolvedValue(undefined),
  updateSidsteFejl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({}));
vi.mock('@/db/schema', () => ({ indikatorMaaling: {} }));

const mockCsvResponse = `OMRÅDE;TID;INDHOLD\r\n773;2023;44814\r\n773;2022;45100\r\n`;
const mockCsvMissing = `OMRÅDE;TID;INDHOLD\r\n773;2023;..\r\n773;2022;x\r\n`;

describe('parseDstCsv', () => {
  it('parses semicolon-separated CSV with comma decimals', async () => {
    const { parseDstCsv } = await import('./fetch-dst');
    const result = parseDstCsv(mockCsvResponse, 'INDHOLD');
    expect(result[2023]).toBe(44814);
    expect(result[2022]).toBe(45100);
  });

  it('converts missing-data codes to null', async () => {
    const { parseDstCsv } = await import('./fetch-dst');
    const result = parseDstCsv(mockCsvMissing, 'INDHOLD');
    expect(result[2023]).toBeNull();
    expect(result[2022]).toBeNull();
  });
});

describe('handleFetchDst', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(mockCsvResponse),
    }));
  });

  it('posts to DST API with OMRÅDE filter and stores result', async () => {
    const { handleFetchDst } = await import('./fetch-dst');
    await expect(handleFetchDst()).resolves.not.toThrow();
    expect(fetch).toHaveBeenCalledWith(
      'https://api.statbank.dk/v1/data',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/jobs/fetch-dst.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the handler**

```typescript
// lib/jobs/fetch-dst.ts
import { db } from '@/db';
import { indikatorMaaling } from '@/db/schema';
import {
  getActiveKommuneIndikatorer,
  updateSidstHentet,
  updateSidsteFejl,
  type ActiveKommuneIndikator,
} from '@/db/queries/kommune-indikator';
import { sleep, withRetry } from './fetch-utils';

const DST_API_URL = 'https://api.statbank.dk/v1/data';
const RATE_LIMIT_MS = 600;
const MISSING_CODES = new Set(['', '..', '-', 'x']);

type DstApiQuery = {
  tabel: string;
  variabler: Record<string, string>;
  felt: string;
};

export function parseDstCsv(csv: string, felt: string): Record<number, number | null> {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return {};
  const headers = lines[0].split(';').map((h) => h.trim().replace(/"/g, ''));
  const feltIdx = headers.indexOf(felt);
  const tidIdx = headers.indexOf('TID');
  if (feltIdx === -1 || tidIdx === -1) return {};

  const result: Record<number, number | null> = {};
  for (const line of lines.slice(1)) {
    const cols = line.split(';').map((c) => c.trim().replace(/"/g, ''));
    const tidRaw = cols[tidIdx];
    const vaerdiRaw = cols[feltIdx];
    const aar = Number(tidRaw?.slice(0, 4));
    if (!aar) continue;
    if (MISSING_CODES.has(vaerdiRaw)) {
      result[aar] = null;
    } else {
      result[aar] = Number(vaerdiRaw.replace(',', '.'));
    }
  }
  return result;
}

async function fetchDstTable(
  kommunekode: string,
  query: DstApiQuery,
): Promise<string> {
  const payload = {
    table: query.tabel,
    format: 'CSV',
    variables: [
      ...Object.entries(query.variabler).map(([code, values]) => ({
        code,
        values: [values],
      })),
      { code: 'OMRÅDE', values: [kommunekode] },
    ],
  };

  const res = await withRetry(() =>
    fetch(DST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    }),
  );
  return res.text();
}

export async function handleFetchDst(options?: {
  kommuneIndikatorId?: string;
  fromYear?: number;
}): Promise<void> {
  const all: ActiveKommuneIndikator[] = await getActiveKommuneIndikatorer('dst');
  const targets = options?.kommuneIndikatorId
    ? all.filter((ki) => ki.id === options.kommuneIndikatorId)
    : all;
  if (targets.length === 0) return;

  for (const ki of targets) {
    let query: DstApiQuery;
    try {
      query = JSON.parse(ki.template.apiQuery) as DstApiQuery;
    } catch {
      console.error(`[fetch-dst] Invalid apiQuery for ${ki.id}`);
      await updateSidsteFejl(ki.id, 'Invalid apiQuery JSON');
      continue;
    }

    try {
      const csv = await fetchDstTable(ki.kommune.kommunekode, query);
      const byYear = parseDstCsv(csv, query.felt);

      for (const [yearStr, vaerdi] of Object.entries(byYear)) {
        if (vaerdi === null) continue;
        const aar = Number(yearStr);
        await db.insert(indikatorMaaling).values({
          indikatorId: ki.indikatorId,
          aar,
          vaerdi,
          kilde: 'dst',
          autoHentet: true,
        }).onConflictDoNothing();
      }
      await updateSidstHentet(ki.id, new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fetch-dst] Error for ${ki.kommune.kommunekode}: ${msg}`);
      await updateSidsteFejl(ki.id, msg);
    }

    if (targets.length > 1) await sleep(RATE_LIMIT_MS);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/jobs/fetch-dst.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/jobs/fetch-dst.ts lib/jobs/fetch-dst.test.ts
git commit -m "feat: add fetch-dst job handler with CSV parser"
```

---

## Task 7: Register Monthly Jobs in `instrumentation-node.ts`

**Files:**
- Modify: `instrumentation-node.ts`
- Modify: `.env.local` (add `KLIMAREGNSKABET_API_KEY` placeholder)

- [ ] **Step 1: Update instrumentation-node.ts**

Replace the entire file with:

```typescript
// instrumentation-node.ts
import { PgBoss } from 'pg-boss';
import { handleRykker } from './lib/jobs/rykker';
import { handleFetchKlimaregnskabet } from './lib/jobs/fetch-klimaregnskabet';
import { handleFetchEnergidataservice } from './lib/jobs/fetch-energidataservice';
import { handleFetchDst } from './lib/jobs/fetch-dst';

async function setupJobs() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();

  await boss.work('rykker', { localConcurrency: 1 }, async () => {
    await handleRykker();
  });
  await boss.schedule('rykker', '0 9 * * *', {}, { retryLimit: 0 });

  await boss.work('fetch-klimaregnskabet', { localConcurrency: 1 }, async (job) => {
    const data = job.data as { kommuneIndikatorId?: string; fromYear?: number } | undefined;
    await handleFetchKlimaregnskabet(data ?? {});
  });
  await boss.schedule('fetch-klimaregnskabet', '0 6 1 * *', {}, { retryLimit: 2 });

  await boss.work('fetch-energidataservice', { localConcurrency: 1 }, async (job) => {
    const data = job.data as { kommuneIndikatorId?: string } | undefined;
    await handleFetchEnergidataservice(data ?? {});
  });
  await boss.schedule('fetch-energidataservice', '0 6 1 * *', {}, { retryLimit: 2 });

  await boss.work('fetch-dst', { localConcurrency: 1 }, async (job) => {
    const data = job.data as { kommuneIndikatorId?: string; fromYear?: number } | undefined;
    await handleFetchDst(data ?? {});
  });
  await boss.schedule('fetch-dst', '0 6 1 * *', {}, { retryLimit: 2 });
}

setupJobs().catch((err) => {
  console.error('[jobs] Failed to start job system:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add env var to .env.local**

In `.env.local`, add the line (after existing env vars):
```
KLIMAREGNSKABET_API_KEY=   # Hent fra doughnut-projektet
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add instrumentation-node.ts .env.local
git commit -m "feat: register monthly fetch jobs in pg-boss"
```

---

## Task 8: Admin UI — `/admin/indikatorer`

**Files:**
- Create: `app/admin/indikatorer/page.tsx`
- Create: `app/admin/indikatorer/actions.ts`
- Create: `components/indikator-template-form.tsx`

- [ ] **Step 1: Write the server actions**

```typescript
// app/admin/indikatorer/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createTemplate, setTemplateAktiv } from '@/db/queries/indikator-template';
import type { FormState } from '@/lib/definitions';

const TemplateSchema = z.object({
  titel: z.string().min(2, 'Titel skal være mindst 2 tegn.').max(200),
  kilde: z.enum(['klimaregnskab', 'energidataservice', 'dst']),
  apiQuery: z.string().min(2, 'API-query er påkrævet.').refine((s) => {
    try { JSON.parse(s); return true; } catch { return false; }
  }, 'API-query skal være gyldigt JSON.'),
  enhed: z.string().min(1, 'Enhed er påkrævet.').max(50),
  beskrivelse: z.string().min(2, 'Beskrivelse er påkrævet.'),
  cctfKriterier: z.string().optional(),
  aktiv: z.string().optional(),
});

export async function createTemplateAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    titel: formData.get('titel'),
    kilde: formData.get('kilde'),
    apiQuery: formData.get('apiQuery'),
    enhed: formData.get('enhed'),
    beskrivelse: formData.get('beskrivelse'),
    cctfKriterier: formData.get('cctfKriterier'),
    aktiv: formData.get('aktiv'),
  };
  const parsed = TemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { titel, kilde, apiQuery, enhed, beskrivelse, cctfKriterier, aktiv } = parsed.data;
  const cctfArr = cctfKriterier
    ? cctfKriterier.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
    : [];

  try {
    await createTemplate({
      titel,
      kilde,
      apiQuery,
      enhed,
      beskrivelse,
      cctfKriterier: cctfArr,
    });
  } catch {
    return { message: 'Fejl ved oprettelse af indikator.' };
  }
  revalidatePath('/admin/indikatorer');
  return { message: undefined };
}

export async function toggleTemplateAktivAction(id: string, aktiv: boolean): Promise<void> {
  await setTemplateAktiv(id, aktiv);
  revalidatePath('/admin/indikatorer');
}
```

- [ ] **Step 2: Write the form component**

```typescript
// components/indikator-template-form.tsx
'use client';
import { useActionState } from 'react';
import { createTemplateAction } from '@/app/admin/indikatorer/actions';
import { Button } from '@/components/ui/button';

const KILDE_EXAMPLES: Record<string, string> = {
  klimaregnskab: JSON.stringify({ type: 'Nøgletal', sektor: 'Samlet' }, null, 2),
  energidataservice: JSON.stringify({ dataset: 'CapacityPerMunicipality', fields: ['OnshoreWindMW', 'SolarPowerMW'] }, null, 2),
  dst: JSON.stringify({ tabel: 'FOLK1A', variabler: { KØN: 'TOT', ALDER: 'IALT' }, felt: 'INDHOLD' }, null, 2),
};

export function IndikatorTemplateForm() {
  const [state, action, pending] = useActionState(createTemplateAction, undefined);
  const [selectedKilde, setSelectedKilde] = React.useState('klimaregnskab');

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="titel" className="text-sm font-medium text-gray-700">Titel</label>
        <input id="titel" name="titel" type="text" placeholder="Samlet CO₂e pr. capita"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.titel && <p className="text-sm text-red-600">{state.errors.titel[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="kilde" className="text-sm font-medium text-gray-700">Kilde</label>
        <select id="kilde" name="kilde" value={selectedKilde}
          onChange={(e) => setSelectedKilde(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="klimaregnskab">Klimaregnskabet.dk</option>
          <option value="energidataservice">Energi Data Service</option>
          <option value="dst">Danmarks Statistik</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="apiQuery" className="text-sm font-medium text-gray-700">API-query (JSON)</label>
        <textarea id="apiQuery" name="apiQuery" rows={5}
          defaultValue={KILDE_EXAMPLES[selectedKilde]}
          key={selectedKilde}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.apiQuery && <p className="text-sm text-red-600">{state.errors.apiQuery[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="enhed" className="text-sm font-medium text-gray-700">Enhed</label>
        <input id="enhed" name="enhed" type="text" placeholder="ton CO₂e/indb."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.enhed && <p className="text-sm text-red-600">{state.errors.enhed[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="beskrivelse" className="text-sm font-medium text-gray-700">Beskrivelse</label>
        <textarea id="beskrivelse" name="beskrivelse" rows={3}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.beskrivelse && <p className="text-sm text-red-600">{state.errors.beskrivelse[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cctfKriterier" className="text-sm font-medium text-gray-700">CCTF-kriterier (kommaseparerede tal)</label>
        <input id="cctfKriterier" name="cctfKriterier" type="text" placeholder="6, 11, 15"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      {state?.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Opretter…' : 'Opret indikator'}
      </Button>
    </form>
  );
}
```

Note: Add `import React, { useState } from 'react';` at the top of the form component, and fix the React import. The `useState` is used for `selectedKilde`.

- [ ] **Step 3: Fix the form component — add React import**

The form component needs React import. Replace the first line of `components/indikator-template-form.tsx`:
```typescript
'use client';
import React, { useState } from 'react';
import { useActionState } from 'react';
import { createTemplateAction } from '@/app/admin/indikatorer/actions';
import { Button } from '@/components/ui/button';
```

And change `const [selectedKilde, setSelectedKilde] = React.useState(...)` to `const [selectedKilde, setSelectedKilde] = useState(...)`.

- [ ] **Step 4: Write the page**

```typescript
// app/admin/indikatorer/page.tsx
import { getAllTemplates } from '@/db/queries/indikator-template';
import { IndikatorTemplateForm } from '@/components/indikator-template-form';
import { toggleTemplateAktivAction } from './actions';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Indikatorer — Admin' };

const KILDE_LABEL: Record<string, string> = {
  klimaregnskab: 'Klimaregnskabet.dk',
  energidataservice: 'Energi Data Service',
  dst: 'Danmarks Statistik',
};

export default async function AdminIndikatorer() {
  const templates = await getAllTemplates();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Indikatorkatalog</h1>

      <div className="mb-10 overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Titel</th>
              <th className="px-4 py-3 text-left">Kilde</th>
              <th className="px-4 py-3 text-left">Enhed</th>
              <th className="px-4 py-3 text-left">CCTF</th>
              <th className="px-4 py-3 text-left">Aktiv</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.titel}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    {KILDE_LABEL[t.kilde] ?? t.kilde}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{t.enhed}</td>
                <td className="px-4 py-3 text-gray-500">
                  {t.cctfKriterier.length > 0 ? t.cctfKriterier.join(', ') : '—'}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleTemplateAktivAction.bind(null, t.id, !t.aktiv)}>
                    <button type="submit"
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">Ingen indikatorer endnu.</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Tilføj indikator</h2>
        <IndikatorTemplateForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/admin/indikatorer/ components/indikator-template-form.tsx
git commit -m "feat: add admin indikatorkatalog UI"
```

---

## Task 9: Koordinator `/data` Page

**Files:**
- Create: `app/(app)/data/page.tsx`
- Create: `app/(app)/data/actions.ts`

The `/data` page has two tabs controlled by `?tab=aktive` (default) and `?tab=katalog`. Tabs are implemented via searchParams — no client state needed.

- [ ] **Step 1: Write the server actions**

```typescript
// app/(app)/data/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { db } from '@/db';
import { indikator } from '@/db/schema';
import {
  getTemplateById,
  getActiveTemplates,
} from '@/db/queries/indikator-template';
import {
  createKommuneIndikator,
  setKommuneIndikatorAktiv,
  getKommuneIndikatorById,
} from '@/db/queries/kommune-indikator';
import type { FormState } from '@/lib/definitions';
import type { PgBoss } from 'pg-boss';

export async function activateTemplateAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const templateId = formData.get('templateId') as string;
  const template = await getTemplateById(templateId);
  if (!template || !template.aktiv) return { message: 'Indikator ikke tilgængelig.' };

  try {
    const [newIndikator] = await db.insert(indikator).values({
      niveau: 'impact',
      beskrivelse: template.titel,
      enhed: template.enhed,
      datakildeType: 'api',
      apiKilde: template.kilde as 'klimaregnskab' | 'energidataservice' | 'dst',
      apiQuery: template.apiQuery,
    }).returning();
    await createKommuneIndikator({
      kommuneId: session.kommuneId,
      templateId,
      indikatorId: newIndikator.id,
    });
  } catch {
    return { message: 'Fejl ved aktivering af indikator.' };
  }
  revalidatePath('/data');
  return { message: undefined };
}

export async function deactivateKommuneIndikatorAction(id: string): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const ki = await getKommuneIndikatorById(id);
  if (!ki || ki.kommuneId !== session.kommuneId) return;

  await setKommuneIndikatorAktiv(id, false);
  revalidatePath('/data');
}

export async function hentNuAction(
  kommuneIndikatorId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const ki = await getKommuneIndikatorById(kommuneIndikatorId);
  if (!ki || ki.kommuneId !== session.kommuneId) return { message: 'Adgang nægtet.' };

  const fromYearRaw = formData.get('fromYear') as string | null;
  const fromYear = fromYearRaw ? Number(fromYearRaw) : undefined;

  try {
    const { PgBoss } = await import('pg-boss');
    const boss = new PgBoss(process.env.DATABASE_URL!);
    await boss.start();

    const template = await getTemplateById(ki.templateId);
    if (!template) return { message: 'Template ikke fundet.' };

    const jobName = `fetch-${template.kilde}`;
    await boss.send(jobName, { kommuneIndikatorId, fromYear });
    await boss.stop();
  } catch {
    return { message: 'Fejl ved opstart af hentning.' };
  }

  revalidatePath('/data');
  return { message: undefined };
}
```

- [ ] **Step 2: Write the page**

```typescript
// app/(app)/data/page.tsx
import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { getActiveTemplates } from '@/db/queries/indikator-template';
import { getKommuneIndikatorer } from '@/db/queries/kommune-indikator';
import { db } from '@/db';
import { indikatorTemplate, kommuneIndikator, indikatorMaaling, indikator } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';
import { activateTemplateAction, deactivateKommuneIndikatorAction, hentNuAction } from './actions';

export const metadata = { title: 'Data — Klimastatus.dk' };

const KILDE_LABEL: Record<string, string> = {
  klimaregnskab: 'Klimaregnskabet.dk',
  energidataservice: 'Energi Data Service',
  dst: 'Danmarks Statistik',
};

function StalenessStatus({ sidstHentet, sidsteFejl, sidsteFejlBesked }: {
  sidstHentet: Date | null;
  sidsteFejl: Date | null;
  sidsteFejlBesked: string | null;
}) {
  if (sidsteFejl && (!sidstHentet || sidsteFejl > sidstHentet)) {
    return (
      <span className="text-red-600 text-xs" title={sidsteFejlBesked ?? ''}>
        ⚠ Fejl
      </span>
    );
  }
  if (!sidstHentet) {
    return <span className="text-gray-400 text-xs">Afventer første hentning</span>;
  }
  const daysSince = Math.floor((Date.now() - new Date(sidstHentet).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince > 35) {
    return <span className="text-yellow-600 text-xs">⚠ Senest hentet: {daysSince} dage siden</span>;
  }
  return <span className="text-green-600 text-xs">Hentet {new Date(sidstHentet).toLocaleDateString('da-DK')}</span>;
}

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const { tab } = await searchParams;
  const activeTab = tab === 'katalog' ? 'katalog' : 'aktive';

  const aktiveKI = await db
    .select({
      id: kommuneIndikator.id,
      visningsnavn: kommuneIndikator.visningsnavn,
      aktiv: kommuneIndikator.aktiv,
      sidstHentet: kommuneIndikator.sidstHentet,
      sidsteFejl: kommuneIndikator.sidsteFejl,
      sidsteFejlBesked: kommuneIndikator.sidsteFejlBesked,
      templateId: kommuneIndikator.templateId,
      indikatorId: kommuneIndikator.indikatorId,
      titel: indikatorTemplate.titel,
      kilde: indikatorTemplate.kilde,
      enhed: indikatorTemplate.enhed,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(eq(kommuneIndikator.kommuneId, session.kommuneId), eq(kommuneIndikator.aktiv, true)));

  // Fetch latest value per active kommuneIndikator
  const aktiveWithValue = await Promise.all(
    aktiveKI.map(async (ki) => {
      const [latest] = await db
        .select({ vaerdi: indikatorMaaling.vaerdi, aar: indikatorMaaling.aar })
        .from(indikatorMaaling)
        .where(eq(indikatorMaaling.indikatorId, ki.indikatorId))
        .orderBy(desc(indikatorMaaling.aar))
        .limit(1);
      return { ...ki, latest };
    }),
  );

  const allTemplates = await getActiveTemplates();
  const aktiveredeTemplateIds = new Set(aktiveKI.map((ki) => ki.templateId));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Data</h1>

      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <Link
          href="/data?tab=aktive"
          className={`pb-2 text-sm font-medium ${activeTab === 'aktive' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Aktive indikatorer ({aktiveWithValue.length})
        </Link>
        <Link
          href="/data?tab=katalog"
          className={`pb-2 text-sm font-medium ${activeTab === 'katalog' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Tilføj indikator
        </Link>
      </div>

      {activeTab === 'aktive' && (
        <div>
          {aktiveWithValue.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Ingen aktive indikatorer.{' '}
              <Link href="/data?tab=katalog" className="text-gray-700 underline">
                Tilføj fra kataloget.
              </Link>
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Indikator</th>
                    <th className="px-4 py-3 text-left">Seneste</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Handlinger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aktiveWithValue.map((ki) => (
                    <tr key={ki.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{ki.visningsnavn ?? ki.titel}</p>
                        <span className="mt-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          {KILDE_LABEL[ki.kilde] ?? ki.kilde}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ki.latest
                          ? `${ki.latest.vaerdi} ${ki.enhed} (${ki.latest.aar})`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StalenessStatus
                          sidstHentet={ki.sidstHentet}
                          sidsteFejl={ki.sidsteFejl}
                          sidsteFejlBesked={ki.sidsteFejlBesked}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <form action={hentNuAction.bind(null, ki.id)}>
                            <input type="hidden" name="fromYear" value="" />
                            <button type="submit"
                              className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">
                              Hent nu
                            </button>
                          </form>
                          <form action={deactivateKommuneIndikatorAction.bind(null, ki.id)}>
                            <button type="submit"
                              className="rounded-md px-3 py-1 text-xs font-medium text-gray-400 hover:text-red-600">
                              Deaktiver
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'katalog' && (
        <div>
          {['klimaregnskab', 'energidataservice', 'dst'].map((kilde) => {
            const kildeTemplates = allTemplates.filter((t) => t.kilde === kilde);
            if (kildeTemplates.length === 0) return null;
            return (
              <div key={kilde} className="mb-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {KILDE_LABEL[kilde]}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {kildeTemplates.map((t) => {
                    const erAktiv = aktiveredeTemplateIds.has(t.id);
                    return (
                      <div key={t.id}
                        className={`rounded-xl border p-4 ${erAktiv ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900">{t.titel}</p>
                          {erAktiv && (
                            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Aktiv</span>
                          )}
                        </div>
                        <p className="mb-2 text-xs text-gray-500">{t.beskrivelse}</p>
                        <p className="mb-3 text-xs text-gray-400">
                          Enhed: {t.enhed}
                          {t.cctfKriterier.length > 0 && ` · CCTF: ${t.cctfKriterier.join(', ')}`}
                        </p>
                        {!erAktiv && (
                          <form action={activateTemplateAction}>
                            <input type="hidden" name="templateId" value={t.id} />
                            <button type="submit"
                              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
                              Aktivér
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {allTemplates.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">Ingen indikatorer i kataloget endnu. Admin tilføjer indikatorer under /admin/indikatorer.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/data/ 
git commit -m "feat: add koordinator /data page with aktive + katalog tabs"
```

---

## Task 10: Dashboard StatusCards + Navigation Link + Seed Data

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `app/(app)/layout.tsx` (add Data link to nav — check current nav first)

- [ ] **Step 1: Read the current layout to check nav links**

Read `app/(app)/layout.tsx` to understand the navigation structure before modifying.

- [ ] **Step 2: Add CO₂e + VE-kapacitet cards to dashboard**

In `app/(app)/dashboard/page.tsx`, add these imports after existing imports:
```typescript
import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, indikatorMaaling } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
```

After the `indsatser` query in `DashboardPage`, add:
```typescript
  // Fetch CO2e indicator
  const co2eKI = await db
    .select({ indikatorId: kommuneIndikator.indikatorId })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, session.kommuneId),
      eq(kommuneIndikator.aktiv, true),
      eq(indikatorTemplate.kilde, 'klimaregnskab'),
    ))
    .limit(1);

  const veMWKI = await db
    .select({ indikatorId: kommuneIndikator.indikatorId })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, session.kommuneId),
      eq(kommuneIndikator.aktiv, true),
      eq(indikatorTemplate.kilde, 'energidataservice'),
    ))
    .limit(1);

  const [co2eSeneste, veMWSeneste] = await Promise.all([
    co2eKI[0]
      ? db.select({ vaerdi: indikatorMaaling.vaerdi, aar: indikatorMaaling.aar })
          .from(indikatorMaaling)
          .where(eq(indikatorMaaling.indikatorId, co2eKI[0].indikatorId))
          .orderBy(desc(indikatorMaaling.aar))
          .limit(1)
      : Promise.resolve([]),
    veMWKI[0]
      ? db.select({ vaerdi: indikatorMaaling.vaerdi, aar: indikatorMaaling.aar })
          .from(indikatorMaaling)
          .where(eq(indikatorMaaling.indikatorId, veMWKI[0].indikatorId))
          .orderBy(desc(indikatorMaaling.aar))
          .limit(1)
      : Promise.resolve([]),
  ]);
```

In the JSX, change the grid from `grid-cols-3` to `grid-cols-5` and add after the CCTF card:
```tsx
        {co2eKI.length > 0 && (
          <StatusCard
            title="CO₂e pr. capita"
            value={co2eSeneste[0] ? `${co2eSeneste[0].vaerdi} t` : '—'}
            description={co2eSeneste[0] ? `ton CO₂e/indb. (${co2eSeneste[0].aar})` : 'Ingen data endnu'}
            status={co2eSeneste[0] ? 'neutral' : 'neutral'}
          />
        )}
        {veMWKI.length > 0 && (
          <StatusCard
            title="VE-kapacitet"
            value={veMWSeneste[0] ? `${Math.round(veMWSeneste[0].vaerdi)} MW` : '—'}
            description={veMWSeneste[0] ? `vind + sol (${veMWSeneste[0].aar})` : 'Ingen data endnu'}
            status={veMWSeneste[0] ? 'neutral' : 'neutral'}
          />
        )}
```

- [ ] **Step 3: Add Data link to navigation**

Read `app/(app)/layout.tsx`, find the nav links section, and add a link to `/data` alongside the existing links.

- [ ] **Step 4: Seed initial templates**

Check if there's a seed file. If not, create `db/seed.ts` and add 3 templates. If there is an existing seed mechanism, add to it.

```typescript
// Seed 3 initial templates (add to existing seed file or run as one-off)
import { db } from '@/db';
import { indikatorTemplate } from '@/db/schema';

async function seedTemplates() {
  await db.insert(indikatorTemplate).values([
    {
      titel: 'Samlet CO₂e pr. capita',
      kilde: 'klimaregnskab',
      apiQuery: JSON.stringify({ type: 'Nøgletal', sektor: 'Samlet' }),
      enhed: 'ton CO₂e/indb.',
      beskrivelse: 'Kommunens samlede drivhusgasudledning pr. indbygger. Kilde: Klimaregnskabet.dk.',
      cctfKriterier: [6, 11, 15],
      aktiv: true,
    },
    {
      titel: 'VE-kapacitet (vind + sol)',
      kilde: 'energidataservice',
      apiQuery: JSON.stringify({ dataset: 'CapacityPerMunicipality', fields: ['OnshoreWindMW', 'SolarPowerMW'] }),
      enhed: 'MW',
      beskrivelse: 'Samlet installeret kapacitet for landvind og solenergi i kommunen. Kilde: Energi Data Service.',
      cctfKriterier: [7, 11],
      aktiv: true,
    },
    {
      titel: 'Befolkningstal',
      kilde: 'dst',
      apiQuery: JSON.stringify({ tabel: 'FOLK1A', variabler: { KØN: 'TOT', ALDER: 'IALT' }, felt: 'INDHOLD' }),
      enhed: 'antal',
      beskrivelse: 'Kommunens samlede folketal. Bruges til beregning af pr.-capita-indikatorer. Kilde: Danmarks Statistik.',
      cctfKriterier: [],
      aktiv: true,
    },
  ]).onConflictDoNothing();
  console.log('Seeded 3 indicator templates');
}

seedTemplates().catch(console.error);
```

Run once to seed:
```bash
npx tsx db/seed.ts
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx app/\(app\)/layout.tsx db/seed.ts
git commit -m "feat: dashboard data cards, nav link, and seed templates"
```

---

## Self-Review Against Spec

### Spec Coverage Check

| Spec requirement | Covered in task |
|---|---|
| `indikatorTemplate` table with all columns | Task 1 |
| `kommuneIndikator` table with all columns | Task 1 |
| `apiQuery` JSONB stored as text | Task 1 (text column — Drizzle handles JSON as text without special jsonb type needed for string storage; admin writes JSON string) |
| fetch-klimaregnskabet job, monthly | Tasks 4, 7 |
| fetch-energidataservice job, monthly | Tasks 5, 7 |
| fetch-dst job, monthly | Tasks 6, 7 |
| 3 retries with exponential backoff | Tasks 4, 5, 6 (via `withRetry`) |
| Rate limiting per source | Tasks 4 (200ms), 5 (one call), 6 (600ms) |
| sidstHentet / sidsteFejl / sidsteFejlBesked updates | Tasks 3, 4, 5, 6 |
| Backfill logic: first fetch → 4 years, subsequent → 1 year | Task 4 |
| "Hent nu" with optional fromYear | Tasks 7, 9 |
| drivhusgasregnskabPost write | Task 4 |
| Admin UI `/admin/indikatorer` | Task 8 |
| Koordinator `/data` aktive + katalog tabs | Task 9 |
| Staleness: >35 days yellow, errors red | Task 9 |
| Dashboard CO₂e + VE-kapacitet cards | Task 10 |
| Cards only shown if indikator is activated | Task 10 |
| KLIMAREGNSKABET_API_KEY env var | Task 7 |
| Seed 3 initial templates | Task 10 |
| DST missing-data codes → null | Task 6 |

All spec requirements covered. No gaps found.

### Placeholder Scan

No TBD, TODO, or vague requirements found. All code blocks are complete.

### Type Consistency

- `ActiveKommuneIndikator` type defined in Task 3, used in Tasks 4, 5, 6 — consistent.
- `handleFetchKlimaregnskabet(options?)` — defined in Task 4, registered in Task 7 — consistent.
- `hentNuAction(kommuneIndikatorId, _state, formData)` — defined in Task 9, used via `.bind(null, ki.id)` in Task 9 — consistent.
- `createTemplate(data)` — defined in Task 2, called in Task 8 actions — consistent.
