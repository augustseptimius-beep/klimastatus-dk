# Phase 3: Handlingsoverblik & Tovholder-flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Koordinatorer kan oprette indsatsområder og tiltag, styre tovholdere, sende magic-link rundes, og tovholdere kan udfylde status via en formular — med automatisk rykker-job.

**Architecture:** Koordinator-flows i `app/(app)/`, tovholder-formular i `app/rapport/` (public, session via `tovholder-session` cookie). Magic links genereres med `crypto.randomBytes(32)`, SHA-256 hashes og gemmes i `magic_link`-tabellen. Rykkere kører som pg-boss cron-job via `instrumentation.ts`.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Zod, jose (JWT), Brevo (email via fetch), pg-boss (background jobs), vitest

---

## File Map

**New files:**
- `vitest.config.ts`
- `db/queries/indsats-omraade.ts` + `.test.ts`
- `db/queries/tiltag.ts` + `.test.ts`
- `db/queries/tovholder.ts` + `.test.ts`
- `db/queries/magic-link.ts` + `.test.ts`
- `db/queries/rapport.ts` + `.test.ts`
- `lib/email.ts` + `.test.ts`
- `lib/tovholder-session.ts` + `.test.ts`
- `app/(app)/indsatser/page.tsx`, `ny/page.tsx`, `[id]/rediger/page.tsx`, `actions.ts`
- `app/(app)/tiltag/page.tsx`, `ny/page.tsx`, `[id]/rediger/page.tsx`, `actions.ts`
- `app/(app)/tovholdere/page.tsx`, `[id]/page.tsx`, `actions.ts`
- `app/rapport/[token]/route.ts`
- `app/rapport/page.tsx`
- `app/rapport/udloebet/page.tsx`
- `app/rapport/actions.ts`
- `components/indsats-omraade-form.tsx`
- `components/tiltag-form.tsx`
- `components/tovholder-form.tsx`
- `components/tovholder-rapport-form.tsx`
- `instrumentation.ts`
- `instrumentation-node.ts`
- `lib/jobs/rykker.ts`

**Modified files:**
- `package.json` (add `test` script)
- `.env.local` (add `BREVO_API_KEY`, `BREVO_FROM_EMAIL`)
- `proxy.ts` (add `/rapport` as public prefix)
- `db/queries/index.ts` (export new queries)

---

### Task 1: Test Infrastructure & Env

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Write vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 2: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 3: Add env vars to .env.local**

Add to `.env.local`:
```
BREVO_API_KEY=your-brevo-api-key-here
BREVO_FROM_EMAIL=noreply@klimastatus.dk
```

- [ ] **Step 4: Run existing tests to verify**

```bash
npm test
```
Expected: All existing tests pass (lib/session.test.ts, lib/dal.test.ts, lib/definitions.test.ts, db/queries/user.test.ts, db/queries/kommune.test.ts)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json .env.local
git commit -m "chore: add vitest config, test script, brevo env vars"
```

---

### Task 2: DB Queries — indsatsOmraade

**Files:**
- Create: `db/queries/indsats-omraade.ts`
- Create: `db/queries/indsats-omraade.test.ts`
- Modify: `db/queries/index.ts`

- [ ] **Step 1: Write failing test**

```ts
// db/queries/indsats-omraade.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      indsatsOmraade: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'io1', navn: 'Energi', type: 'ghg_reduction', sektor: 'energy', kommuneId: 'k1' },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'io1', navn: 'Energi', type: 'ghg_reduction', sektor: 'energy', kommuneId: 'k1',
        }),
      },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'io2', navn: 'Transport' }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'io1', navn: 'Opdateret' }]) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn() }));
vi.mock('@/db/schema', () => ({ indsatsOmraade: {} }));

describe('getAllIndsatsOmraader', () => {
  it('returns list for kommuneId', async () => {
    const { getAllIndsatsOmraader } = await import('./indsats-omraade');
    const result = await getAllIndsatsOmraader('k1');
    expect(result[0].navn).toBe('Energi');
  });
});

describe('createIndsatsOmraade', () => {
  it('inserts and returns new record', async () => {
    const { createIndsatsOmraade } = await import('./indsats-omraade');
    const result = await createIndsatsOmraade({
      kommuneId: 'k1', navn: 'Transport',
      type: 'ghg_reduction', sektor: 'transport',
    });
    expect(result.navn).toBe('Transport');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- db/queries/indsats-omraade.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```ts
// db/queries/indsats-omraade.ts
import { db } from '@/db';
import { indsatsOmraade } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

type IndsatsOmraadeData = {
  kommuneId: string;
  navn: string;
  type: 'ghg_reduction' | 'adaptation' | 'consumption' | 'just_transition' | 'cross_cutting';
  sektor: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  beskrivelse?: string;
  ansvarligForvaltning?: string;
};

export async function getAllIndsatsOmraader(kommuneId: string) {
  return db.query.indsatsOmraade.findMany({
    where: eq(indsatsOmraade.kommuneId, kommuneId),
    orderBy: asc(indsatsOmraade.navn),
  });
}

export async function getIndsatsOmraadeById(id: string) {
  return db.query.indsatsOmraade.findFirst({
    where: eq(indsatsOmraade.id, id),
  });
}

export async function createIndsatsOmraade(data: IndsatsOmraadeData) {
  const [created] = await db.insert(indsatsOmraade).values(data).returning();
  return created;
}

export async function updateIndsatsOmraade(
  id: string,
  data: Partial<Omit<IndsatsOmraadeData, 'kommuneId'>>,
) {
  const [updated] = await db
    .update(indsatsOmraade)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(indsatsOmraade.id, id))
    .returning();
  return updated;
}

export async function deleteIndsatsOmraade(id: string) {
  await db.delete(indsatsOmraade).where(eq(indsatsOmraade.id, id));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- db/queries/indsats-omraade.test.ts
```
Expected: PASS

- [ ] **Step 5: Update index.ts**

Add to `db/queries/index.ts`:
```ts
export * from './indsats-omraade';
```

- [ ] **Step 6: Commit**

```bash
git add db/queries/indsats-omraade.ts db/queries/indsats-omraade.test.ts db/queries/index.ts
git commit -m "feat: add indsatsOmraade DB queries"
```

---

### Task 3: DB Queries — tiltag

**Files:**
- Create: `db/queries/tiltag.ts`
- Create: `db/queries/tiltag.test.ts`
- Modify: `db/queries/index.ts`

- [ ] **Step 1: Write failing test**

```ts
// db/queries/tiltag.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      tiltag: {
        findMany: vi.fn().mockResolvedValue([
          { id: 't1', titel: 'Solceller', type: 'reduction', status: 'planned', kommuneId: 'k1', indsatsOmraadeId: 'io1' },
        ]),
        findFirst: vi.fn().mockResolvedValue({ id: 't1', titel: 'Solceller' }),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([
            { id: 't1', titel: 'Solceller', type: 'reduction', status: 'planned' },
          ]),
        })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 't2', titel: 'Ny' }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 't1', titel: 'Opdateret' }]) })) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({ tiltag: {}, tovholderTiltag: {} }));

describe('getAllTiltag', () => {
  it('returns tiltag for kommune', async () => {
    const { getAllTiltag } = await import('./tiltag');
    const result = await getAllTiltag('k1');
    expect(result[0].titel).toBe('Solceller');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- db/queries/tiltag.test.ts
```

- [ ] **Step 3: Write implementation**

```ts
// db/queries/tiltag.ts
import { db } from '@/db';
import { tiltag, tovholderTiltag } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';

type TiltagData = {
  kommuneId: string;
  indsatsOmraadeId: string;
  titel: string;
  type: 'reduction' | 'adaptation' | 'both';
  beskrivelse?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  tidsrammeStart?: string;
  tidsrammeSlut?: string;
  forventetEffektCo2Ton?: number;
  prioriteretTiltag?: boolean;
};

export async function getAllTiltag(kommuneId: string) {
  return db.query.tiltag.findMany({
    where: eq(tiltag.kommuneId, kommuneId),
    orderBy: asc(tiltag.titel),
  });
}

export async function getTiltagById(id: string) {
  return db.query.tiltag.findFirst({
    where: eq(tiltag.id, id),
  });
}

export async function getTiltagForTovholder(tovholderId: string) {
  return db
    .select({
      id: tiltag.id,
      titel: tiltag.titel,
      indsatsOmraadeId: tiltag.indsatsOmraadeId,
      type: tiltag.type,
      status: tiltag.status,
      beskrivelse: tiltag.beskrivelse,
    })
    .from(tiltag)
    .innerJoin(
      tovholderTiltag,
      and(
        eq(tovholderTiltag.tiltagId, tiltag.id),
        eq(tovholderTiltag.tovholderId, tovholderId),
      ),
    )
    .orderBy(asc(tiltag.titel));
}

export async function createTiltag(data: TiltagData) {
  const [created] = await db.insert(tiltag).values(data).returning();
  return created;
}

export async function updateTiltag(
  id: string,
  data: Partial<Omit<TiltagData, 'kommuneId'>>,
) {
  const [updated] = await db
    .update(tiltag)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tiltag.id, id))
    .returning();
  return updated;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- db/queries/tiltag.test.ts
```

- [ ] **Step 5: Update index.ts**

Add to `db/queries/index.ts`:
```ts
export * from './tiltag';
```

- [ ] **Step 6: Commit**

```bash
git add db/queries/tiltag.ts db/queries/tiltag.test.ts db/queries/index.ts
git commit -m "feat: add tiltag DB queries"
```

---

### Task 4: DB Queries — tovholder, magic-link, rapport

**Files:**
- Create: `db/queries/tovholder.ts` + `.test.ts`
- Create: `db/queries/magic-link.ts` + `.test.ts`
- Create: `db/queries/rapport.ts` + `.test.ts`
- Modify: `db/queries/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// db/queries/tovholder.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      tovholder: { findMany: vi.fn().mockResolvedValue([{ id: 'th1', navn: 'Anders', email: 'anders@k.dk', kommuneId: 'k1', aktiv: true }]), findFirst: vi.fn().mockResolvedValue({ id: 'th1', navn: 'Anders' }) },
      tovholderTiltag: { findFirst: vi.fn().mockResolvedValue(null) },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'th2', navn: 'Bo' }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'th1' }]) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({ tovholder: {}, tovholderTiltag: {} }));

describe('getAllTovholdere', () => {
  it('returns list for kommuneId', async () => {
    const { getAllTovholdere } = await import('./tovholder');
    const result = await getAllTovholdere('k1');
    expect(result[0].navn).toBe('Anders');
  });
});
```

```ts
// db/queries/magic-link.test.ts
import { describe, it, expect, vi } from 'vitest';
import { randomBytes, createHash } from 'crypto';

vi.mock('@/db', () => ({
  db: {
    query: { magicLink: { findFirst: vi.fn().mockResolvedValue({ id: 'ml1', tokenHash: 'abc', tovholderId: 'th1', expiresAt: new Date(Date.now() + 1000000), used: false }) } },
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
vi.mock('@/db/schema', () => ({ magicLink: {} }));

describe('generateToken', () => {
  it('returns a 64-char hex string', async () => {
    const { generateToken } = await import('./magic-link');
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });
});

describe('hashToken', () => {
  it('returns deterministic SHA-256 hex', async () => {
    const { hashToken } = await import('./magic-link');
    const h1 = hashToken('abc');
    const h2 = hashToken('abc');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});
```

```ts
// db/queries/rapport.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      tovholderRapport: {
        findMany: vi.fn().mockResolvedValue([{ id: 'r1', tiltagId: 't1', tovholderId: 'th1', dato: '2026-05-11' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'r2' }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'r1' }]) })) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn() }));
vi.mock('@/db/schema', () => ({ tovholderRapport: {} }));

describe('getLatestRapporterForTovholder', () => {
  it('returns rapporter for tovholder', async () => {
    const { getLatestRapporterForTovholder } = await import('./rapport');
    const result = await getLatestRapporterForTovholder('th1');
    expect(result[0].tiltagId).toBe('t1');
  });
});

describe('upsertRapport', () => {
  it('inserts new rapport when none exists for dato', async () => {
    const { upsertRapport } = await import('./rapport');
    const result = await upsertRapport('th1', 't1', '2026-05-11', { statusImplementering: 'Igangværende' });
    expect(result.id).toBe('r2');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- db/queries/tovholder.test.ts db/queries/magic-link.test.ts db/queries/rapport.test.ts
```

- [ ] **Step 3: Write tovholder.ts**

```ts
// db/queries/tovholder.ts
import { db } from '@/db';
import { tovholder, tovholderTiltag } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';

export async function getAllTovholdere(kommuneId: string) {
  return db.query.tovholder.findMany({
    where: eq(tovholder.kommuneId, kommuneId),
    orderBy: asc(tovholder.navn),
  });
}

export async function getTovholderById(id: string) {
  return db.query.tovholder.findFirst({
    where: eq(tovholder.id, id),
  });
}

export async function createTovholder(data: {
  kommuneId: string;
  navn: string;
  email: string;
  forvaltning?: string;
}) {
  const [created] = await db.insert(tovholder).values(data).returning();
  return created;
}

export async function updateTovholder(
  id: string,
  data: Partial<{ navn: string; email: string; forvaltning: string; aktiv: boolean }>,
) {
  const [updated] = await db
    .update(tovholder)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tovholder.id, id))
    .returning();
  return updated;
}

export async function assignTiltagToTovholder(tovholderId: string, tiltagId: string) {
  const existing = await db.query.tovholderTiltag.findFirst({
    where: and(
      eq(tovholderTiltag.tovholderId, tovholderId),
      eq(tovholderTiltag.tiltagId, tiltagId),
    ),
  });
  if (existing) return existing;
  const [created] = await db.insert(tovholderTiltag).values({ tovholderId, tiltagId }).returning();
  return created;
}

export async function removeTiltagFromTovholder(tovholderId: string, tiltagId: string) {
  await db.delete(tovholderTiltag).where(
    and(
      eq(tovholderTiltag.tovholderId, tovholderId),
      eq(tovholderTiltag.tiltagId, tiltagId),
    ),
  );
}
```

- [ ] **Step 4: Write magic-link.ts**

```ts
// db/queries/magic-link.ts
import { db } from '@/db';
import { magicLink } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createMagicLink(tovholderId: string, expiresInDays = 14) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await db.insert(magicLink).values({ tokenHash, tovholderId, expiresAt });
  return token;
}

export async function getMagicLinkByTokenHash(tokenHash: string) {
  return db.query.magicLink.findFirst({
    where: eq(magicLink.tokenHash, tokenHash),
  });
}

export async function markMagicLinkUsed(id: string) {
  await db.update(magicLink).set({ used: true }).where(eq(magicLink.id, id));
}
```

- [ ] **Step 5: Write rapport.ts**

```ts
// db/queries/rapport.ts
import { db } from '@/db';
import { tovholderRapport } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type RapportData = {
  statusImplementering?: string;
  statusBeskrivelse?: string;
  barrierer?: string;
  naesteSkrid?: string;
  effektRealiseret?: string;
};

export async function getLatestRapporterForTovholder(tovholderId: string) {
  return db.query.tovholderRapport.findMany({
    where: eq(tovholderRapport.tovholderId, tovholderId),
    orderBy: desc(tovholderRapport.createdAt),
  });
}

export async function upsertRapport(
  tovholderId: string,
  tiltagId: string,
  dato: string,
  data: RapportData,
) {
  const existing = await db.query.tovholderRapport.findFirst({
    where: and(
      eq(tovholderRapport.tovholderId, tovholderId),
      eq(tovholderRapport.tiltagId, tiltagId),
      eq(tovholderRapport.dato, dato),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(tovholderRapport)
      .set(data)
      .where(eq(tovholderRapport.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(tovholderRapport)
    .values({ tovholderId, tiltagId, dato, ...data })
    .returning();
  return created;
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm test -- db/queries/tovholder.test.ts db/queries/magic-link.test.ts db/queries/rapport.test.ts
```

- [ ] **Step 7: Update index.ts**

Add to `db/queries/index.ts`:
```ts
export * from './tovholder';
export * from './magic-link';
export * from './rapport';
```

- [ ] **Step 8: Commit**

```bash
git add db/queries/tovholder.ts db/queries/tovholder.test.ts db/queries/magic-link.ts db/queries/magic-link.test.ts db/queries/rapport.ts db/queries/rapport.test.ts db/queries/index.ts
git commit -m "feat: add tovholder, magic-link, rapport DB queries"
```

---

### Task 5: Email Service & Tovholder Session

**Files:**
- Create: `lib/email.ts` + `lib/email.test.ts`
- Create: `lib/tovholder-session.ts` + `lib/tovholder-session.test.ts`

- [ ] **Step 1: Write failing email test**

```ts
// lib/email.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockResolvedValue({ ok: true });
  process.env.BREVO_API_KEY = 'test-key';
  process.env.BREVO_FROM_EMAIL = 'test@klimastatus.dk';
});

describe('sendMagicLinkEmail', () => {
  it('calls Brevo API with correct payload', async () => {
    const { sendMagicLinkEmail } = await import('./email');
    await sendMagicLinkEmail('tovholder@k.dk', 'https://k.dk/rapport/abc', 'Thisted');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when Brevo returns error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, text: async () => 'Bad Request' });
    const { sendMagicLinkEmail } = await import('./email');
    await expect(sendMagicLinkEmail('a@b.dk', 'url', 'K')).rejects.toThrow('Brevo error 400');
  });
});
```

- [ ] **Step 2: Run email test — expect FAIL**

```bash
npm test -- lib/email.test.ts
```

- [ ] **Step 3: Write email.ts**

```ts
// lib/email.ts
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_FROM_EMAIL ?? 'noreply@klimastatus.dk',
        name: 'Klimastatus',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }
}

export async function sendMagicLinkEmail(to: string, magicUrl: string, kommuneNavn: string) {
  await sendEmail(
    to,
    `Din tovholder-rapport: ${kommuneNavn} Klimastatus`,
    `<p>Hej,</p>
     <p>Din klimakoordinator i ${kommuneNavn} Kommune ønsker din status på dine tiltag.</p>
     <p><a href="${magicUrl}" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Udfyld status</a></p>
     <p>Linket er gyldigt i 14 dage.</p>`,
  );
}

export async function sendRykkerEmail(to: string, magicUrl: string, kommuneNavn: string) {
  await sendEmail(
    to,
    `Påmindelse: Tovholder-rapport ${kommuneNavn} Klimastatus`,
    `<p>Hej,</p>
     <p>Vi mangler stadig din status for dine tiltag i ${kommuneNavn} Klimastatus.</p>
     <p><a href="${magicUrl}" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Udfyld status nu</a></p>`,
  );
}
```

- [ ] **Step 4: Run email test — expect PASS**

```bash
npm test -- lib/email.test.ts
```

- [ ] **Step 5: Write failing tovholder-session test**

```ts
// lib/tovholder-session.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

describe('encryptTovholder / decryptTovholder', () => {
  it('round-trips a payload', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-32-chars-longg';
    const { encryptTovholder, decryptTovholder } = await import('./tovholder-session');
    const payload = { tovholderId: 'th-1', kommuneId: 'k-1', expiresAt: new Date(Date.now() + 60000) };
    const token = await encryptTovholder(payload);
    expect(typeof token).toBe('string');
    const result = await decryptTovholder(token);
    expect(result?.tovholderId).toBe('th-1');
    expect(result?.kommuneId).toBe('k-1');
  });

  it('returns undefined for invalid token', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-32-chars-longg';
    const { decryptTovholder } = await import('./tovholder-session');
    expect(await decryptTovholder('not-valid')).toBeUndefined();
  });
});
```

- [ ] **Step 6: Run session test — expect FAIL**

```bash
npm test -- lib/tovholder-session.test.ts
```

- [ ] **Step 7: Write tovholder-session.ts**

```ts
// lib/tovholder-session.ts
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export type TovholderSessionPayload = {
  tovholderId: string;
  kommuneId: string;
  expiresAt: Date;
};

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function encryptTovholder(payload: TovholderSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey());
}

export async function decryptTovholder(token: string): Promise<TovholderSessionPayload | undefined> {
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] });
    return payload as unknown as TovholderSessionPayload;
  } catch {
    return undefined;
  }
}

export async function createTovholderSession(data: Omit<TovholderSessionPayload, 'expiresAt'>) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await encryptTovholder({ ...data, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set('tovholder-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifyTovholderSession(): Promise<TovholderSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tovholder-session')?.value;
  if (!token) return null;
  const payload = await decryptTovholder(token);
  if (!payload) return null;
  if (new Date(payload.expiresAt) < new Date()) return null;
  return payload;
}
```

- [ ] **Step 8: Run session test — expect PASS**

```bash
npm test -- lib/tovholder-session.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add lib/email.ts lib/email.test.ts lib/tovholder-session.ts lib/tovholder-session.test.ts
git commit -m "feat: add email service and tovholder session"
```

---

### Task 6: Proxy Update + Magic Link Route

**Files:**
- Modify: `proxy.ts`
- Create: `app/rapport/[token]/route.ts`
- Create: `app/rapport/udloebet/page.tsx`

- [ ] **Step 1: Update proxy.ts**

Replace the contents of `proxy.ts` with:

```ts
// proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const publicRoutes = ['/', '/login'];
const publicPrefixes = ['/rapport'];
const adminRoutes = ['/admin'];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic =
    publicRoutes.includes(path) || publicPrefixes.some((p) => path.startsWith(p));
  const isAdmin = adminRoutes.some((r) => path.startsWith(r));

  const token = req.cookies.get('session')?.value;
  const session = token ? await decrypt(token) : null;

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  if (isAdmin && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  if (path === '/login' && session) {
    return NextResponse.redirect(
      new URL(session.role === 'admin' ? '/admin/kommuner' : '/dashboard', req.nextUrl),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Create the magic link route handler**

```ts
// app/rapport/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMagicLinkByTokenHash, markMagicLinkUsed, hashToken } from '@/db/queries/magic-link';
import { getTovholderById } from '@/db/queries/tovholder';
import { encryptTovholder } from '@/lib/tovholder-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // If they already have a valid tovholder session, skip verification
  const existingSession = request.cookies.get('tovholder-session')?.value;
  if (existingSession) {
    return NextResponse.redirect(new URL('/rapport', request.nextUrl));
  }

  const tokenHash = hashToken(token);
  const link = await getMagicLinkByTokenHash(tokenHash);

  if (!link || link.used || new Date(link.expiresAt) < new Date()) {
    return NextResponse.redirect(new URL('/rapport/udloebet', request.nextUrl));
  }

  const tovholder = await getTovholderById(link.tovholderId);
  if (!tovholder) {
    return NextResponse.redirect(new URL('/rapport/udloebet', request.nextUrl));
  }

  await markMagicLinkUsed(link.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionToken = await encryptTovholder({
    tovholderId: tovholder.id,
    kommuneId: tovholder.kommuneId,
    expiresAt,
  });

  const response = NextResponse.redirect(new URL('/rapport', request.nextUrl));
  response.cookies.set('tovholder-session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
```

- [ ] **Step 3: Create expired link page**

```tsx
// app/rapport/udloebet/page.tsx
export const metadata = { title: 'Linket er udløbet — Klimastatus.dk' };

export default function UdloebetPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Linket er udløbet</h1>
        <p className="mt-3 text-gray-500">
          Dette link er udløbet eller allerede brugt. Kontakt din klimakoordinator for at få et nyt link.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify dev server starts without errors**

```bash
# Check the running dev server log or restart:
cat .next/dev/logs/next-development.log | tail -20
```
Expected: No TypeScript or module errors

- [ ] **Step 5: Commit**

```bash
git add proxy.ts app/rapport/
git commit -m "feat: update proxy for rapport routes, add magic link handler"
```

---

### Task 7: Indsatsområde Pages

**Files:**
- Create: `app/(app)/indsatser/page.tsx`
- Create: `app/(app)/indsatser/actions.ts`
- Create: `app/(app)/indsatser/ny/page.tsx`
- Create: `app/(app)/indsatser/[id]/rediger/page.tsx`
- Create: `components/indsats-omraade-form.tsx`

- [ ] **Step 1: Write actions.ts**

```ts
// app/(app)/indsatser/actions.ts
'use server';
import { verifySession } from '@/lib/dal';
import { createIndsatsOmraade, updateIndsatsOmraade, deleteIndsatsOmraade } from '@/db/queries';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/lib/definitions';

const schema = z.object({
  navn: z.string().min(1, 'Navn er påkrævet'),
  type: z.enum(['ghg_reduction', 'adaptation', 'consumption', 'just_transition', 'cross_cutting']),
  sektor: z.enum(['energy', 'transport', 'buildings', 'food', 'agriculture', 'waste', 'adaptation', 'other']),
  beskrivelse: z.string().optional(),
  ansvarligForvaltning: z.string().optional(),
});

export async function createIndsatsOmraadeAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await createIndsatsOmraade({ ...parsed.data, kommuneId: session.kommuneId });
  redirect('/indsatser');
}

export async function updateIndsatsOmraadeAction(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await updateIndsatsOmraade(id, parsed.data);
  redirect('/indsatser');
}

export async function deleteIndsatsOmraadeAction(id: string): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');
  await deleteIndsatsOmraade(id);
  redirect('/indsatser');
}
```

- [ ] **Step 2: Write the shared form component**

```tsx
// components/indsats-omraade-form.tsx
'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/definitions';

const TYPE_OPTIONS = [
  { value: 'ghg_reduction', label: 'Drivhusgasreduktion' },
  { value: 'adaptation', label: 'Klimatilpasning' },
  { value: 'consumption', label: 'Forbrug' },
  { value: 'just_transition', label: 'Retfærdig omstilling' },
  { value: 'cross_cutting', label: 'Tværgående' },
];
const SEKTOR_OPTIONS = [
  { value: 'energy', label: 'Energi' },
  { value: 'transport', label: 'Transport' },
  { value: 'buildings', label: 'Bygninger' },
  { value: 'food', label: 'Fødevarer' },
  { value: 'agriculture', label: 'Landbrug' },
  { value: 'waste', label: 'Affald' },
  { value: 'adaptation', label: 'Klimatilpasning' },
  { value: 'other', label: 'Andet' },
];

type DefaultValues = { navn?: string; type?: string; sektor?: string; beskrivelse?: string | null; ansvarligForvaltning?: string | null };

export function IndsatsOmraadeForm({
  action,
  defaultValues,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="navn" className="text-sm font-medium text-gray-700">Navn</label>
        <input id="navn" name="navn" type="text" required defaultValue={defaultValues?.navn ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.navn && <p className="text-sm text-red-600">{state.errors.navn[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-sm font-medium text-gray-700">Type</label>
        <select id="type" name="type" required defaultValue={defaultValues?.type ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Vælg type</option>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {state?.errors?.type && <p className="text-sm text-red-600">{state.errors.type[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sektor" className="text-sm font-medium text-gray-700">Sektor</label>
        <select id="sektor" name="sektor" required defaultValue={defaultValues?.sektor ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Vælg sektor</option>
          {SEKTOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {state?.errors?.sektor && <p className="text-sm text-red-600">{state.errors.sektor[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="beskrivelse" className="text-sm font-medium text-gray-700">Beskrivelse</label>
        <textarea id="beskrivelse" name="beskrivelse" rows={3} defaultValue={defaultValues?.beskrivelse ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      {state?.message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Gemmer…' : 'Gem'}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Write list page**

```tsx
// app/(app)/indsatser/page.tsx
import { verifySession } from '@/lib/dal';
import { getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Indsatsområder — Klimastatus.dk' };

const TYPE_LABELS: Record<string, string> = {
  ghg_reduction: 'GHG-reduktion', adaptation: 'Tilpasning',
  consumption: 'Forbrug', just_transition: 'Retfærdig omstilling', cross_cutting: 'Tværgående',
};

export default async function IndsatserPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const indsatser = await getAllIndsatsOmraader(session.kommuneId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Indsatsområder</h1>
        <Link href="/indsatser/ny" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
          Nyt indsatsområde
        </Link>
      </div>
      {indsatser.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-400">
          Ingen indsatsområder endnu. Opret det første for at komme i gang med tiltag.
        </div>
      ) : (
        <div className="divide-y rounded-xl border border-gray-200">
          {indsatser.map((io) => (
            <div key={io.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{io.navn}</p>
                <p className="text-xs text-gray-500">{TYPE_LABELS[io.type]} · {io.sektor}</p>
              </div>
              <Link href={`/indsatser/${io.id}/rediger`} className="text-sm text-gray-500 hover:text-gray-900">
                Rediger
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write create page**

```tsx
// app/(app)/indsatser/ny/page.tsx
import { IndsatsOmraadeForm } from '@/components/indsats-omraade-form';
import { createIndsatsOmraadeAction } from '@/app/(app)/indsatser/actions';
import Link from 'next/link';

export const metadata = { title: 'Nyt indsatsområde — Klimastatus.dk' };

export default function NytIndsatsOmraadePage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/indsatser" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nyt indsatsområde</h1>
      </div>
      <IndsatsOmraadeForm action={createIndsatsOmraadeAction} />
    </div>
  );
}
```

- [ ] **Step 5: Write edit page**

```tsx
// app/(app)/indsatser/[id]/rediger/page.tsx
import { verifySession } from '@/lib/dal';
import { getIndsatsOmraadeById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { IndsatsOmraadeForm } from '@/components/indsats-omraade-form';
import { updateIndsatsOmraadeAction, deleteIndsatsOmraadeAction } from '@/app/(app)/indsatser/actions';
import Link from 'next/link';

export const metadata = { title: 'Rediger indsatsområde — Klimastatus.dk' };

export default async function RedigerIndsatsOmraadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const io = await getIndsatsOmraadeById(id);
  if (!io || io.kommuneId !== session.kommuneId) redirect('/indsatser');

  const boundUpdate = updateIndsatsOmraadeAction.bind(null, id);
  const boundDelete = deleteIndsatsOmraadeAction.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/indsatser" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Rediger indsatsområde</h1>
      </div>
      <IndsatsOmraadeForm action={boundUpdate} defaultValues={io} />
      <form action={boundDelete} className="mt-8">
        <button type="submit" className="text-sm text-red-600 hover:text-red-800">
          Slet indsatsområde
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Test manually in browser**

Navigate to `http://localhost:3000/indsatser`. Expected: list page renders. Click "Nyt indsatsområde", fill form, submit. Expected: redirected to list with new indsatsområde shown.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/indsatser/ components/indsats-omraade-form.tsx
git commit -m "feat: indsatsområde CRUD pages"
```

---

### Task 8: Handlingsoverblik (Tiltag CRUD)

**Files:**
- Create: `app/(app)/tiltag/page.tsx`
- Create: `app/(app)/tiltag/actions.ts`
- Create: `app/(app)/tiltag/ny/page.tsx`
- Create: `app/(app)/tiltag/[id]/rediger/page.tsx`
- Create: `components/tiltag-form.tsx`

- [ ] **Step 1: Write actions.ts**

```ts
// app/(app)/tiltag/actions.ts
'use server';
import { verifySession } from '@/lib/dal';
import { createTiltag, updateTiltag } from '@/db/queries';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/lib/definitions';

const schema = z.object({
  indsatsOmraadeId: z.string().min(1, 'Indsatsområde er påkrævet'),
  titel: z.string().min(1, 'Titel er påkrævet'),
  type: z.enum(['reduction', 'adaptation', 'both']),
  status: z.enum(['planned', 'in_progress', 'completed', 'discontinued']).default('planned'),
  beskrivelse: z.string().optional(),
  tidsrammeStart: z.string().optional(),
  tidsrammeSlut: z.string().optional(),
  forventetEffektCo2Ton: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
});

export async function createTiltagAction(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await createTiltag({ ...parsed.data, kommuneId: session.kommuneId });
  redirect('/tiltag');
}

export async function updateTiltagAction(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await updateTiltag(id, parsed.data);
  redirect('/tiltag');
}
```

- [ ] **Step 2: Write shared tiltag form**

```tsx
// components/tiltag-form.tsx
'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/definitions';

type IndsatsOption = { id: string; navn: string };
type DefaultValues = {
  titel?: string; indsatsOmraadeId?: string; type?: string;
  status?: string; beskrivelse?: string | null;
  tidsrammeStart?: string | null; tidsrammeSlut?: string | null;
  forventetEffektCo2Ton?: number | null;
};

const TYPE_OPTIONS = [
  { value: 'reduction', label: 'Reduktion' },
  { value: 'adaptation', label: 'Klimatilpasning' },
  { value: 'both', label: 'Begge' },
];
const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planlagt' },
  { value: 'in_progress', label: 'Igangværende' },
  { value: 'completed', label: 'Gennemført' },
  { value: 'discontinued', label: 'Udgået' },
];

export function TiltagForm({
  action, indsatser, defaultValues,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  indsatser: IndsatsOption[];
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="titel" className="text-sm font-medium text-gray-700">Titel</label>
        <input id="titel" name="titel" type="text" required defaultValue={defaultValues?.titel ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.titel && <p className="text-sm text-red-600">{state.errors.titel[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="indsatsOmraadeId" className="text-sm font-medium text-gray-700">Indsatsområde</label>
        <select id="indsatsOmraadeId" name="indsatsOmraadeId" required defaultValue={defaultValues?.indsatsOmraadeId ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Vælg indsatsområde</option>
          {indsatser.map((io) => <option key={io.id} value={io.id}>{io.navn}</option>)}
        </select>
        {state?.errors?.indsatsOmraadeId && <p className="text-sm text-red-600">{state.errors.indsatsOmraadeId[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium text-gray-700">Type</label>
          <select id="type" name="type" required defaultValue={defaultValues?.type ?? ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Vælg</option>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium text-gray-700">Status</label>
          <select id="status" name="status" defaultValue={defaultValues?.status ?? 'planned'}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="beskrivelse" className="text-sm font-medium text-gray-700">Beskrivelse</label>
        <textarea id="beskrivelse" name="beskrivelse" rows={3} defaultValue={defaultValues?.beskrivelse ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="tidsrammeStart" className="text-sm font-medium text-gray-700">Tidsramme start</label>
          <input id="tidsrammeStart" name="tidsrammeStart" type="date" defaultValue={defaultValues?.tidsrammeStart ?? ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tidsrammeSlut" className="text-sm font-medium text-gray-700">Tidsramme slut</label>
          <input id="tidsrammeSlut" name="tidsrammeSlut" type="date" defaultValue={defaultValues?.tidsrammeSlut ?? ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="forventetEffektCo2Ton" className="text-sm font-medium text-gray-700">
          Forventet CO₂-effekt (ton/år)
        </label>
        <input id="forventetEffektCo2Ton" name="forventetEffektCo2Ton" type="number" step="0.1"
          defaultValue={defaultValues?.forventetEffektCo2Ton ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      {state?.message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Gemmer…' : 'Gem tiltag'}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Write list page (Handlingsoverblik)**

```tsx
// app/(app)/tiltag/page.tsx
import { verifySession } from '@/lib/dal';
import { getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Handlingsoverblik — Klimastatus.dk' };

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planlagt', in_progress: 'Igangværende',
  completed: 'Gennemført', discontinued: 'Udgået',
};
const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700', discontinued: 'bg-red-100 text-red-700',
};

export default async function TiltagPage({
  searchParams,
}: {
  searchParams: Promise<{ indsats?: string; status?: string }>;
}) {
  const { indsats, status } = await searchParams;
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [allTiltag, indsatser] = await Promise.all([
    getAllTiltag(session.kommuneId),
    getAllIndsatsOmraader(session.kommuneId),
  ]);

  const filtered = allTiltag.filter((t) => {
    if (indsats && t.indsatsOmraadeId !== indsats) return false;
    if (status && t.status !== status) return false;
    return true;
  });

  const indsatsMap = Object.fromEntries(indsatser.map((io) => [io.id, io.navn]));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Handlingsoverblik</h1>
        <Link href="/tiltag/ny" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
          Nyt tiltag
        </Link>
      </div>

      {/* Indsatsområde filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/tiltag" className={`rounded-full px-3 py-1 text-xs font-medium ${!indsats ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Alle
        </Link>
        {indsatser.map((io) => (
          <Link key={io.id} href={`/tiltag?indsats=${io.id}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${indsats === io.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {io.navn}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-400">
          {allTiltag.length === 0
            ? 'Ingen tiltag endnu. Opret et indsatsområde først, derefter kan du tilføje tiltag.'
            : 'Ingen tiltag matcher filteret.'}
        </div>
      ) : (
        <div className="divide-y rounded-xl border border-gray-200">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{t.titel}</p>
                <p className="mt-0.5 text-xs text-gray-500">{indsatsMap[t.indsatsOmraadeId]}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                  {STATUS_LABELS[t.status]}
                </span>
                <Link href={`/tiltag/${t.id}/rediger`} className="text-sm text-gray-500 hover:text-gray-900">
                  Rediger
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write create page**

```tsx
// app/(app)/tiltag/ny/page.tsx
import { verifySession } from '@/lib/dal';
import { getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TiltagForm } from '@/components/tiltag-form';
import { createTiltagAction } from '@/app/(app)/tiltag/actions';
import Link from 'next/link';

export const metadata = { title: 'Nyt tiltag — Klimastatus.dk' };

export default async function NytTiltagPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const indsatser = await getAllIndsatsOmraader(session.kommuneId);
  if (indsatser.length === 0) redirect('/indsatser');

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tiltag" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nyt tiltag</h1>
      </div>
      <TiltagForm action={createTiltagAction} indsatser={indsatser} />
    </div>
  );
}
```

- [ ] **Step 5: Write edit page**

```tsx
// app/(app)/tiltag/[id]/rediger/page.tsx
import { verifySession } from '@/lib/dal';
import { getTiltagById, getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TiltagForm } from '@/components/tiltag-form';
import { updateTiltagAction } from '@/app/(app)/tiltag/actions';
import Link from 'next/link';

export const metadata = { title: 'Rediger tiltag — Klimastatus.dk' };

export default async function RedigerTiltagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [tiltag, indsatser] = await Promise.all([
    getTiltagById(id),
    getAllIndsatsOmraader(session.kommuneId),
  ]);
  if (!tiltag || tiltag.kommuneId !== session.kommuneId) redirect('/tiltag');

  const boundUpdate = updateTiltagAction.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tiltag" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Rediger tiltag</h1>
      </div>
      <TiltagForm action={boundUpdate} indsatser={indsatser} defaultValues={tiltag} />
    </div>
  );
}
```

- [ ] **Step 6: Test manually**

Navigate to `http://localhost:3000/tiltag`. Create an indsatsområde first if needed. Then create a tiltag, verify it appears in the list with correct status badge and filtering.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/tiltag/ components/tiltag-form.tsx
git commit -m "feat: handlingsoverblik — tiltag CRUD pages"
```

---

### Task 9: Tovholder Management & Send Runde

**Files:**
- Create: `app/(app)/tovholdere/page.tsx`
- Create: `app/(app)/tovholdere/[id]/page.tsx`
- Create: `app/(app)/tovholdere/actions.ts`
- Create: `components/tovholder-form.tsx`

- [ ] **Step 1: Write actions.ts**

```ts
// app/(app)/tovholdere/actions.ts
'use server';
import { verifySession } from '@/lib/dal';
import {
  createTovholder, updateTovholder, getAllTovholdere,
  assignTiltagToTovholder, removeTiltagFromTovholder,
} from '@/db/queries';
import { createMagicLink } from '@/db/queries/magic-link';
import { sendMagicLinkEmail } from '@/lib/email';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/lib/definitions';

const schema = z.object({
  navn: z.string().min(1, 'Navn er påkrævet'),
  email: z.string().email('Ugyldig email-adresse'),
  forvaltning: z.string().optional(),
});

export async function createTovholderAction(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await createTovholder({ ...parsed.data, kommuneId: session.kommuneId });
  redirect('/tovholdere');
}

export async function updateTovholderAction(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await updateTovholder(id, parsed.data);
  redirect('/tovholdere');
}

export async function assignTiltagAction(tovholderId: string, tiltagId: string) {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');
  await assignTiltagToTovholder(tovholderId, tiltagId);
}

export async function removeTiltagAction(tovholderId: string, tiltagId: string) {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');
  await removeTiltagFromTovholder(tovholderId, tiltagId);
}

export async function sendRundeAction(): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');

  const [tovholdere, kommune] = await Promise.all([
    getAllTovholdere(session.kommuneId),
    getKommuneById(session.kommuneId),
  ]);
  if (!kommune) throw new Error('Kommune ikke fundet');

  const base = process.env.NODE_ENV === 'production'
    ? `https://${kommune.subdomain}.klimastatus.dk`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

  const aktiveTovholdere = tovholdere.filter((t) => t.aktiv);
  await Promise.all(
    aktiveTovholdere.map(async (tovholder) => {
      const token = await createMagicLink(tovholder.id);
      await sendMagicLinkEmail(tovholder.email, `${base}/rapport/${token}`, kommune.navn);
    }),
  );

  redirect('/tovholdere');
}
```

- [ ] **Step 2: Write tovholder form component**

```tsx
// components/tovholder-form.tsx
'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/definitions';

type DefaultValues = { navn?: string; email?: string; forvaltning?: string | null };

export function TovholderForm({
  action,
  defaultValues,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="navn" className="text-sm font-medium text-gray-700">Navn</label>
        <input id="navn" name="navn" type="text" required defaultValue={defaultValues?.navn ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.navn && <p className="text-sm text-red-600">{state.errors.navn[0]}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
        <input id="email" name="email" type="email" required defaultValue={defaultValues?.email ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.email && <p className="text-sm text-red-600">{state.errors.email[0]}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="forvaltning" className="text-sm font-medium text-gray-700">Forvaltning</label>
        <input id="forvaltning" name="forvaltning" type="text" defaultValue={defaultValues?.forvaltning ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>
      {state?.message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Gemmer…' : 'Gem'}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Write list page with Send Runde button**

```tsx
// app/(app)/tovholdere/page.tsx
import { verifySession } from '@/lib/dal';
import { getAllTovholdere } from '@/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { sendRundeAction } from './actions';

export const metadata = { title: 'Tovholdere — Klimastatus.dk' };

export default async function TovholderePage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const tovholdere = await getAllTovholdere(session.kommuneId);
  const aktive = tovholdere.filter((t) => t.aktiv);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tovholdere</h1>
        <div className="flex gap-3">
          {aktive.length > 0 && (
            <form action={sendRundeAction}>
              <button type="submit"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Send runde ({aktive.length} tovholdere)
              </button>
            </form>
          )}
          <Link href="/tovholdere/ny"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
            Ny tovholder
          </Link>
        </div>
      </div>

      {tovholdere.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-400">
          Ingen tovholdere endnu.
        </div>
      ) : (
        <div className="divide-y rounded-xl border border-gray-200">
          {tovholdere.map((th) => (
            <div key={th.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{th.navn}</p>
                <p className="text-xs text-gray-500">{th.email}{th.forvaltning ? ` · ${th.forvaltning}` : ''}</p>
              </div>
              <div className="flex items-center gap-4">
                {!th.aktiv && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inaktiv</span>}
                <Link href={`/tovholdere/${th.id}`} className="text-sm text-gray-500 hover:text-gray-900">
                  Administrer
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write create page**

```tsx
// app/(app)/tovholdere/ny/page.tsx
import { TovholderForm } from '@/components/tovholder-form';
import { createTovholderAction } from '@/app/(app)/tovholdere/actions';
import Link from 'next/link';

export const metadata = { title: 'Ny tovholder — Klimastatus.dk' };

export default function NyTovholderPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tovholdere" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Ny tovholder</h1>
      </div>
      <TovholderForm action={createTovholderAction} />
    </div>
  );
}
```

- [ ] **Step 5: Write detail/edit page with tiltag assignment**

```tsx
// app/(app)/tovholdere/[id]/page.tsx
import { verifySession } from '@/lib/dal';
import { getTovholderById, getAllTiltag } from '@/db/queries';
import { db } from '@/db';
import { tovholderTiltag } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { TovholderForm } from '@/components/tovholder-form';
import { updateTovholderAction, assignTiltagAction, removeTiltagAction } from '@/app/(app)/tovholdere/actions';
import Link from 'next/link';

export const metadata = { title: 'Administrer tovholder — Klimastatus.dk' };

export default async function TovholderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [tovholder, allTiltag, assignments] = await Promise.all([
    getTovholderById(id),
    getAllTiltag(session.kommuneId),
    db.query.tovholderTiltag.findMany({ where: eq(tovholderTiltag.tovholderId, id) }),
  ]);
  if (!tovholder || tovholder.kommuneId !== session.kommuneId) redirect('/tovholdere');

  const assignedIds = new Set(assignments.map((a) => a.tiltagId));
  const boundUpdate = updateTovholderAction.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tovholdere" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">{tovholder.navn}</h1>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Stamdata</h2>
        <TovholderForm action={boundUpdate} defaultValues={tovholder} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Tiltag ({assignedIds.size})</h2>
        {allTiltag.length === 0 ? (
          <p className="text-sm text-gray-500">Ingen tiltag oprettet endnu.</p>
        ) : (
          <div className="divide-y rounded-xl border border-gray-200">
            {allTiltag.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-900">{t.titel}</p>
                <form action={
                  assignedIds.has(t.id)
                    ? removeTiltagAction.bind(null, id, t.id)
                    : assignTiltagAction.bind(null, id, t.id)
                }>
                  <button type="submit"
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      assignedIds.has(t.id)
                        ? 'bg-gray-900 text-white hover:bg-gray-700'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {assignedIds.has(t.id) ? 'Fjern' : 'Tilknyt'}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Test manually**

Navigate to `/tovholdere`. Create a tovholder, then click "Administrer" and assign tiltag. Verify "Send runde" button appears when there are active tovholdere. (Email won't send without a real BREVO_API_KEY — set a placeholder and verify no crash.)

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/tovholdere/ components/tovholder-form.tsx
git commit -m "feat: tovholder management and send runde"
```

---

### Task 10: Tovholder Rapport Form

**Files:**
- Create: `app/rapport/page.tsx`
- Create: `app/rapport/actions.ts`
- Create: `components/tovholder-rapport-form.tsx`

- [ ] **Step 1: Write save rapport action**

```ts
// app/rapport/actions.ts
'use server';
import { cookies } from 'next/headers';
import { decryptTovholder } from '@/lib/tovholder-session';
import { upsertRapport } from '@/db/queries/rapport';
import type { FormState } from '@/lib/definitions';

export async function saveRapportAction(
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

  const dato = new Date().toISOString().split('T')[0];

  const tiltagIds = [...new Set(
    [...formData.keys()]
      .filter((k) => k.startsWith('tiltag_') && k.endsWith('_id'))
      .map((k) => formData.get(k) as string)
      .filter(Boolean),
  )];

  await Promise.all(
    tiltagIds.map((tiltagId) =>
      upsertRapport(session.tovholderId, tiltagId, dato, {
        statusImplementering: (formData.get(`tiltag_${tiltagId}_statusImplementering`) as string) || undefined,
        barrierer: (formData.get(`tiltag_${tiltagId}_barrierer`) as string) || undefined,
        naesteSkrid: (formData.get(`tiltag_${tiltagId}_naesteSkrid`) as string) || undefined,
      }),
    ),
  );

  return { message: 'Status gemt ✓' };
}
```

- [ ] **Step 2: Write the rapport form component**

```tsx
// components/tovholder-rapport-form.tsx
'use client';
import { useActionState } from 'react';
import { saveRapportAction } from '@/app/rapport/actions';
import { Button } from '@/components/ui/button';

type TiltagRow = {
  id: string;
  titel: string;
  status: string;
  type: string;
  beskrivelse?: string | null;
};

type RapportRow = {
  tiltagId: string;
  statusImplementering?: string | null;
  barrierer?: string | null;
  naesteSkrid?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planlagt', in_progress: 'Igangværende',
  completed: 'Gennemført', discontinued: 'Udgået',
};

export function TovholderRapportForm({
  tiltag,
  rapporter,
}: {
  tiltag: TiltagRow[];
  rapporter: RapportRow[];
}) {
  const [state, formAction, pending] = useActionState(saveRapportAction, undefined);
  const getRapport = (id: string) => rapporter.find((r) => r.tiltagId === id);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {tiltag.length === 0 && (
        <p className="text-gray-500">Du har ingen tiltag tilknyttet endnu.</p>
      )}

      {tiltag.map((t) => {
        const rapport = getRapport(t.id);
        return (
          <div key={t.id} className="rounded-xl border border-gray-200 p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t.titel}</h2>
                <p className="text-xs text-gray-400">{STATUS_LABELS[t.status] ?? t.status}</p>
              </div>
            </div>
            <input type="hidden" name={`tiltag_${t.id}_id`} value={t.id} />

            <div className="grid gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Status for implementering</label>
                <textarea
                  name={`tiltag_${t.id}_statusImplementering`}
                  rows={2}
                  defaultValue={rapport?.statusImplementering ?? ''}
                  placeholder="Beskriv nuværende status…"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Barrierer</label>
                <textarea
                  name={`tiltag_${t.id}_barrierer`}
                  rows={2}
                  defaultValue={rapport?.barrierer ?? ''}
                  placeholder="Hvilke barrierer er der?"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Næste skridt</label>
                <textarea
                  name={`tiltag_${t.id}_naesteSkrid`}
                  rows={2}
                  defaultValue={rapport?.naesteSkrid ?? ''}
                  placeholder="Hvad er næste skridt?"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
          </div>
        );
      })}

      {tiltag.length > 0 && (
        <div>
          {state?.message && (
            <p className={`mb-4 rounded-md px-3 py-2 text-sm ${state.message.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Gemmer…' : 'Gem status'}
          </Button>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Write rapport page**

```tsx
// app/rapport/page.tsx
import { cookies } from 'next/headers';
import { decryptTovholder } from '@/lib/tovholder-session';
import { getTovholderById } from '@/db/queries/tovholder';
import { getTiltagForTovholder } from '@/db/queries/tiltag';
import { getLatestRapporterForTovholder } from '@/db/queries/rapport';
import { TovholderRapportForm } from '@/components/tovholder-rapport-form';

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

  const [tovholder, tiltagListe, rapporter] = await Promise.all([
    getTovholderById(session.tovholderId),
    getTiltagForTovholder(session.tovholderId),
    getLatestRapporterForTovholder(session.tovholderId),
  ]);

  if (!tovholder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Tovholder ikke fundet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Hej {tovholder.navn}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Udfyld status for dine tiltag nedenfor. Du kan gemme og vende tilbage inden deadline.
          </p>
        </div>
        <TovholderRapportForm tiltag={tiltagListe} rapporter={rapporter} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test the full magic link flow**

To test locally:
1. Create a tovholder and assign tiltag
2. Open the Node REPL: `node -e "const {createMagicLink} = require('./db/queries/magic-link'); createMagicLink('TOVHOLDER_ID').then(t => console.log('http://localhost:3000/rapport/' + t))"`
3. Visit the URL in the browser
4. Verify redirect to `/rapport` with the form
5. Fill in a field, click "Gem status"
6. Verify "Status gemt ✓" message appears

- [ ] **Step 5: Commit**

```bash
git add app/rapport/ components/tovholder-rapport-form.tsx
git commit -m "feat: tovholder rapport form"
```

---

### Task 11: Rykker Job (pg-boss)

**Files:**
- Create: `instrumentation.ts`
- Create: `instrumentation-node.ts`
- Create: `lib/jobs/rykker.ts`

- [ ] **Step 1: Write rykker job handler**

```ts
// lib/jobs/rykker.ts
import { db } from '@/db';
import { magicLink, tovholder, tovholderRapport } from '@/db/schema';
import { eq, gt, and } from 'drizzle-orm';
import { createMagicLink } from '@/db/queries/magic-link';
import { sendRykkerEmail } from '@/lib/email';
import { getKommuneById } from '@/db/queries';

export async function handleRykker(): Promise<void> {
  const now = new Date();

  const activeLinks = await db
    .select({
      tovholderId: magicLink.tovholderId,
      createdAt: magicLink.createdAt,
    })
    .from(magicLink)
    .where(gt(magicLink.expiresAt, now));

  // Deduplicate: keep most recent link per tovholder
  const latestByTovholder = new Map<string, Date>();
  for (const link of activeLinks) {
    const existing = latestByTovholder.get(link.tovholderId);
    if (!existing || link.createdAt > existing) {
      latestByTovholder.set(link.tovholderId, link.createdAt);
    }
  }

  for (const [tovholderId, linkCreatedAt] of latestByTovholder) {
    const rapport = await db.query.tovholderRapport.findFirst({
      where: and(
        eq(tovholderRapport.tovholderId, tovholderId),
        gt(tovholderRapport.createdAt, linkCreatedAt),
      ),
    });
    if (rapport) continue;

    const th = await db.query.tovholder.findFirst({
      where: and(eq(tovholder.id, tovholderId), eq(tovholder.aktiv, true)),
    });
    if (!th) continue;

    const kommune = await getKommuneById(th.kommuneId);
    if (!kommune) continue;

    const token = await createMagicLink(tovholderId);
    const base = process.env.NODE_ENV === 'production'
      ? `https://${kommune.subdomain}.klimastatus.dk`
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

    await sendRykkerEmail(th.email, `${base}/rapport/${token}`, kommune.navn);
  }
}
```

- [ ] **Step 2: Write instrumentation-node.ts**

```ts
// instrumentation-node.ts
import PgBoss from 'pg-boss';
import { handleRykker } from './lib/jobs/rykker';

async function setupJobs() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();

  await boss.work('rykker', async () => {
    await handleRykker();
  });

  await boss.schedule('rykker', '0 9 * * *', {});
}

setupJobs().catch(console.error);
```

- [ ] **Step 3: Write instrumentation.ts**

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
```

- [ ] **Step 4: Verify app starts without errors**

Restart the dev server and verify no startup errors in the terminal or `.next/dev/logs/next-development.log`.

- [ ] **Step 5: Commit**

```bash
git add instrumentation.ts instrumentation-node.ts lib/jobs/rykker.ts
git commit -m "feat: pg-boss rykker job via instrumentation"
```

---

### Task 12: Dashboard Update

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Write updated dashboard**

Replace `app/(app)/dashboard/page.tsx` with:

```tsx
// app/(app)/dashboard/page.tsx
import { verifySession } from '@/lib/dal';
import { getKommuneById, getAllTovholdere, getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import { getLatestRapporterForTovholder } from '@/db/queries/rapport';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [kommune, tovholdere, tiltag, indsatser] = await Promise.all([
    getKommuneById(session.kommuneId),
    getAllTovholdere(session.kommuneId),
    getAllTiltag(session.kommuneId),
    getAllIndsatsOmraader(session.kommuneId),
  ]);
  if (!kommune) redirect('/login');

  // Count active tiltag by status
  const aktiveTiltag = tiltag.filter((t) => t.status !== 'discontinued');
  const igangvaerende = tiltag.filter((t) => t.status === 'in_progress').length;

  // Tovholder rapport coverage (approximate: any rapport in last 30 days)
  const aktiveTovholdere = tovholdere.filter((t) => t.aktiv);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rapporter = await Promise.all(
    aktiveTovholdere.map((t) => getLatestRapporterForTovholder(t.id)),
  );
  const harSvaret = rapporter.filter(
    (rs, i) => rs.some((r) => new Date(r.createdAt) > cutoff),
  ).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{kommune.navn} Kommune</h1>
        <p className="mt-1 text-sm text-gray-500">Klimastatus-overblik</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatusCard
          title="Handlinger"
          value={`${igangvaerende}/${aktiveTiltag.length}`}
          description="igangværende tiltag"
          status={igangvaerende > 0 ? 'green' : 'neutral'}
        />
        <StatusCard
          title="Tovholdere"
          value={aktiveTovholdere.length === 0 ? '—' : `${harSvaret}/${aktiveTovholdere.length}`}
          description={aktiveTovholdere.length === 0 ? 'Ingen tovholdere' : 'har rapporteret (30 dage)'}
          status={aktiveTovholdere.length === 0 ? 'neutral' : harSvaret === aktiveTovholdere.length ? 'green' : 'yellow'}
        />
        <StatusCard
          title="CCTF-status"
          value="—"
          description="Selvevaluering ikke påbegyndt"
          status="neutral"
        />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <QuickLink href="/indsatser" label="Indsatsområder" count={indsatser.length} />
        <QuickLink href="/tiltag" label="Handlingsoverblik" count={aktiveTiltag.length} />
        <QuickLink href="/tovholdere" label="Tovholdere" count={aktiveTovholdere.length} />
      </div>
    </div>
  );
}

function StatusCard({ title, value, description, status }: {
  title: string; value: string; description: string;
  status: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const colors = {
    green: 'bg-green-50 border-green-200', yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200', neutral: 'bg-white border-gray-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[status]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function QuickLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Test in browser**

Navigate to `http://localhost:3000/dashboard`. Expected: three status cards show counts. Quick links at bottom navigate correctly.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx
git commit -m "feat: dashboard with real tovholder and tiltag counts"
```

---

## Self-Review

**Spec coverage:**
- ✅ Handlingsoverblik: tiltag CRUD, filtering by indsatsområde, status badges
- ✅ Indsatsområde management: prerequisite for tiltag creation
- ✅ Tovholder management: create, edit, assign tiltag
- ✅ Magic link generation: crypto.randomBytes(32), SHA-256 hashed, stored in DB
- ✅ Email via Brevo fetch (no SDK)
- ✅ Tovholder session: separate `tovholder-session` JWT cookie, 7-day expiry
- ✅ Tovholder form `/rapport/<token>`: desktop-first, no login, lists all their tiltag
- ✅ Can return and edit (session persists after magic link is consumed)
- ✅ Save rapport: upsert per (tovholderId, tiltagId, dato)
- ✅ Automatic rykker email: pg-boss + instrumentation.ts, daily at 09:00
- ✅ Dashboard update: real tovholder + tiltag counts

**Placeholder scan:** None found.

**Type consistency:** `TovholderSessionPayload` used consistently across `lib/tovholder-session.ts`, `app/rapport/[token]/route.ts`, and `app/rapport/page.tsx`. `RapportData` defined once in `db/queries/rapport.ts`.
