# Fase 0: Asynkron AI-import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Genopliv den eksisterende AI-import af handlingskataloger ved at flytte Claude-kaldet til et pg-boss baggrundsjob, så det ikke længere timeout'er i en serverless API-route.

**Architecture:** Brugeren uploader en fil til `POST /api/importer/enqueue`, som gemmer filens indhold i en ny `import_job`-tabel og enqueuer et pg-boss job. En worker kører Claude-analysen uden tidsbegrænsning og gemmer resultatet tilbage i tabellen. Klienten poller `GET /api/importer/status/[jobId]` hvert 3. sekund til jobbet er færdigt, og viser derefter det eksisterende review-UI uændret.

**Tech Stack:** Next.js 16, pg-boss 12, Drizzle ORM, Anthropic SDK (claude-sonnet-4-6), Vitest

---

## File Map

| Fil | Handling | Ansvar |
|-----|----------|--------|
| `db/schema/enums.ts` | Modify | Tilføj `importJobStatusEnum` |
| `db/schema/import-job.ts` | Create | `import_job`-tabelskema |
| `db/schema/index.ts` | Modify | Re-eksporter nyt schema |
| `db/queries/import-job.ts` | Create | CRUD-funktioner til `import_job` |
| `db/queries/import-job.test.ts` | Create | Tests for queries |
| `lib/jobs/import-handlingskatalog.ts` | Create | pg-boss job handler (Claude-logik) |
| `lib/jobs/import-handlingskatalog.test.ts` | Create | Tests for job handler |
| `instrumentation-node.ts` | Modify | Registrer `import-handlingskatalog`-kø |
| `app/api/importer/enqueue/route.ts` | Create | Modtag fil, gem i DB, send job |
| `app/api/importer/status/[jobId]/route.ts` | Create | Poll job-status |
| `app/api/importer/route.ts` | Delete | Erstattes af ovenstående to routes |
| `app/(app)/indsatser/importer/importer-client.tsx` | Modify | Brug polling i stedet for direkte fetch |

---

## Task 1: Tilføj enum og opret `import_job`-skema

**Files:**
- Modify: `db/schema/enums.ts`
- Create: `db/schema/import-job.ts`

- [ ] **Tilføj `importJobStatusEnum` til enums.ts**

  Åbn `db/schema/enums.ts` og tilføj denne linje i bunden af filen:

  ```ts
  export const importJobStatusEnum = pgEnum('import_job_status', [
    'pending', 'processing', 'complete', 'failed',
  ]);
  ```

- [ ] **Opret `db/schema/import-job.ts`**

  ```ts
  import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
  import { kommune } from './kommune';
  import { importJobStatusEnum } from './enums';

  export const importJob = pgTable('import_job', {
    id: uuid('id').primaryKey().defaultRandom(),
    kommuneId: uuid('kommune_id').notNull().references(() => kommune.id),
    filnavn: text('filnavn').notNull(),
    filtype: text('filtype').notNull(),
    filindhold: text('filindhold').notNull(),
    status: importJobStatusEnum('status').notNull().default('pending'),
    resultat: jsonb('resultat'),
    fejl: text('fejl'),
    oprettet: timestamp('oprettet', { withTimezone: true }).defaultNow().notNull(),
    opdateret: timestamp('opdateret', { withTimezone: true }).defaultNow().notNull(),
  });
  ```

- [ ] **Eksporter fra `db/schema/index.ts`**

  Tilføj øverst i eksport-listen (efter de eksisterende exports):

  ```ts
  export * from './import-job';
  ```

- [ ] **Commit**

  ```bash
  git add db/schema/enums.ts db/schema/import-job.ts db/schema/index.ts
  git commit -m "feat: tilføj import_job skema og enum"
  ```

---

## Task 2: Generér og kør migration

**Files:**
- Create: `db/migrations/0004_import_job.sql` (auto-genereret)

- [ ] **Generér migration**

  ```bash
  npx drizzle-kit generate
  ```

  Expected: Ny fil `db/migrations/0004_*.sql` oprettes med `CREATE TYPE import_job_status` og `CREATE TABLE import_job`.

- [ ] **Kør migration mod lokal database**

  ```bash
  npx drizzle-kit migrate
  ```

  Expected: Output viser `[✓] import_job` og ingen fejl.

- [ ] **Commit**

  ```bash
  git add db/migrations/
  git commit -m "feat: migrer import_job tabel til database"
  ```

---

## Task 3: Skriv DB-queries for `import_job`

**Files:**
- Create: `db/queries/import-job.ts`

- [ ] **Opret `db/queries/import-job.ts`**

  ```ts
  import { db } from '@/db';
  import { importJob } from '@/db/schema';
  import { eq } from 'drizzle-orm';

  export type NewImportJob = {
    kommuneId: string;
    filnavn: string;
    filtype: string;
    filindhold: string;
  };

  export type ImportJobRow = typeof importJob.$inferSelect;

  export async function createImportJob(data: NewImportJob): Promise<ImportJobRow> {
    const [row] = await db.insert(importJob).values(data).returning();
    return row;
  }

  export async function getImportJob(id: string): Promise<ImportJobRow | undefined> {
    const rows = await db.select().from(importJob).where(eq(importJob.id, id)).limit(1);
    return rows[0];
  }

  export async function updateImportJobStatus(
    id: string,
    status: 'processing' | 'complete' | 'failed',
    opts?: { resultat?: unknown; fejl?: string },
  ): Promise<void> {
    await db
      .update(importJob)
      .set({
        status,
        resultat: opts?.resultat ?? null,
        fejl: opts?.fejl ?? null,
        opdateret: new Date(),
      })
      .where(eq(importJob.id, id));
  }
  ```

- [ ] **Commit**

  ```bash
  git add db/queries/import-job.ts
  git commit -m "feat: tilføj import_job query-funktioner"
  ```

---

## Task 4: Skriv tests for import-job queries

**Files:**
- Create: `db/queries/import-job.test.ts`

- [ ] **Skriv failing tests**

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  const mockRow = {
    id: 'job1',
    kommuneId: 'k1',
    filnavn: 'katalog.pdf',
    filtype: 'pdf',
    filindhold: 'base64data',
    status: 'pending' as const,
    resultat: null,
    fejl: null,
    oprettet: new Date(),
    opdateret: new Date(),
  };

  const mockReturning = vi.fn().mockResolvedValue([mockRow]);
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockFindFirst = vi.fn().mockResolvedValue(mockRow);
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));

  vi.mock('@/db', () => ({
    db: {
      insert: mockInsert,
      update: mockUpdate,
      query: { importJob: { findFirst: mockFindFirst } },
    },
  }));
  vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
  vi.mock('@/db/schema', () => ({ importJob: {} }));

  describe('createImportJob', () => {
    it('indsætter row og returnerer den', async () => {
      const { createImportJob } = await import('./import-job');
      const result = await createImportJob({
        kommuneId: 'k1',
        filnavn: 'katalog.pdf',
        filtype: 'pdf',
        filindhold: 'base64data',
      });
      expect(result.id).toBe('job1');
      expect(result.status).toBe('pending');
    });
  });

  describe('getImportJob', () => {
    it('returnerer row ved korrekt id', async () => {
      const { getImportJob } = await import('./import-job');
      const result = await getImportJob('job1');
      expect(result?.id).toBe('job1');
    });

    it('returnerer undefined ved ukendt id', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);
      const { getImportJob } = await import('./import-job');
      const result = await getImportJob('ukendt');
      expect(result).toBeUndefined();
    });
  });

  describe('updateImportJobStatus', () => {
    it('kalder update med korrekt status og tidsstempel', async () => {
      const { updateImportJobStatus } = await import('./import-job');
      await updateImportJobStatus('job1', 'complete', { resultat: { indsatsomraader: [] } });
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'complete', resultat: { indsatsomraader: [] } }),
      );
    });

    it('sætter fejl og nulstiller resultat ved failed', async () => {
      const { updateImportJobStatus } = await import('./import-job');
      await updateImportJobStatus('job1', 'failed', { fejl: 'Timeout' });
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', fejl: 'Timeout', resultat: null }),
      );
    });
  });
  ```

- [ ] **Kør tests — forvent grøn**

  ```bash
  npx vitest run db/queries/import-job.test.ts
  ```

  Expected: 4 tests, alle PASS.

- [ ] **Commit**

  ```bash
  git add db/queries/import-job.test.ts
  git commit -m "test: import_job query-tests"
  ```

---

## Task 5: Opret job handler med Claude-logik

**Files:**
- Create: `lib/jobs/import-handlingskatalog.ts`

Denne fil er en flytning af Claude-logikken fra den eksisterende `app/api/importer/route.ts`. SYSTEM_PROMPT og TOOL er de præcis samme konstanter.

- [ ] **Opret `lib/jobs/import-handlingskatalog.ts`**

  ```ts
  import Anthropic from '@anthropic-ai/sdk';
  import { getImportJob, updateImportJobStatus } from '@/db/queries/import-job';

  const SYSTEM_PROMPT = `Du er assistent til klimakoordinatorer i danske kommuner.
  Analyser handlingskataloget og udtræk ALLE klimaindsatser og -handlinger.
  Kald funktionen gem_handlingskatalog med det fundne indhold.

  Vurderingskriterier for type:
  - ghg_reduction: CO₂-/drivhusgasreduktion
  - adaptation: klimatilpasning, oversvømmelse, tørke, varme
  - consumption: forbrugsmønstre, indkøb
  - just_transition: retfærdig omstilling, social
  - cross_cutting: tværgående, gælder flere sektorer`;

  const TOOL: Anthropic.Tool = {
    name: 'gem_handlingskatalog',
    description: 'Gem udtrukne indsatsområder og handlinger fra handlingskataloget',
    input_schema: {
      type: 'object' as const,
      properties: {
        indsatsomraader: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              navn: { type: 'string', description: 'Navn på indsatsområde, maks 60 tegn' },
              type: { type: 'string', enum: ['ghg_reduction', 'adaptation', 'consumption', 'just_transition', 'cross_cutting'] },
              sektor: { type: 'string', enum: ['energy', 'transport', 'buildings', 'food', 'agriculture', 'waste', 'adaptation', 'other'] },
              beskrivelse: { type: 'string' },
              handlinger: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    titel: { type: 'string', description: 'Handlingens titel, maks 80 tegn' },
                    type: { type: 'string', enum: ['reduction', 'adaptation', 'both'] },
                    status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'discontinued'] },
                    beskrivelse: { type: 'string' },
                  },
                  required: ['titel', 'type', 'status'],
                },
              },
            },
            required: ['navn', 'type', 'sektor', 'handlinger'],
          },
        },
      },
      required: ['indsatsomraader'],
    },
  };

  export async function handleImportHandlingskatalog(data: { importJobId: string }): Promise<void> {
    const { importJobId } = data;

    const job = await getImportJob(importJobId);
    if (!job) throw new Error(`Import job ${importJobId} ikke fundet`);

    await updateImportJobStatus(importJobId, 'processing');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let userContent: Anthropic.MessageParam['content'];

    if (job.filtype === 'pdf') {
      userContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: job.filindhold },
        } as Anthropic.DocumentBlockParam,
        { type: 'text', text: 'Udtræk alle indsatsområder og handlinger fra dette handlingskatalog.' },
      ];
    } else {
      userContent = `Udtræk alle indsatsområder og handlinger fra dette handlingskatalog:\n\n${job.filindhold}`;
    }

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'gem_handlingskatalog' },
        messages: [{ role: 'user', content: userContent }],
      });

      const toolUse = response.content.find((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
      if (!toolUse) {
        await updateImportJobStatus(importJobId, 'failed', { fejl: 'AI returnerede ikke struktureret data — prøv igen' });
        return;
      }

      await updateImportJobStatus(importJobId, 'complete', { resultat: toolUse.input });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateImportJobStatus(importJobId, 'failed', { fejl: `AI-fejl: ${msg}` });
    }
  }
  ```

- [ ] **Commit**

  ```bash
  git add lib/jobs/import-handlingskatalog.ts
  git commit -m "feat: flyt Claude-import til pg-boss job handler"
  ```

---

## Task 6: Skriv tests for job handler

**Files:**
- Create: `lib/jobs/import-handlingskatalog.test.ts`

- [ ] **Skriv failing tests**

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  const mockJob = {
    id: 'job1',
    kommuneId: 'k1',
    filnavn: 'katalog.pdf',
    filtype: 'pdf',
    filindhold: 'base64pdfdata',
    status: 'pending' as const,
    resultat: null,
    fejl: null,
    oprettet: new Date(),
    opdateret: new Date(),
  };

  const mockGetImportJob = vi.fn().mockResolvedValue(mockJob);
  const mockUpdateImportJobStatus = vi.fn().mockResolvedValue(undefined);

  vi.mock('@/db/queries/import-job', () => ({
    getImportJob: mockGetImportJob,
    updateImportJobStatus: mockUpdateImportJobStatus,
  }));

  const mockCreate = vi.fn();
  vi.mock('@anthropic-ai/sdk', () => ({
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  }));

  describe('handleImportHandlingskatalog', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockGetImportJob.mockResolvedValue(mockJob);
      mockUpdateImportJobStatus.mockResolvedValue(undefined);
      process.env.ANTHROPIC_API_KEY = 'test-key';
    });

    it('kaster fejl hvis job ikke findes', async () => {
      mockGetImportJob.mockResolvedValueOnce(undefined);
      const { handleImportHandlingskatalog } = await import('./import-handlingskatalog');
      await expect(handleImportHandlingskatalog({ importJobId: 'ukendt' })).rejects.toThrow('ikke fundet');
    });

    it('sætter status processing, derefter complete ved succes', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', input: { indsatsomraader: [{ navn: 'Energi', type: 'ghg_reduction', sektor: 'energy', handlinger: [] }] } }],
      });
      const { handleImportHandlingskatalog } = await import('./import-handlingskatalog');
      await handleImportHandlingskatalog({ importJobId: 'job1' });

      expect(mockUpdateImportJobStatus).toHaveBeenCalledWith('job1', 'processing');
      expect(mockUpdateImportJobStatus).toHaveBeenCalledWith('job1', 'complete', {
        resultat: expect.objectContaining({ indsatsomraader: expect.any(Array) }),
      });
    });

    it('sætter status failed hvis AI ikke returnerer tool_use', async () => {
      mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'noget tekst' }] });
      const { handleImportHandlingskatalog } = await import('./import-handlingskatalog');
      await handleImportHandlingskatalog({ importJobId: 'job1' });

      expect(mockUpdateImportJobStatus).toHaveBeenCalledWith('job1', 'failed', {
        fejl: expect.stringContaining('struktureret data'),
      });
    });

    it('sætter status failed ved AI-undtagelse', async () => {
      mockCreate.mockRejectedValue(new Error('network timeout'));
      const { handleImportHandlingskatalog } = await import('./import-handlingskatalog');
      await handleImportHandlingskatalog({ importJobId: 'job1' });

      expect(mockUpdateImportJobStatus).toHaveBeenCalledWith('job1', 'failed', {
        fejl: expect.stringContaining('network timeout'),
      });
    });
  });
  ```

- [ ] **Kør tests — forvent grøn**

  ```bash
  npx vitest run lib/jobs/import-handlingskatalog.test.ts
  ```

  Expected: 4 tests, alle PASS.

- [ ] **Commit**

  ```bash
  git add lib/jobs/import-handlingskatalog.test.ts
  git commit -m "test: import-handlingskatalog job handler tests"
  ```

---

## Task 7: Registrér pg-boss kø i instrumentation-node.ts

**Files:**
- Modify: `instrumentation-node.ts`

- [ ] **Tilføj import øverst i filen**

  Tilføj på linje 5 (efter de eksisterende imports):

  ```ts
  import { handleImportHandlingskatalog } from './lib/jobs/import-handlingskatalog';
  ```

- [ ] **Registrér køen i `setupJobs()`**

  Tilføj efter den eksisterende `fetch-dst`-blok (efter linje 36):

  ```ts
  await boss.createQueue('import-handlingskatalog');
  await boss.work('import-handlingskatalog', { localConcurrency: 1 }, async (jobs) => {
    const data = jobs[0]?.data as { importJobId: string } | undefined;
    if (!data?.importJobId) return;
    await handleImportHandlingskatalog(data);
  });
  ```

  Ingen schedule — denne kø trigges kun manuelt.

- [ ] **Kør TypeScript-tjek**

  ```bash
  npx tsc --noEmit
  ```

  Expected: Ingen fejl.

- [ ] **Commit**

  ```bash
  git add instrumentation-node.ts
  git commit -m "feat: registrér import-handlingskatalog kø i pg-boss"
  ```

---

## Task 8: Opret enqueue API-route

**Files:**
- Create: `app/api/importer/enqueue/route.ts`

Denne route erstatter `app/api/importer/route.ts`. Den modtager filen, ekstraher indhold, gemmer i DB og sender pg-boss job.

- [ ] **Opret `app/api/importer/enqueue/route.ts`**

  ```ts
  import { NextRequest, NextResponse } from 'next/server';
  import * as XLSX from 'xlsx';
  import { getBoss } from '@/lib/jobs/boss-client';
  import { verifySession } from '@/lib/dal';
  import { createImportJob } from '@/db/queries/import-job';

  export const maxDuration = 30;

  const MAX_FILE_MB = 15;
  const MAX_TEXT_CHARS = 60_000;

  export async function POST(req: NextRequest) {
    const session = await verifySession();
    if (!session?.kommuneId) {
      return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY er ikke konfigureret' }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Ingen fil modtaget' }, { status: 400 });

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Filen er for stor (maks ${MAX_FILE_MB} MB)` }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'csv', 'xlsx', 'xls', 'docx'].includes(ext)) {
      return NextResponse.json({ error: `Filtype .${ext} understøttes ikke` }, { status: 400 });
    }

    let filindhold: string;
    try {
      if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        filindhold = Buffer.from(buffer).toString('base64');
      } else if (ext === 'csv') {
        filindhold = (await file.text()).slice(0, MAX_TEXT_CHARS);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'buffer' });
        filindhold = wb.SheetNames
          .map((n) => `=== ${n} ===\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`)
          .join('\n\n')
          .slice(0, MAX_TEXT_CHARS);
      } else {
        const mammoth = await import('mammoth');
        const buffer = await file.arrayBuffer();
        filindhold = ((await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).value).slice(0, MAX_TEXT_CHARS);
      }
    } catch (e: unknown) {
      return NextResponse.json(
        { error: `Kunne ikke læse filen: ${e instanceof Error ? e.message : e}` },
        { status: 400 },
      );
    }

    if (!filindhold.trim()) {
      return NextResponse.json({ error: 'Filen ser ud til at være tom eller kan ikke læses' }, { status: 400 });
    }

    const job = await createImportJob({
      kommuneId: session.kommuneId,
      filnavn: file.name,
      filtype: ext,
      filindhold,
    });

    const boss = await getBoss();
    await boss.send('import-handlingskatalog', { importJobId: job.id });

    return NextResponse.json({ jobId: job.id });
  }
  ```

- [ ] **Commit**

  ```bash
  git add app/api/importer/enqueue/route.ts
  git commit -m "feat: enqueue API-route til async AI-import"
  ```

---

## Task 9: Opret status API-route

**Files:**
- Create: `app/api/importer/status/[jobId]/route.ts`

- [ ] **Opret `app/api/importer/status/[jobId]/route.ts`**

  ```ts
  import { NextRequest, NextResponse } from 'next/server';
  import { verifySession } from '@/lib/dal';
  import { getImportJob } from '@/db/queries/import-job';

  export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> },
  ) {
    const session = await verifySession();
    if (!session?.kommuneId) {
      return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
    }

    const { jobId } = await params;
    const job = await getImportJob(jobId);

    if (!job || job.kommuneId !== session.kommuneId) {
      return NextResponse.json({ error: 'Job ikke fundet' }, { status: 404 });
    }

    return NextResponse.json({
      status: job.status,
      resultat: job.resultat ?? null,
      fejl: job.fejl ?? null,
    });
  }
  ```

- [ ] **Commit**

  ```bash
  git add app/api/importer/status/
  git commit -m "feat: status polling route til import job"
  ```

---

## Task 10: Opdater importer-client til polling

**Files:**
- Modify: `app/(app)/indsatser/importer/importer-client.tsx`

Den eksisterende `analyse()`-funktion kalder `/api/importer` direkte og venter. Det ændres til: kald `/api/importer/enqueue`, få `jobId` tilbage, poll `/api/importer/status/${jobId}` hvert 3. sekund.

Alt andet i filen forbliver uændret — review-UI, `doImport()` og `bulkImportAction` røres ikke.

- [ ] **Erstat `analyse()`-funktionen i importer-client.tsx**

  Find denne blok (linje 45–65):

  ```ts
  async function analyse(file: File) {
    setFileName(file.name);
    setStep('analysing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/importer', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Ukendt fejl');
      const raw: Indsats[] = (data.indsatsomraader ?? []).map((io: Omit<Indsats, 'inkluder' | 'handlinger'> & { handlinger: Omit<Handling, 'inkluder'>[] }) => ({
        ...io,
        inkluder: true,
        handlinger: (io.handlinger ?? []).map((h) => ({ ...h, inkluder: true })),
      }));
      setIndsatser(raw);
      setStep('review');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep('error');
    }
  }
  ```

  Erstat med:

  ```ts
  async function analyse(file: File) {
    setFileName(file.name);
    setStep('analysing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const enqueueRes = await fetch('/api/importer/enqueue', { method: 'POST', body: fd });
      const enqueueData = await enqueueRes.json();
      if (!enqueueRes.ok) throw new Error(enqueueData.error ?? 'Ukendt fejl ved upload');

      const { jobId } = enqueueData as { jobId: string };

      // Poll status hvert 3. sekund i maks 5 minutter
      const deadline = Date.now() + 5 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusRes = await fetch(`/api/importer/status/${jobId}`);
        const statusData = await statusRes.json() as { status: string; resultat?: { indsatsomraader?: unknown[] }; fejl?: string };
        if (!statusRes.ok) throw new Error(statusData.fejl ?? 'Fejl ved statushentning');

        if (statusData.status === 'complete') {
          const raw: Indsats[] = ((statusData.resultat?.indsatsomraader ?? []) as (Omit<Indsats, 'inkluder' | 'handlinger'> & { handlinger: Omit<Handling, 'inkluder'>[] })[]).map((io) => ({
            ...io,
            inkluder: true,
            handlinger: (io.handlinger ?? []).map((h) => ({ ...h, inkluder: true })),
          }));
          setIndsatser(raw);
          setStep('review');
          return;
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.fejl ?? 'AI-analysen mislykkedes');
        }
      }

      throw new Error('AI-analysen tog for lang tid. Prøv igen med en kortere fil.');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep('error');
    }
  }
  ```

- [ ] **Kør TypeScript-tjek**

  ```bash
  npx tsc --noEmit
  ```

  Expected: Ingen fejl.

- [ ] **Commit**

  ```bash
  git add app/(app)/indsatser/importer/importer-client.tsx
  git commit -m "feat: importer poller job-status i stedet for direkte fetch"
  ```

---

## Task 11: Slet gammel importer-route og kør alle tests

**Files:**
- Delete: `app/api/importer/route.ts`

- [ ] **Slet den gamle route**

  ```bash
  git rm app/api/importer/route.ts
  ```

- [ ] **Kør alle tests**

  ```bash
  npm test
  ```

  Expected: Alle eksisterende tests passer + de 8 nye tests passer.

- [ ] **Kør TypeScript-tjek én gang til**

  ```bash
  npx tsc --noEmit
  ```

  Expected: Ingen fejl.

- [ ] **Commit**

  ```bash
  git commit -m "refactor: fjern synkron importer-route (erstattet af enqueue + status)"
  ```

---

## Task 12: Manuel end-to-end test

- [ ] **Start dev-serveren**

  ```bash
  npm run dev
  ```

- [ ] **Åbn importersiden og upload en testfil**

  Gå til `http://localhost:3000/indsatser/importer`.

  Upload en PDF eller XLSX med klimaindsatser. Forventet flow:
  1. Fil uploades — "Claude analyserer..." vises
  2. Spinner kører i op til 5 minutter
  3. Review-UI vises med udtrukne indsatsområder og handlinger
  4. Klik "Opret" — redirect til `/indsatser`

- [ ] **Verificér at `import_job`-rækken i DB har status `complete`**

  Kør i psql eller Drizzle Studio:

  ```sql
  SELECT id, filnavn, status, opdateret FROM import_job ORDER BY oprettet DESC LIMIT 1;
  ```

  Expected: `status = 'complete'` og et tidsstempel for `opdateret`.

- [ ] **Afsluttende commit**

  ```bash
  git add -A
  git commit -m "chore: fase 0 komplet — async AI-import via pg-boss"
  ```
