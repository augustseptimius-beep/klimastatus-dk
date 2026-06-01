# Fase 5 — Offentligt klimadashboard — Implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Byg en live, offentligt tilgængeligt side på `klimastatus.dk/[slug]` der viser kommunens klimaplan-status til borgere, byråd og interessenter. Ingen auth, ingen migration udover tre konfigurationsfelter.

**Architecture:** Ny `(public)` route group uden auth. `app/(public)/[slug]/page.tsx` er et Server Component (`force-dynamic`) der henter al data parallelt. År-navigation er en client component der bruger React-state til at filtrere CO₂e-serien client-side — ingen searchParams, ingen routing-kompleksitet. Koordinatoren konfigurerer hvilke nøgletal der fremhæves og stagnationsgrænsen via `/indstillinger`.

**Tech Stack:** Next.js 16, Drizzle ORM, Postgres, Vitest, inline CSS-variabler (samme designsystem som `app/(app)`).

---

## Filstruktur

```
Ny:
  db/queries/public-dashboard.ts          ← alle public dashboard queries + ren filterlogik
  db/queries/public-dashboard.test.ts     ← vitest unit tests
  app/(public)/layout.tsx                 ← lean public layout (ingen auth, ingen sidebar)
  app/(public)/[slug]/page.tsx            ← server component, assemblerer alt data
  app/(public)/[slug]/_components/
    jaar-toggle.tsx                       ← 'use client', år-vælger
    klimamaal-hero.tsx                    ← CO₂e-trend + kommunens mål-år
    noegletal-grid.tsx                    ← de koordinator-valgte highlights
    tiltag-overblik.tsx                   ← status-fordeling + stagnerede
    indsatsomraader-sektion.tsx           ← sektorer med tiltag-count
    cctf-fold.tsx                         ← 'use client', foldbar CCTF-dækning

Modificeret:
  db/schema/kommune.ts                    ← +3 nullable felter
  proxy.ts                                ← +isPublicSlug check
  app/(app)/indstillinger/page.tsx        ← +public config-kort
  app/(app)/indstillinger/public-config-actions.ts  ← ny server action
```

---

## Task 1: DB-migration — tilføj tre offentlige konfigurationsfelter til `kommune`

**Files:**
- Modify: `db/schema/kommune.ts`
- Create: `db/migrations/0006_*.sql` (auto-genereret af drizzle-kit)

- [ ] **Step 1: Tilføj tre felter til kommune-tabellen**

Åbn `db/schema/kommune.ts`. Tilføj `boolean` og `integer` til importen, og de tre nye felter i slutningen af tabellen (før `createdAt`):

```typescript
import { pgTable, uuid, text, integer, real, date, timestamp, boolean } from 'drizzle-orm/pg-core';

export const kommune = pgTable('kommune', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommunekode: text('kommunekode').notNull().unique(),
  navn: text('navn').notNull(),
  befolkningstal: integer('befolkningstal'),
  arealKm2: real('areal_km2'),
  klimakommitmentDato: date('klimakommitment_dato'),
  klimakommitmentTekst: text('klimakommitment_tekst'),
  recertificeringsdato: date('recertificeringsdato'),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  fontFamily: text('font_family'),
  subdomain: text('subdomain').notNull().unique(),
  publicEnabled: boolean('public_enabled').notNull().default(false),
  publicStaleDays: integer('public_stale_days'),
  publicHighlights: text('public_highlights').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Generér migration**

```bash
npx drizzle-kit generate
```

Forventet output: `Generated 1 migration file in ./db/migrations/0006_*.sql`

- [ ] **Step 3: Kør migration**

```bash
npx drizzle-kit migrate
```

Forventet output: `All migrations have been successfully applied`

- [ ] **Step 4: Commit**

```bash
git add db/schema/kommune.ts db/migrations/
git commit -m "feat: tilføj public_enabled, public_stale_days, public_highlights til kommune"
```

---

## Task 2: Public dashboard queries

**Files:**
- Create: `db/queries/public-dashboard.ts`

Filen eksporterer alle typer og funktioner der bruges på det offentlige dashboard. Den rene `filterStagnerede`-funktion er adskilt fra DB-kaldene så den kan testes uden mock.

- [ ] **Step 1: Opret filen med types og ren hjælpefunktion**

```typescript
// db/queries/public-dashboard.ts
import { db } from '@/db';
import {
  tiltag,
  indsatsOmraade,
  indikatorMaaling,
  kommuneIndikator,
  indikatorTemplate,
  tovholderRapport,
} from '@/db/schema';
import { eq, and, asc, desc, ne, inArray } from 'drizzle-orm';

export type Co2eDataPoint = { aar: number | null; vaerdi: number };

export type PublicHighlight = {
  kommuneIndikatorId: string;
  label: string;
  enhed: string;
  senesteAar: number | null;
  senesteVaerdi: number | null;
};

export type StagnertTiltag = {
  id: string;
  titel: string;
  indsatsOmraadeId: string;
};

export type TiltagStatusOversigt = {
  planned: number;
  in_progress: number;
  completed: number;
  stagneret: number;
};

export type IndsatsomraadeMedCount = {
  id: string;
  navn: string;
  sektor: string;
  type: string;
  aktiveTiltagCount: number;
};

export type ActiveKommuneIndikatorOption = {
  id: string;
  label: string;
  enhed: string;
};

/** Ren funktion — kan testes uden DB-mock. */
export function filterStagnerede(
  igangvaerende: StagnertTiltag[],
  latestRapportByTiltagId: Map<string, Date>,
  cutoff: Date,
): StagnertTiltag[] {
  return igangvaerende.filter((t) => {
    const latest = latestRapportByTiltagId.get(t.id);
    return !latest || latest < cutoff;
  });
}
```

- [ ] **Step 2: Tilføj getCo2eSeries**

```typescript
export async function getCo2eSeries(kommuneId: string): Promise<Co2eDataPoint[]> {
  return db
    .select({ aar: indikatorMaaling.aar, vaerdi: indikatorMaaling.vaerdi })
    .from(indikatorMaaling)
    .innerJoin(kommuneIndikator, eq(indikatorMaaling.indikatorId, kommuneIndikator.indikatorId))
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(
      and(
        eq(kommuneIndikator.kommuneId, kommuneId),
        eq(kommuneIndikator.aktiv, true),
        eq(indikatorTemplate.kilde, 'klimaregnskab'),
      ),
    )
    .orderBy(asc(indikatorMaaling.aar));
}
```

- [ ] **Step 3: Tilføj getPublicHighlights**

```typescript
export async function getPublicHighlights(
  kommuneId: string,
  highlightIds: string[],
): Promise<PublicHighlight[]> {
  if (highlightIds.length === 0) return [];

  const rows = await db
    .select({
      kiId: kommuneIndikator.id,
      visningsnavn: kommuneIndikator.visningsnavn,
      titel: indikatorTemplate.titel,
      enhed: indikatorTemplate.enhed,
      indikatorId: kommuneIndikator.indikatorId,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(
      and(
        eq(kommuneIndikator.kommuneId, kommuneId),
        inArray(kommuneIndikator.id, highlightIds),
      ),
    );

  return Promise.all(
    rows.map(async (row) => {
      const [latest] = await db
        .select({ aar: indikatorMaaling.aar, vaerdi: indikatorMaaling.vaerdi })
        .from(indikatorMaaling)
        .where(eq(indikatorMaaling.indikatorId, row.indikatorId))
        .orderBy(desc(indikatorMaaling.aar))
        .limit(1);

      return {
        kommuneIndikatorId: row.kiId,
        label: row.visningsnavn ?? row.titel,
        enhed: row.enhed,
        senesteAar: latest?.aar ?? null,
        senesteVaerdi: latest?.vaerdi ?? null,
      };
    }),
  );
}
```

- [ ] **Step 4: Tilføj getStagnerteTiltag + getTiltagStatusOversigt**

```typescript
export async function getStagnerteTiltag(
  kommuneId: string,
  staleDays: number,
): Promise<StagnertTiltag[]> {
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const igangvaerende = await db
    .select({ id: tiltag.id, titel: tiltag.titel, indsatsOmraadeId: tiltag.indsatsOmraadeId })
    .from(tiltag)
    .where(and(eq(tiltag.kommuneId, kommuneId), eq(tiltag.status, 'in_progress')));

  if (igangvaerende.length === 0) return [];

  const tiltagIds = igangvaerende.map((t) => t.id);
  const rapporter = await db
    .select({ tiltagId: tovholderRapport.tiltagId, createdAt: tovholderRapport.createdAt })
    .from(tovholderRapport)
    .where(inArray(tovholderRapport.tiltagId, tiltagIds));

  const latestByTiltag = new Map<string, Date>();
  for (const r of rapporter) {
    const ts = new Date(r.createdAt);
    const existing = latestByTiltag.get(r.tiltagId);
    if (!existing || ts > existing) latestByTiltag.set(r.tiltagId, ts);
  }

  return filterStagnerede(igangvaerende, latestByTiltag, cutoff);
}

export async function getTiltagStatusOversigt(
  kommuneId: string,
  staleDays: number,
): Promise<TiltagStatusOversigt> {
  const alleTiltag = await db
    .select({ id: tiltag.id, status: tiltag.status })
    .from(tiltag)
    .where(and(eq(tiltag.kommuneId, kommuneId), ne(tiltag.status, 'discontinued')));

  const stagnerede = await getStagnerteTiltag(kommuneId, staleDays);
  const stagneredeIds = new Set(stagnerede.map((t) => t.id));

  const oversigt: TiltagStatusOversigt = { planned: 0, in_progress: 0, completed: 0, stagneret: 0 };
  for (const t of alleTiltag) {
    if (t.status === 'in_progress' && stagneredeIds.has(t.id)) oversigt.stagneret++;
    else if (t.status === 'planned') oversigt.planned++;
    else if (t.status === 'in_progress') oversigt.in_progress++;
    else if (t.status === 'completed') oversigt.completed++;
  }
  return oversigt;
}
```

- [ ] **Step 5: Tilføj getIndsatsomraaderMedTiltagCount + getAktiveKommuneIndikatorer**

```typescript
export async function getIndsatsomraaderMedTiltagCount(
  kommuneId: string,
): Promise<IndsatsomraadeMedCount[]> {
  const indsatser = await db
    .select({
      id: indsatsOmraade.id,
      navn: indsatsOmraade.navn,
      sektor: indsatsOmraade.sektor,
      type: indsatsOmraade.type,
    })
    .from(indsatsOmraade)
    .where(and(eq(indsatsOmraade.kommuneId, kommuneId), eq(indsatsOmraade.aktiv, true)))
    .orderBy(asc(indsatsOmraade.navn));

  return Promise.all(
    indsatser.map(async (io) => {
      const rows = await db
        .select({ id: tiltag.id })
        .from(tiltag)
        .where(and(eq(tiltag.indsatsOmraadeId, io.id), ne(tiltag.status, 'discontinued')));
      return { ...io, aktiveTiltagCount: rows.length };
    }),
  );
}

export async function getAktiveKommuneIndikatorer(
  kommuneId: string,
): Promise<ActiveKommuneIndikatorOption[]> {
  const rows = await db
    .select({
      id: kommuneIndikator.id,
      visningsnavn: kommuneIndikator.visningsnavn,
      titel: indikatorTemplate.titel,
      enhed: indikatorTemplate.enhed,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(eq(kommuneIndikator.kommuneId, kommuneId), eq(kommuneIndikator.aktiv, true)))
    .orderBy(asc(indikatorTemplate.titel));

  return rows.map((r) => ({ id: r.id, label: r.visningsnavn ?? r.titel, enhed: r.enhed }));
}
```

- [ ] **Step 6: Commit**

```bash
git add db/queries/public-dashboard.ts
git commit -m "feat: public dashboard queries (CO2e, highlights, stagnation, indsatsområder)"
```

---

## Task 3: Tests for public dashboard queries

**Files:**
- Create: `db/queries/public-dashboard.test.ts`

- [ ] **Step 1: Skriv tests for filterStagnerede (ingen mock nødvendig)**

```typescript
// db/queries/public-dashboard.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      limit: vi.fn().mockResolvedValue([]),
    })),
  },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), and: vi.fn(), asc: vi.fn(), desc: vi.fn(), ne: vi.fn(), inArray: vi.fn(),
}));
vi.mock('@/db/schema', () => ({
  tiltag: {}, indsatsOmraade: {}, indikatorMaaling: {},
  kommuneIndikator: {}, indikatorTemplate: {}, tovholderRapport: {},
}));

describe('filterStagnerede', () => {
  const tiltag = [
    { id: 't1', titel: 'Transport', indsatsOmraadeId: 'io1' },
    { id: 't2', titel: 'Varme',     indsatsOmraadeId: 'io1' },
    { id: 't3', titel: 'Affald',    indsatsOmraadeId: 'io2' },
  ];
  const cutoff = new Date('2026-01-01');

  it('flagger alle tiltag uden rapport', async () => {
    const { filterStagnerede } = await import('./public-dashboard');
    const result = filterStagnerede(tiltag, new Map(), cutoff);
    expect(result).toHaveLength(3);
  });

  it('flagger tiltag med rapport ældre end cutoff', async () => {
    const { filterStagnerede } = await import('./public-dashboard');
    const map = new Map([['t1', new Date('2025-06-01')]]);
    const result = filterStagnerede(tiltag, map, cutoff);
    expect(result.map((t) => t.id)).toContain('t1');
  });

  it('udelukker tiltag med nylig rapport', async () => {
    const { filterStagnerede } = await import('./public-dashboard');
    const map = new Map([['t2', new Date('2026-02-01')]]);
    const result = filterStagnerede(tiltag, map, cutoff);
    expect(result.map((t) => t.id)).not.toContain('t2');
  });

  it('returnerer tom liste hvis ingen igangværende', async () => {
    const { filterStagnerede } = await import('./public-dashboard');
    expect(filterStagnerede([], new Map(), cutoff)).toHaveLength(0);
  });
});

describe('getCo2eSeries', () => {
  it('returnerer data-array fra db', async () => {
    const { db } = await import('@/db');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { aar: 2022, vaerdi: 12.5 },
        { aar: 2023, vaerdi: 11.8 },
      ]),
    });
    const { getCo2eSeries } = await import('./public-dashboard');
    const result = await getCo2eSeries('kommune-1');
    expect(result).toHaveLength(2);
    expect(result[0].aar).toBe(2022);
    expect(result[1].vaerdi).toBe(11.8);
  });
});
```

- [ ] **Step 2: Kør tests**

```bash
npx vitest run db/queries/public-dashboard.test.ts
```

Forventet output: `5 passed`

- [ ] **Step 3: Commit**

```bash
git add db/queries/public-dashboard.test.ts
git commit -m "test: public dashboard queries"
```

---

## Task 4: Middleware-opdatering

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Tilføj isPublicSlug og opdater isPublic-check**

Åbn `proxy.ts`. Tilføj `isPublicSlug`-funktionen og opdater `isPublic`-konstanten:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const publicRoutes = ['/', '/login'];
const publicPrefixes = ['/rapport'];
const adminRoutes = ['/admin'];

const reservedSegments = new Set([
  'login', 'admin', 'rapport', 'dashboard', 'tiltag',
  'indsatser', 'tovholdere', 'data', 'selvevaluering',
  'indstillinger', 'laering', 'api', '_next', 'favicon.ico',
]);

function isPublicSlug(path: string): boolean {
  const match = path.match(/^\/([a-z][a-z0-9-]*)$/);
  return match !== null && !reservedSegments.has(match[1]);
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic =
    publicRoutes.includes(path) ||
    publicPrefixes.some((p) => path.startsWith(p)) ||
    isPublicSlug(path);
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

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat: isPublicSlug middleware — åbner /[slug] som offentlig rute"
```

---

## Task 5: Public route group — layout

**Files:**
- Create: `app/(public)/layout.tsx`

- [ ] **Step 1: Opret layout**

```typescript
// app/(public)/layout.tsx
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F0E8',
      fontFamily: 'var(--font-rubik, system-ui, sans-serif)',
      color: '#1A1A18',
    }}>
      <header style={{
        borderBottom: '1px solid #D9D2C2',
        background: '#FFFFFF',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto',
          padding: '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          <Link href="/" style={{
            fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em',
            textDecoration: 'none', color: '#1A1A18',
          }}>
            Klimastatus
            <span style={{ fontFamily: 'Georgia, serif', color: '#1E6B3A', fontWeight: 700 }}>.</span>
            dk
          </Link>
          <span style={{ fontSize: 12, color: '#9A9A8E' }}>Offentlig klimastatus</span>
        </div>
      </header>
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 96px' }}>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/'(public)'/layout.tsx
git commit -m "feat: (public) route group layout"
```

---

## Task 6: År-toggle (client component)

**Files:**
- Create: `app/(public)/[slug]/_components/jaar-toggle.tsx`

Modtager den fulde CO₂e-serie og kalder en callback med det valgte år. Bruges i `KlimamaalHero`.

- [ ] **Step 1: Opret komponenten**

```typescript
// app/(public)/[slug]/_components/jaar-toggle.tsx
'use client';

type Props = {
  tilgaengeligeAar: number[];
  valgteAar: number;
  onAarValgt: (aar: number) => void;
};

export function JaarToggle({ tilgaengeligeAar, valgteAar, onAarValgt }: Props) {
  if (tilgaengeligeAar.length <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {tilgaengeligeAar.map((aar) => (
        <button
          key={aar}
          onClick={() => onAarValgt(aar)}
          style={{
            padding: '4px 10px',
            fontSize: 13,
            fontWeight: valgteAar === aar ? 700 : 500,
            borderRadius: 4,
            border: '1px solid',
            borderColor: valgteAar === aar ? '#1E6B3A' : '#D9D2C2',
            background: valgteAar === aar ? '#1E6B3A' : 'transparent',
            color: valgteAar === aar ? '#FFFFFF' : '#3D3D38',
            cursor: 'pointer',
          }}
        >
          {aar}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(public)/[slug]/_components/jaar-toggle.tsx"
git commit -m "feat: JaarToggle — client component til år-navigation på public dashboard"
```

---

## Task 7: KlimamaalHero — CO₂e-trend og kommunens mål

**Files:**
- Create: `app/(public)/[slug]/_components/klimamaal-hero.tsx`

Modtager hele CO₂e-serien og viser: seneste CO₂e-tal, ændring fra forrige år, mål-år og år-toggle. Er en `'use client'` komponent da den har intern år-state.

- [ ] **Step 1: Opret komponenten**

```typescript
// app/(public)/[slug]/_components/klimamaal-hero.tsx
'use client';

import { useState } from 'react';
import { JaarToggle } from './jaar-toggle';
import type { Co2eDataPoint } from '@/db/queries/public-dashboard';

type Props = {
  kommuneNavn: string;
  maalAar: number | null;
  co2eSerie: Co2eDataPoint[];
};

export function KlimamaalHero({ kommuneNavn, maalAar, co2eSerie }: Props) {
  const tilgaengeligeAar = co2eSerie
    .map((d) => d.aar)
    .filter((a): a is number => a !== null);

  const [valgteAar, setValgteAar] = useState<number>(
    tilgaengeligeAar[tilgaengeligeAar.length - 1] ?? new Date().getFullYear(),
  );

  const valgteData = co2eSerie.find((d) => d.aar === valgteAar);
  const forrigeAar = tilgaengeligeAar[tilgaengeligeAar.indexOf(valgteAar) - 1];
  const forrigeData = forrigeAar ? co2eSerie.find((d) => d.aar === forrigeAar) : null;

  const aendring = valgteData && forrigeData
    ? valgteData.vaerdi - forrigeData.vaerdi
    : null;
  const aendringPct = aendring && forrigeData
    ? (aendring / forrigeData.vaerdi) * 100
    : null;

  const paaSporet = aendring !== null && aendring < 0;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: 16,
        marginBottom: 24,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 6 }}>
            Klimastatus {valgteAar}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>
            {kommuneNavn} Kommune
          </h1>
          {maalAar && (
            <div style={{ marginTop: 8, fontSize: 15, color: '#6B6B63' }}>
              Klimamål: netto-nul eller tilsvarende reduktion senest <strong style={{ color: '#1A1A18' }}>{maalAar}</strong>
            </div>
          )}
        </div>
        <JaarToggle
          tilgaengeligeAar={tilgaengeligeAar}
          valgteAar={valgteAar}
          onAarValgt={setValgteAar}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 0,
        borderTop: '2px solid #1A1A18',
      }}>
        <div style={{ padding: '20px 24px 20px 0', borderRight: '1px solid #D9D2C2', borderBottom: '1px solid #D9D2C2' }}>
          <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8, lineHeight: 1.3 }}>
            CO₂e {valgteAar ? `(${valgteAar})` : ''}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
            {valgteData ? (
              <>{valgteData.vaerdi.toFixed(1)} <span style={{ fontSize: 16, fontWeight: 500, color: '#6B6B63' }}>t/capita</span></>
            ) : (
              <span style={{ fontSize: 20, color: '#9A9A8E' }}>Ingen data</span>
            )}
          </div>
        </div>

        {aendring !== null && aendringPct !== null && (
          <div style={{ padding: '20px 24px', borderRight: '1px solid #D9D2C2', borderBottom: '1px solid #D9D2C2' }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8, lineHeight: 1.3 }}>
              Ændring fra {forrigeAar}
            </div>
            <div style={{
              fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em',
              color: paaSporet ? '#1E6B3A' : '#8B2E2E',
            }}>
              {aendring > 0 ? '+' : ''}{aendring.toFixed(1)}
              <span style={{ fontSize: 15, fontWeight: 500, marginLeft: 6 }}>
                ({aendringPct > 0 ? '+' : ''}{aendringPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {maalAar && (
          <div style={{ padding: '20px 0 20px 24px', borderBottom: '1px solid #D9D2C2' }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8, lineHeight: 1.3 }}>
              År til mål
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: '#1E6B3A' }}>
              {maalAar - (valgteAar ?? new Date().getFullYear())}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(public)/[slug]/_components/klimamaal-hero.tsx"
git commit -m "feat: KlimamaalHero — CO₂e-trend, år-toggle, mål-år"
```

---

## Task 8: NøgletaalGrid — koordinator-valgte highlights

**Files:**
- Create: `app/(public)/[slug]/_components/noegletal-grid.tsx`

Server component. Modtager `PublicHighlight[]`.

- [ ] **Step 1: Opret komponenten**

```typescript
// app/(public)/[slug]/_components/noegletal-grid.tsx
import type { PublicHighlight } from '@/db/queries/public-dashboard';

type Props = { highlights: PublicHighlight[] };

export function NoegleTalGrid({ highlights }: Props) {
  if (highlights.length === 0) return null;
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16,
      }}>
        Nøgletal
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(highlights.length, 5)}, 1fr)`,
        gap: 0,
        borderTop: '1px solid #1A1A18',
      }}>
        {highlights.map((h, i) => (
          <div
            key={h.kommuneIndikatorId}
            style={{
              padding: '16px 20px 16px 0',
              borderRight: i < highlights.length - 1 ? '1px solid #D9D2C2' : undefined,
              borderBottom: '1px solid #D9D2C2',
              paddingLeft: i > 0 ? 20 : 0,
            }}
          >
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 6, lineHeight: 1.3 }}>
              {h.label}
            </div>
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

- [ ] **Step 2: Commit**

```bash
git add "app/(public)/[slug]/_components/noegletal-grid.tsx"
git commit -m "feat: NoegleTalGrid — koordinator-valgte highlight-indikatorer"
```

---

## Task 9: TiltagOverblik — status-fordeling + opmærksomhedsflag

**Files:**
- Create: `app/(public)/[slug]/_components/tiltag-overblik.tsx`

Server component. Modtager `TiltagStatusOversigt` og `StagnertTiltag[]`.

- [ ] **Step 1: Opret komponenten**

```typescript
// app/(public)/[slug]/_components/tiltag-overblik.tsx
import type { TiltagStatusOversigt, StagnertTiltag } from '@/db/queries/public-dashboard';

const LABELS: Record<string, string> = {
  planned:    'Planlagte',
  in_progress: 'Igangsat',
  completed:  'Gennemførte',
  stagneret:  'Kræver opmærksomhed',
};

const COLORS: Record<string, string> = {
  planned:    '#D9D2C2',
  in_progress: '#1E6B3A',
  completed:  '#2A8048',
  stagneret:  '#8B2E2E',
};

type Props = {
  oversigt: TiltagStatusOversigt;
  stagnerede: StagnertTiltag[];
};

export function TiltagOverblik({ oversigt, stagnerede }: Props) {
  const total = oversigt.planned + oversigt.in_progress + oversigt.completed + oversigt.stagneret;
  if (total === 0) return null;

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16,
      }}>
        Klimatiltag — {total} i alt
      </div>

      {/* Status-søjler */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        borderTop: '1px solid #1A1A18',
        marginBottom: 24,
      }}>
        {(['planned', 'in_progress', 'completed', 'stagneret'] as const).map((key, i) => (
          <div
            key={key}
            style={{
              padding: '16px 20px 16px 0',
              borderRight: i < 3 ? '1px solid #D9D2C2' : undefined,
              borderBottom: '1px solid #D9D2C2',
              paddingLeft: i > 0 ? 20 : 0,
            }}
          >
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 6 }}>{LABELS[key]}</div>
            <div style={{
              fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em',
              color: oversigt[key] > 0 ? COLORS[key] : '#D9D2C2',
            }}>
              {oversigt[key]}
            </div>
          </div>
        ))}
      </div>

      {/* Stagnerede tiltag-liste */}
      {stagnerede.length > 0 && (
        <div style={{
          background: '#FDF5F5', border: '1px solid #F2E0DC',
          borderRadius: 6, padding: '16px 20px',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: '#8B2E2E',
            marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {stagnerede.length} tiltag kræver opmærksomhed
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {stagnerede.map((t) => (
              <li key={t.id} style={{ fontSize: 14, color: '#3D3D38', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B2E2E', flexShrink: 0 }} />
                {t.titel}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(public)/[slug]/_components/tiltag-overblik.tsx"
git commit -m "feat: TiltagOverblik — status-fordeling og stagnerede tiltag"
```

---

## Task 10: IndsatsomraaderSektion + CctfFold

**Files:**
- Create: `app/(public)/[slug]/_components/indsatsomraader-sektion.tsx`
- Create: `app/(public)/[slug]/_components/cctf-fold.tsx`

- [ ] **Step 1: Opret IndsatsomraaderSektion**

```typescript
// app/(public)/[slug]/_components/indsatsomraader-sektion.tsx
import type { IndsatsomraadeMedCount } from '@/db/queries/public-dashboard';

const SEKTOR_LABELS: Record<string, string> = {
  energy: 'Energi', transport: 'Transport', buildings: 'Bygninger',
  food: 'Fødevarer', agriculture: 'Landbrug', waste: 'Affald',
  adaptation: 'Klimatilpasning', other: 'Andet',
};

type Props = { indsatser: IndsatsomraadeMedCount[] };

export function IndsatsomraaderSektion({ indsatser }: Props) {
  if (indsatser.length === 0) return null;
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16,
      }}>
        Indsatsområder — {indsatser.length} sektorer
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {indsatser.map((io) => (
          <div
            key={io.id}
            style={{
              background: '#FFFFFF', border: '1px solid #D9D2C2',
              borderRadius: 6, padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#1E6B3A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              {SEKTOR_LABELS[io.sektor] ?? io.sektor}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18', lineHeight: 1.3, marginBottom: 8 }}>
              {io.navn}
            </div>
            <div style={{ fontSize: 13, color: '#6B6B63' }}>
              {io.aktiveTiltagCount} {io.aktiveTiltagCount === 1 ? 'tiltag' : 'tiltag'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Opret CctfFold (foldbar, client component)**

```typescript
// app/(public)/[slug]/_components/cctf-fold.tsx
'use client';

import { useState } from 'react';
import type { CctfKriterieResult } from '@/lib/cctf/coverage-engine';

const STATUS_COLORS = {
  komplet:  { bg: '#DDE9DE', color: '#2D5A3D', label: 'Komplet' },
  delvis:   { bg: '#F5EEDD', color: '#7A4E2A', label: 'Delvis'  },
  manglende:{ bg: '#F2E0DC', color: '#8B2E2E', label: 'Manglende' },
};

type Props = { daekning: CctfKriterieResult[] };

export function CctfFold({ daekning }: Props) {
  const [open, setOpen] = useState(false);
  const komplet  = daekning.filter((d) => d.status === 'komplet').length;
  const delvis   = daekning.filter((d) => d.status === 'delvis').length;
  const manglende = daekning.filter((d) => d.status === 'manglende').length;

  return (
    <section style={{ marginBottom: 40 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid #1A1A18', paddingTop: 16,
        }}
      >
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#1E6B3A',
        }}>
          CCTF-dækning (kriterie 16) — {komplet}/16 komplet, {delvis} delvis, {manglende} manglende
        </span>
        <span style={{ fontSize: 18, color: '#6B6B63', lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 8,
        }}>
          {daekning.map((d) => {
            const s = STATUS_COLORS[d.status];
            return (
              <div
                key={d.kriterieNr}
                style={{
                  background: s.bg, borderRadius: 4,
                  padding: '8px 12px', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18' }}>
                  Kriterie {d.kriterieNr}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: s.color,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(public)/[slug]/_components/indsatsomraader-sektion.tsx" \
        "app/(public)/[slug]/_components/cctf-fold.tsx"
git commit -m "feat: IndsatsomraaderSektion + CctfFold komponenter"
```

---

## Task 11: Page assembly — `app/(public)/[slug]/page.tsx`

**Files:**
- Create: `app/(public)/[slug]/page.tsx`

Server Component. Henter al data parallelt. Returnerer 404 hvis sluget ikke findes eller `publicEnabled = false`.

- [ ] **Step 1: Opret siden**

```typescript
// app/(public)/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getKommuneBySubdomain } from '@/db/queries/kommune';
import {
  getCo2eSeries,
  getPublicHighlights,
  getStagnerteTiltag,
  getTiltagStatusOversigt,
  getIndsatsomraaderMedTiltagCount,
} from '@/db/queries/public-dashboard';
import { getCctfDaekning } from '@/db/queries/cctf';
import { KlimamaalHero } from './_components/klimamaal-hero';
import { NoegleTalGrid } from './_components/noegletal-grid';
import { TiltagOverblik } from './_components/tiltag-overblik';
import { IndsatsomraaderSektion } from './_components/indsatsomraader-sektion';
import { CctfFold } from './_components/cctf-fold';

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

  const staleDays = kommune.publicStaleDays ?? 90;
  const highlightIds = kommune.publicHighlights ?? [];
  const maalAar = kommune.klimakommitmentDato
    ? new Date(kommune.klimakommitmentDato).getFullYear()
    : null;

  const [co2eSerie, highlights, stagnerede, tiltagStatus, indsatser, cctfDaekning] =
    await Promise.all([
      getCo2eSeries(kommune.id),
      getPublicHighlights(kommune.id, highlightIds),
      getStagnerteTiltag(kommune.id, staleDays),
      getTiltagStatusOversigt(kommune.id, staleDays),
      getIndsatsomraaderMedTiltagCount(kommune.id),
      getCctfDaekning(kommune.id),
    ]);

  return (
    <>
      <KlimamaalHero
        kommuneNavn={kommune.navn}
        maalAar={maalAar}
        co2eSerie={co2eSerie}
      />
      <NoegleTalGrid highlights={highlights} />
      <TiltagOverblik oversigt={tiltagStatus} stagnerede={stagnerede} />
      <IndsatsomraaderSektion indsatser={indsatser} />
      <CctfFold daekning={cctfDaekning} />
    </>
  );
}
```

- [ ] **Step 2: Verificér TypeScript-kompilering**

```bash
npx tsc --noEmit
```

Forventet: ingen fejl.

- [ ] **Step 3: Start dev-server og besøg siden**

```bash
npm run dev
```

Åbn `http://localhost:3000/thisted` (slug for en eksisterende testkommune — hent den med `SELECT subdomain FROM kommune LIMIT 1;`). Med `publicEnabled = false` (default) skal siden returnere 404. Aktiver manuelt i DB:

```sql
UPDATE kommune SET public_enabled = true WHERE subdomain = 'thisted';
```

Besøg siden igen — den skal vise data.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/[slug]/page.tsx"
git commit -m "feat: PublicDashboardPage — samler alle public dashboard komponenter"
```

---

## Task 12: Koordinator-konfiguration i `/indstillinger`

**Files:**
- Create: `app/(app)/indstillinger/public-config-actions.ts`
- Modify: `app/(app)/indstillinger/page.tsx`

- [ ] **Step 1: Opret server action**

```typescript
// app/(app)/indstillinger/public-config-actions.ts
'use server';

import { verifySession } from '@/lib/dal';
import { db } from '@/db';
import { kommune } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const Schema = z.object({
  publicEnabled: z.boolean(),
  publicStaleDays: z.number().int().min(7).max(365),
  publicHighlights: z.array(z.string().uuid()).max(5),
});

export async function updatePublicConfig(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await verifySession();
  if (!session?.kommuneId) return { ok: false, error: 'Ikke autoriseret' };

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' };

  await db
    .update(kommune)
    .set({
      publicEnabled: parsed.data.publicEnabled,
      publicStaleDays: parsed.data.publicStaleDays,
      publicHighlights: parsed.data.publicHighlights,
      updatedAt: new Date(),
    })
    .where(eq(kommune.id, session.kommuneId));

  return { ok: true };
}
```

- [ ] **Step 2: Opret client-komponent til config-form**

Opret `app/(app)/indstillinger/_public-config-form.tsx`:

```typescript
// app/(app)/indstillinger/_public-config-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { updatePublicConfig } from './public-config-actions';
import type { ActiveKommuneIndikatorOption } from '@/db/queries/public-dashboard';

type Props = {
  subdomain: string;
  initialEnabled: boolean;
  initialStaleDays: number;
  initialHighlights: string[];
  indikatorer: ActiveKommuneIndikatorOption[];
};

export function PublicConfigForm({
  subdomain,
  initialEnabled,
  initialStaleDays,
  initialHighlights,
  indikatorer,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [staleDays, setStaleDays] = useState(initialStaleDays);
  const [highlights, setHighlights] = useState<string[]>(initialHighlights);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();

  function toggleHighlight(id: string) {
    setHighlights((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : prev.length < 5 ? [...prev, id] : prev,
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePublicConfig({ publicEnabled: enabled, publicStaleDays: staleDays, publicHighlights: highlights });
      setStatus(result.ok ? 'saved' : 'error');
      if (result.ok) setTimeout(() => setStatus('idle'), 2000);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Aktiv toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Offentlig side aktiv</div>
          <div style={{ fontSize: 13, color: '#6B6B63' }}>
            Tilgængelig på{' '}
            <a
              href={`/${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1E6B3A' }}
            >
              klimastatus.dk/{subdomain}
            </a>
          </div>
        </div>
      </label>

      {/* Stagnationsgrænse */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Stagnationsgrænse (dage uden rapport)
        </label>
        <input
          type="number"
          min={7}
          max={365}
          value={staleDays}
          onChange={(e) => setStaleDays(Number(e.target.value))}
          style={{
            width: 100, padding: '6px 10px', fontSize: 14,
            border: '1px solid #D9D2C2', borderRadius: 4,
          }}
        />
        <div style={{ fontSize: 12, color: '#9A9A8E', marginTop: 4 }}>
          Tiltag uden tovholder-rapport i dette antal dage markeres som &quot;kræver opmærksomhed&quot;.
        </div>
      </div>

      {/* Fremhævede nøgletal */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          Fremhævede nøgletal (max 5)
        </div>
        <div style={{ fontSize: 12, color: '#9A9A8E', marginBottom: 8 }}>
          {highlights.length}/5 valgt
        </div>
        {indikatorer.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9A9A8E' }}>Ingen aktive indikatorer endnu.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {indikatorer.map((ki) => (
              <label key={ki.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={highlights.includes(ki.id)}
                  onChange={() => toggleHighlight(ki.id)}
                  disabled={!highlights.includes(ki.id) && highlights.length >= 5}
                />
                {ki.label}
                <span style={{ fontSize: 12, color: '#9A9A8E' }}>({ki.enhed})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={isPending}
          style={{
            padding: '8px 18px', fontSize: 14, fontWeight: 600,
            background: '#1E6B3A', color: '#FFFFFF',
            border: 'none', borderRadius: 4, cursor: isPending ? 'wait' : 'pointer',
          }}
        >
          {isPending ? 'Gemmer…' : 'Gem indstillinger'}
        </button>
        {status === 'saved' && <span style={{ fontSize: 13, color: '#1E6B3A' }}>Gemt ✓</span>}
        {status === 'error' && <span style={{ fontSize: 13, color: '#8B2E2E' }}>Fejl — prøv igen</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Opdater `/indstillinger/page.tsx` til at vise public config-kortet**

Erstat hele filen:

```typescript
// app/(app)/indstillinger/page.tsx
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { getAktiveKommuneIndikatorer } from '@/db/queries/public-dashboard';
import { redirect } from 'next/navigation';
import { PublicConfigForm } from './_public-config-form';

export const metadata = { title: 'Indstillinger — Klimastatus.dk' };

export default async function IndstillingerPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const kommune = await getKommuneById(session.kommuneId);
  if (!kommune) redirect('/login');

  const indikatorer = await getAktiveKommuneIndikatorer(session.kommuneId);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Indstillinger</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Kommuneoplysninger</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Navn</dt>
            <dd className="mt-1 text-gray-900">{kommune.navn}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Kommunekode</dt>
            <dd className="mt-1 text-gray-900">{kommune.kommunekode}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Subdomæne</dt>
            <dd className="mt-1 text-gray-900">{kommune.subdomain}.klimastatus.dk</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Befolkningstal</dt>
            <dd className="mt-1 text-gray-900">{kommune.befolkningstal?.toLocaleString('da-DK') ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Offentlig klimaside</h2>
        <p className="mb-6 text-sm text-gray-500">
          Konfigurér den borgervendte side på{' '}
          <span className="font-mono text-gray-700">klimastatus.dk/{kommune.subdomain}</span>.
        </p>
        <PublicConfigForm
          subdomain={kommune.subdomain}
          initialEnabled={kommune.publicEnabled}
          initialStaleDays={kommune.publicStaleDays ?? 90}
          initialHighlights={kommune.publicHighlights ?? []}
          indikatorer={indikatorer}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verificér TypeScript**

```bash
npx tsc --noEmit
```

Forventet: ingen fejl.

- [ ] **Step 5: Kør alle tests**

```bash
npx vitest run
```

Forventet: alle tests passer.

- [ ] **Step 6: Commit**

```bash
git add app/'(app)'/indstillinger/
git commit -m "feat: indstillinger — public dashboard konfiguration (aktiv, stagnation, nøgletal)"
```

---

## Spec-dækning-check

| Spec-krav | Dækket af |
|---|---|
| Live side på `klimastatus.dk/[slug]` | Task 11 (`force-dynamic`) |
| Ingen auth | Task 5 (public layout uden auth), Task 4 (middleware) |
| Klimamål-hero med CO₂e-trend og mål-år | Task 7 |
| Koordinator-valgte nøgletal (3–5 slots) | Task 8 + Task 12 |
| Tiltag-fordeling med stagnationsflag | Task 9 |
| Stagnationsgrænse konfigurerbar | Task 12 (server action) |
| Indsatsområder med tiltag-count | Task 10 |
| CCTF-dækning foldbar | Task 10 |
| Årstals-toggle client-side | Task 6 + integreret i Task 7 |
| `publicEnabled`-toggle (siden er 404 indtil aktiv) | Task 1 (schema) + Task 11 (notFound) + Task 12 |
| Preview-link til siden fra indstillinger | Task 12 (link i form) |
| DB-migration — 3 nye felter | Task 1 |
| Middleware åbner `/[slug]` som offentlig rute | Task 4 |
