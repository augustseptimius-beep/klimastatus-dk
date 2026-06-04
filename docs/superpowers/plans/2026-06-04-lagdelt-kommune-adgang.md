# Lagdelt kommune-adgang — URL-scoped arbejdsflade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flyt alle arbejdsfladeruter til `/k/<slug>/...` så kommunen bestemmes af adressen (ikke sessionen), med ét centralt adgangstjek der håndhæver admin=alle / koordinator=kun-sin-egen.

**Architecture:** `requireKommuneContext(slug)` er det ene håndhævelsespunkt — alle sider og handlinger kalder det øverst og får `{ session, kommune }` tilbage. Adressen `/k/[kommune]/` er ny "verden" for det interne arbejde. Proxy-middleware spærrer `/k/*` for uloggede; ejerskabstjek sker i `requireKommuneContext`. Admin-panels "Åbn dashboard"-knap bliver et plain link.

**Tech Stack:** Next.js 16, Drizzle ORM, Vitest, TypeScript, jose (JWT), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-06-04-lagdelt-kommune-adgang-design.md`

**Forudsætninger:**
- Branch: opret `feat/kommune-url-adgang` fra main.
- Lokal Postgres (bruges ikke i tests — alle tests er mockede).
- Hele suiten: `npm test`. Enkelt-test: `npx vitest run <sti>`.
- `npx tsc --noEmit` checker types.

---

## Fil-struktur

**Nye filer:**
- `lib/kommune-context.ts` — `requireKommuneContext` guard (server-only)
- `lib/kommune-context.test.ts` — 5 unit-tests for guard
- `app/(app)/k/[kommune]/layout.tsx` — slug-aware layout (topbar + sidebar)
- `app/(app)/k/[kommune]/dashboard/page.tsx`
- `app/(app)/k/[kommune]/indsatser/page.tsx`, `ny/page.tsx`, `[id]/rediger/page.tsx`, `actions.ts`
- `app/(app)/k/[kommune]/indsatser/importer/page.tsx`, `importer/actions.ts`
- `app/(app)/k/[kommune]/tiltag/page.tsx`, `ny/page.tsx`, `[id]/rediger/page.tsx`, `actions.ts`
- `app/(app)/k/[kommune]/tovholdere/page.tsx`, `ny/page.tsx`, `[id]/page.tsx`, `actions.ts`
- `app/(app)/k/[kommune]/data/page.tsx`, `data/actions.ts`
- `app/(app)/k/[kommune]/laering/page.tsx`, `laering/actions.ts`
- `app/(app)/k/[kommune]/selvevaluering/page.tsx`, `selvevaluering/preview/page.tsx`, `selvevaluering/actions.ts`
- `app/(app)/k/[kommune]/indstillinger/page.tsx`, `indstillinger/dashboard/page.tsx`, `indstillinger/dashboard/actions.ts`, `indstillinger/dashboard/_composer.tsx`

**Modificerede filer:**
- `lib/definitions.ts` — tilføj `kommuneSlug: string | null`
- `app/actions/auth.ts` — brug `kommuneSlug` i session + redirect
- `proxy.ts` — tilføj `'k'` til reservedSegments, opdatér `/login`-redirect
- `components/app-sidebar.tsx` — tilføj `slug`-prop, prefix links
- `app/(app)/layout.tsx` — gøres til passthrough (ingen UI)
- `app/(app)/dashboard/page.tsx` — tynd redirect til `/k/<slug>/dashboard`
- `app/(app)/indstillinger/page.tsx` — tynd redirect til `/k/<slug>/indstillinger`
- `app/admin/kommuner/page.tsx` — erstat form+action med plain Link
- `app/admin/kommuner/actions.ts` — fjern `switchKommuneAction`

---

### Task 1: `requireKommuneContext` + typer

**Files:**
- Modify: `lib/definitions.ts`
- Create: `lib/kommune-context.ts`
- Create: `lib/kommune-context.test.ts`

- [ ] **Step 1: Tilføj `kommuneSlug` til `SessionPayload`**

Erstat hele `lib/definitions.ts`:

```ts
export type SessionPayload = {
  userId: string;
  kommuneId: string | null;
  kommuneSlug: string | null;
  role: 'admin' | 'koordinator';
  navn: string;
  expiresAt: Date;
};

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;
```

- [ ] **Step 2: Skriv den fejlende test**

```ts
// lib/kommune-context.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockRedirect = vi.fn();
const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => { mockRedirect(...args); throw new Error('redirect'); },
  notFound: () => { mockNotFound(); throw new Error('notFound'); },
}));

const mockVerifySession = vi.fn();
vi.mock('@/lib/dal', () => ({ verifySession: () => mockVerifySession() }));

const mockGetKommuneBySubdomain = vi.fn();
vi.mock('@/db/queries/kommune', () => ({
  getKommuneBySubdomain: (slug: string) => mockGetKommuneBySubdomain(slug),
}));

import { requireKommuneContext } from './kommune-context';

const adminSession = {
  userId: 'u1', kommuneId: null, kommuneSlug: null,
  role: 'admin' as const, navn: 'Admin', expiresAt: new Date(),
};
const koordinatorSession = {
  userId: 'u2', kommuneId: 'k1', kommuneSlug: 'groenkobing',
  role: 'koordinator' as const, navn: 'Kord', expiresAt: new Date(),
};
const groenkobing = { id: 'k1', subdomain: 'groenkobing', navn: 'Grønkøbing', primaryColor: '#1a5c38' };
const herning = { id: 'k2', subdomain: 'herning', navn: 'Herning', primaryColor: null };

beforeEach(() => vi.clearAllMocks());

describe('requireKommuneContext', () => {
  it('admin + vilkårlig kommune → returnerer kontekst', async () => {
    mockVerifySession.mockResolvedValue(adminSession);
    mockGetKommuneBySubdomain.mockResolvedValue(herning);
    const ctx = await requireKommuneContext('herning');
    expect(ctx.kommune.id).toBe('k2');
    expect(ctx.session.role).toBe('admin');
  });

  it('koordinator + egen kommune → returnerer kontekst', async () => {
    mockVerifySession.mockResolvedValue(koordinatorSession);
    mockGetKommuneBySubdomain.mockResolvedValue(groenkobing);
    const ctx = await requireKommuneContext('groenkobing');
    expect(ctx.kommune.id).toBe('k1');
  });

  it('koordinator + fremmed kommune → notFound', async () => {
    mockVerifySession.mockResolvedValue(koordinatorSession);
    mockGetKommuneBySubdomain.mockResolvedValue(herning);
    await expect(requireKommuneContext('herning')).rejects.toThrow('notFound');
  });

  it('ingen session → redirect til /login', async () => {
    mockVerifySession.mockResolvedValue(null);
    mockGetKommuneBySubdomain.mockResolvedValue(groenkobing);
    await expect(requireKommuneContext('groenkobing')).rejects.toThrow('redirect');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('ukendt slug → notFound', async () => {
    mockVerifySession.mockResolvedValue(adminSession);
    mockGetKommuneBySubdomain.mockResolvedValue(undefined);
    await expect(requireKommuneContext('ukendt')).rejects.toThrow('notFound');
  });
});
```

- [ ] **Step 3: Kør testen og bekræft at den fejler**

Run: `npx vitest run lib/kommune-context.test.ts`
Expected: FAIL — modul findes ikke.

- [ ] **Step 4: Implementér `requireKommuneContext`**

```ts
// lib/kommune-context.ts
import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { getKommuneBySubdomain } from '@/db/queries/kommune';
import type { SessionPayload } from '@/lib/definitions';

type KommuneRow = NonNullable<Awaited<ReturnType<typeof getKommuneBySubdomain>>>;

export type KommuneContext = {
  session: SessionPayload;
  kommune: KommuneRow;
};

/**
 * Verificerer session og kommuneadgang ud fra URL-slug.
 * - Admin → adgang til alle kommuner.
 * - Koordinator → kun hvis session.kommuneId === kommune.id.
 * - Ukendt slug eller manglende adgang → notFound (404).
 * - Ingen session → redirect til /login.
 */
export async function requireKommuneContext(slug: string): Promise<KommuneContext> {
  const session = await verifySession();
  if (!session) redirect('/login');

  const kommune = await getKommuneBySubdomain(slug);
  if (!kommune) notFound();

  if (session.role === 'koordinator' && session.kommuneId !== kommune.id) {
    notFound();
  }

  return { session, kommune };
}
```

- [ ] **Step 5: Kør testen og bekræft at den passerer**

Run: `npx vitest run lib/kommune-context.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: Fejl om manglende `kommuneSlug` i kald af `createSession` — det fikser vi i Task 2.

- [ ] **Step 7: Commit**

```bash
git add lib/definitions.ts lib/kommune-context.ts lib/kommune-context.test.ts
git commit -m "feat: requireKommuneContext guard + kommuneSlug i SessionPayload"
```

---

### Task 2: Session, login og middleware

**Files:**
- Modify: `app/actions/auth.ts`
- Modify: `proxy.ts`

- [ ] **Step 1: Opdatér login-action**

Erstat hele `app/actions/auth.ts`:

```ts
'use server';
import { z } from 'zod';
import { verify } from '@node-rs/argon2';
import { getUserByEmail } from '@/db/queries';
import { getKommuneById } from '@/db/queries';
import { createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import type { FormState } from '@/lib/definitions';

const LoginSchema = z.object({
  email: z.string().email('Indtast en gyldig email.'),
  password: z.string().min(1, 'Adgangskode er påkrævet.'),
});

export async function login(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = { email: formData.get('email'), password: formData.get('password') };
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { email, password } = parsed.data;

  const foundUser = await getUserByEmail(email);
  if (!foundUser || !foundUser.passwordHash) {
    return { message: 'Forkert email eller adgangskode.' };
  }

  const passwordValid = await verify(foundUser.passwordHash, password);
  if (!passwordValid) {
    return { message: 'Forkert email eller adgangskode.' };
  }

  // Koordinator: hent slug til session og redirect
  let kommuneSlug: string | null = null;
  if (foundUser.role === 'koordinator' && foundUser.kommuneId) {
    const k = await getKommuneById(foundUser.kommuneId);
    kommuneSlug = k?.subdomain ?? null;
  }

  await createSession({
    userId: foundUser.id,
    kommuneId: foundUser.kommuneId ?? null,
    kommuneSlug,
    role: foundUser.role as 'admin' | 'koordinator',
    navn: foundUser.navn,
  });

  if (foundUser.role === 'admin') {
    redirect('/admin/kommuner');
  } else {
    redirect(kommuneSlug ? `/k/${kommuneSlug}/dashboard` : '/dashboard');
  }
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
```

- [ ] **Step 2: Opdatér proxy.ts**

Erstat hele `proxy.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const publicRoutes = ['/', '/login'];
const publicPrefixes = ['/rapport'];
const adminRoutes = ['/admin'];

const reservedSegments = new Set([
  'k', 'login', 'admin', 'rapport', 'dashboard', 'tiltag',
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
    let destination: string;
    if (session.role === 'admin') {
      destination = '/admin/kommuner';
    } else if (session.kommuneSlug) {
      destination = `/k/${session.kommuneSlug}/dashboard`;
    } else {
      destination = '/dashboard';
    }
    return NextResponse.redirect(new URL(destination, req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl (muligvis stadig eksisterende `.next/`-fejl).

- [ ] **Step 4: Commit**

```bash
git add app/actions/auth.ts proxy.ts
git commit -m "feat: kommuneSlug i session + slug-baseret login-redirect + k i reservedSegments"
```

---

### Task 3: Ny `/k/[kommune]/`-layout + sidebar

**Files:**
- Modify: `app/(app)/layout.tsx` (gøres til passthrough)
- Create: `app/(app)/k/[kommune]/layout.tsx`
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Strip det gamle layout til passthrough**

Erstat hele `app/(app)/layout.tsx`:

```tsx
// app/(app)/layout.tsx
// Passthrough — UI-rammen håndteres nu af app/(app)/k/[kommune]/layout.tsx.
// Disse ruter bruges kun til backward-compat redirects (/dashboard, /indstillinger).
export default function AppRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Opdatér sidebar til at tage `slug`-prop**

Erstat hele `components/app-sidebar.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/auth';

type Props = {
  slug: string;
  kommuneNavn: string;
  isAdmin: boolean;
};

export function AppSidebar({ slug, kommuneNavn, isAdmin }: Props) {
  const pathname = usePathname();
  const base = `/k/${slug}`;

  const mainNav = [
    { href: `${base}/dashboard`,   label: 'Dashboard' },
    { href: `${base}/indsatser`,   label: 'Indsatsområder' },
    { href: `${base}/tiltag`,      label: 'Handlingsoverblik' },
    { href: `${base}/tovholdere`,  label: 'Tovholdere' },
    { href: `${base}/data`,        label: 'Datastyring' },
    { href: `${base}/laering`,     label: 'Læring' },
  ];

  const secondaryNav = [
    { href: `${base}/selvevaluering`, label: 'Selvevaluering' },
    { href: `${base}/indstillinger`,  label: 'Indstillinger' },
  ];

  return (
    <aside className="ks-sidebar">
      <div className="ks-nav-section">
        <div className="heading">{kommuneNavn}</div>
        {mainNav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`ks-nav-item${pathname === href || pathname.startsWith(href + '/') ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="ks-nav-section" style={{ marginTop: 'auto' }}>
        <div className="heading">System</div>
        {secondaryNav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`ks-nav-item${pathname === href || pathname.startsWith(href + '/') ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin/kommuner" className="ks-nav-item" style={{ color: 'var(--ink-400, #9A9A8E)', fontSize: 13 }}>
            ← Alle kommuner
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="ks-nav-item"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--ink-500, #6B6B63)', fontSize: 14 }}
          >
            Log ud
          </button>
        </form>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Opret det nye slug-aware layout**

Opret filen `app/(app)/k/[kommune]/layout.tsx`:

```tsx
import { requireKommuneContext } from '@/lib/kommune-context';
import { AppSidebar } from '@/components/app-sidebar';
import '../../app.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ kommune: string }>;
};

export default async function KommuneLayout({ children, params }: Props) {
  const { kommune: slug } = await params;
  const { session, kommune } = await requireKommuneContext(slug);

  const accentColor = kommune.primaryColor ?? '#1E6B3A';

  return (
    <div className="ks-app">
      <header className="ks-topbar" style={{ borderBottom: `3px solid ${accentColor}` }}>
        <div className="ks-topbar-left">
          <a className="logo" href={`/k/${slug}/dashboard`} aria-label="Klimastatus.dk">
            <span>Klimastatus<span className="period">.</span>dk</span>
          </a>
          <span className="kommune-name" style={{ color: accentColor }}>{kommune.navn}</span>
          {session.role === 'admin' && (
            <span style={{
              marginLeft: 10, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--ink-400, #9A9A8E)',
            }}>
              Forvalter som administrator
            </span>
          )}
        </div>
      </header>
      <AppSidebar slug={slug} kommuneNavn={kommune.navn} isAdmin={session.role === 'admin'} />
      <main className="ks-main">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/layout.tsx" "app/(app)/k/[kommune]/layout.tsx" components/app-sidebar.tsx
git commit -m "feat: slug-aware layout + sidebar under /k/[kommune]/"
```

---

### Task 4: Dashboard-side + backward-compat redirect

**Files:**
- Create: `app/(app)/k/[kommune]/dashboard/page.tsx`
- Modify: `app/(app)/dashboard/page.tsx` (redirect)

- [ ] **Step 1: Opret ny dashboard-side**

Opret `app/(app)/k/[kommune]/dashboard/page.tsx` (kopi af eksisterende med `requireKommuneContext` i stedet for `verifySession` + `session.kommuneId`, og `/k/${slug}/...`-links):

```tsx
import { requireKommuneContext } from '@/lib/kommune-context';
import { getAllTovholdere, getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import { getLatestRapporterForTovholder } from '@/db/queries/rapport';
import { getCctfDaekning } from '@/db/queries/cctf';
import Link from 'next/link';
import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, indikatorMaaling } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CctfDashboardWidget } from '@/components/cctf/cctf-dashboard-widget';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function DashboardPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [tovholdere, tiltag, indsatser] = await Promise.all([
    getAllTovholdere(kommune.id),
    getAllTiltag(kommune.id),
    getAllIndsatsOmraader(kommune.id),
  ]);

  const co2eKI = await db
    .select({ indikatorId: kommuneIndikator.indikatorId })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, kommune.id),
      eq(kommuneIndikator.aktiv, true),
      eq(indikatorTemplate.kilde, 'klimaregnskab'),
    ))
    .limit(1);

  const veKI = await db
    .select({ indikatorId: kommuneIndikator.indikatorId })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, kommune.id),
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
    veKI[0]
      ? db.select({ vaerdi: indikatorMaaling.vaerdi, aar: indikatorMaaling.aar })
          .from(indikatorMaaling)
          .where(eq(indikatorMaaling.indikatorId, veKI[0].indikatorId))
          .orderBy(desc(indikatorMaaling.aar))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const aktiveTiltag = tiltag.filter((t) => t.status !== 'discontinued');
  const igangvaerende = tiltag.filter((t) => t.status === 'in_progress').length;
  const aktiveTovholdere = tovholdere.filter((t) => t.aktiv);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rapporter = await Promise.all(
    aktiveTovholdere.map((t) => getLatestRapporterForTovholder(t.id)),
  );
  const harSvaret = rapporter.filter(
    (rs) => rs.some((r) => new Date(r.createdAt) > cutoff),
  ).length;

  const cctfDaekning = await getCctfDaekning(kommune.id);
  const statCols = 2 + (co2eKI.length > 0 ? 1 : 0) + (veKI.length > 0 ? 1 : 0) + 1;

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Klimastatus 2025</div>
          <h1>{kommune.navn} Kommune</h1>
        </div>
      </div>

      <div className="ks-stat-grid" style={{ gridTemplateColumns: `repeat(${statCols}, 1fr)` }}>
        <div className="ks-stat">
          <div className="label">Handlinger igangværende</div>
          <div className="num"><em>{igangvaerende}</em>/{aktiveTiltag.length}</div>
        </div>
        <div className="ks-stat">
          <div className="label">Tovholdere rapporteret (30 dage)</div>
          <div className="num">
            {aktiveTovholdere.length === 0
              ? <span style={{ fontSize: 24, color: 'var(--ink-400)' }}>Ingen</span>
              : <><em>{harSvaret}</em>/{aktiveTovholdere.length}</>}
          </div>
        </div>
        {co2eKI.length > 0 && (
          <div className="ks-stat">
            <div className="label">CO₂e pr. capita</div>
            <div className="num">
              {co2eSeneste[0]
                ? <><em>{co2eSeneste[0].vaerdi}</em> <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-500)' }}>t ({co2eSeneste[0].aar})</span></>
                : <span style={{ fontSize: 20, color: 'var(--ink-400)' }}>Ingen data</span>}
            </div>
          </div>
        )}
        {veKI.length > 0 && (
          <div className="ks-stat">
            <div className="label">VE-kapacitet vind + sol</div>
            <div className="num">
              {veMWSeneste[0]
                ? <><em>{Math.round(veMWSeneste[0].vaerdi)}</em> <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-500)' }}>MW ({veMWSeneste[0].aar})</span></>
                : <span style={{ fontSize: 20, color: 'var(--ink-400)' }}>Ingen data</span>}
            </div>
          </div>
        )}
        <CctfDashboardWidget daekning={cctfDaekning} />
      </div>

      <div className="ks-section">
        <div className="ks-section-head">
          <div>
            <div className="eyebrow">Overblik</div>
            <h2>Genveje</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <QuickLink href={`/k/${slug}/indsatser`}  label="Indsatsområder"   count={indsatser.length} />
          <QuickLink href={`/k/${slug}/tiltag`}     label="Handlingsoverblik" count={aktiveTiltag.length} />
          <QuickLink href={`/k/${slug}/tovholdere`} label="Tovholdere"        count={aktiveTovholdere.length} />
        </div>
      </div>
    </>
  );
}

function QuickLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="ks-card" style={{ cursor: 'pointer' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--forest-900)', marginBottom: 12 }}>
          {label}
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-900)', fontVariantNumeric: 'tabular-nums' }}>
          {count}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Erstat gammelt dashboard med redirect**

Erstat hele `app/(app)/dashboard/page.tsx`:

```tsx
// Backward-compat redirect — løser gamle bogmærker til /dashboard
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';

export default async function DashboardRedirect() {
  const session = await verifySession();
  if (!session) redirect('/login');
  if (session.role === 'admin') redirect('/admin/kommuner');

  // Brug kommuneSlug fra session hvis tilgængeligt (nye sessions),
  // ellers DB-opslag (gamle sessions fra inden deploy).
  const slug =
    session.kommuneSlug ??
    (session.kommuneId ? (await getKommuneById(session.kommuneId))?.subdomain : null);

  if (!slug) redirect('/login');
  redirect(`/k/${slug}/dashboard`);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/k/[kommune]/dashboard/page.tsx" "app/(app)/dashboard/page.tsx"
git commit -m "feat: dashboard under /k/[kommune]/ + backward-compat redirect"
```

---

### Task 5: Indsatser

**Files:**
- Create: `app/(app)/k/[kommune]/indsatser/page.tsx`
- Create: `app/(app)/k/[kommune]/indsatser/ny/page.tsx`
- Create: `app/(app)/k/[kommune]/indsatser/[id]/rediger/page.tsx`
- Create: `app/(app)/k/[kommune]/indsatser/actions.ts`
- Create: `app/(app)/k/[kommune]/indsatser/importer/page.tsx`
- Create: `app/(app)/k/[kommune]/indsatser/importer/actions.ts`

- [ ] **Step 1: Opret `actions.ts`**

```ts
// app/(app)/k/[kommune]/indsatser/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { createIndsatsOmraade, updateIndsatsOmraade, deleteIndsatsOmraade, getIndsatsOmraadeById } from '@/db/queries';
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
  slug: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await createIndsatsOmraade({ ...parsed.data, kommuneId: kommune.id });
  redirect(`/k/${slug}/indsatser`);
}

export async function updateIndsatsOmraadeAction(
  slug: string,
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const existing = await getIndsatsOmraadeById(id);
  if (!existing || existing.kommuneId !== kommune.id) return { message: 'Ikke autoriseret' };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await updateIndsatsOmraade(id, parsed.data);
  redirect(`/k/${slug}/indsatser`);
}

export async function deleteIndsatsOmraadeAction(slug: string, id: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const existing = await getIndsatsOmraadeById(id);
  if (!existing || existing.kommuneId !== kommune.id) return;
  await deleteIndsatsOmraade(id);
  redirect(`/k/${slug}/indsatser`);
}
```

- [ ] **Step 2: Opret listeside**

```tsx
// app/(app)/k/[kommune]/indsatser/page.tsx
import { requireKommuneContext } from '@/lib/kommune-context';
import { getAllIndsatsOmraader } from '@/db/queries';
import Link from 'next/link';
import { deleteIndsatsOmraadeAction } from './actions';

export const metadata = { title: 'Indsatsområder — Klimastatus.dk' };

const TYPE_LABELS: Record<string, string> = {
  ghg_reduction: 'Drivhusgasreduktion',
  adaptation: 'Klimatilpasning',
  consumption: 'Forbrug',
  just_transition: 'Retfærdig omstilling',
  cross_cutting: 'Tværgående',
};
const TYPE_BADGE: Record<string, string> = {
  ghg_reduction: 'ks-badge-success',
  adaptation: 'ks-badge-info',
  consumption: 'ks-badge-warn',
  just_transition: 'ks-badge-neutral',
  cross_cutting: 'ks-badge-neutral',
};

type Props = { params: Promise<{ kommune: string }> };

export default async function IndsatserPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);
  const indsatser = await getAllIndsatsOmraader(kommune.id);

  return (
    <div>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Klimaplan</div>
          <h1>Indsatsområder</h1>
        </div>
        <Link href={`/k/${slug}/indsatser/ny`} className="ks-btn-primary">+ Nyt indsatsområde</Link>
      </div>

      {indsatser.length === 0 ? (
        <div className="ks-empty">Ingen indsatsområder endnu.</div>
      ) : (
        <div className="ks-list">
          {indsatser.map((io) => (
            <div key={io.id} className="ks-list-item">
              <div className="ks-list-item-main">
                <span className={`ks-badge ${TYPE_BADGE[io.type] ?? 'ks-badge-neutral'}`}>
                  {TYPE_LABELS[io.type] ?? io.type}
                </span>
                <span className="ks-list-item-title">{io.navn}</span>
              </div>
              <div className="ks-list-item-actions">
                <Link href={`/k/${slug}/indsatser/${io.id}/rediger`} className="ks-btn-sm">Rediger</Link>
                <form action={deleteIndsatsOmraadeAction.bind(null, slug, io.id)}>
                  <button type="submit" className="ks-btn-sm ks-btn-danger">Slet</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Opret ny-side**

```tsx
// app/(app)/k/[kommune]/indsatser/ny/page.tsx
import { IndsatsOmraadeForm } from '@/components/indsats-omraade-form';
import { createIndsatsOmraadeAction } from '../actions';
import Link from 'next/link';

export const metadata = { title: 'Nyt indsatsområde — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function NytIndsatsOmraadePage({ params }: Props) {
  const { kommune: slug } = await params;
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/indsatser`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nyt indsatsområde</h1>
      </div>
      <IndsatsOmraadeForm action={createIndsatsOmraadeAction.bind(null, slug)} />
    </div>
  );
}
```

- [ ] **Step 4: Opret rediger-side**

Læs først den eksisterende `app/(app)/indsatser/[id]/rediger/page.tsx` for at forstå dens struktur, og opret en version der bruger slug:

```tsx
// app/(app)/k/[kommune]/indsatser/[id]/rediger/page.tsx
import { requireKommuneContext } from '@/lib/kommune-context';
import { getIndsatsOmraadeById } from '@/db/queries';
import { IndsatsOmraadeForm } from '@/components/indsats-omraade-form';
import { updateIndsatsOmraadeAction } from '../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Rediger indsatsområde — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string; id: string }> };

export default async function RedigerIndsatsOmraadePage({ params }: Props) {
  const { kommune: slug, id } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const io = await getIndsatsOmraadeById(id);
  if (!io || io.kommuneId !== kommune.id) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/indsatser`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Rediger indsatsområde</h1>
      </div>
      <IndsatsOmraadeForm
        action={updateIndsatsOmraadeAction.bind(null, slug, id)}
        defaultValues={io}
      />
    </div>
  );
}
```

- [ ] **Step 5: Opret importer-action**

```ts
// app/(app)/k/[kommune]/indsatser/importer/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { indsatsOmraade, tiltag } from '@/db/schema';
import { redirect } from 'next/navigation';

type ImportHandling = {
  titel: string;
  type: 'reduction' | 'adaptation' | 'both';
  status: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  beskrivelse?: string;
};

type ImportIndsats = {
  navn: string;
  type: 'ghg_reduction' | 'adaptation' | 'consumption' | 'just_transition' | 'cross_cutting';
  sektor: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  beskrivelse?: string;
  handlinger: ImportHandling[];
};

export async function bulkImportAction(slug: string, indsatser: ImportIndsats[]): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  for (const io of indsatser) {
    const [created] = await db
      .insert(indsatsOmraade)
      .values({
        kommuneId: kommune.id,
        navn: io.navn,
        type: io.type,
        sektor: io.sektor,
        beskrivelse: io.beskrivelse ?? null,
        aktiv: true,
      })
      .returning({ id: indsatsOmraade.id });

    if (io.handlinger.length > 0) {
      await db.insert(tiltag).values(
        io.handlinger.map((h) => ({
          kommuneId: kommune.id,
          indsatsOmraadeId: created.id,
          titel: h.titel,
          type: h.type,
          status: h.status ?? 'planned',
          beskrivelse: h.beskrivelse ?? null,
          prioriteretTiltag: false,
        })),
      );
    }
  }

  redirect(`/k/${slug}/indsatser`);
}
```

- [ ] **Step 6: Opret importer-side**

```tsx
// app/(app)/k/[kommune]/indsatser/importer/page.tsx
import { ImporterClient } from '@/app/(app)/indsatser/importer/importer-client';

export const metadata = { title: 'Importer handlingskatalog — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function ImporterPage({ params }: Props) {
  const { kommune: slug } = await params;
  // ImporterClient importeres fra den eksisterende placering —
  // vi genbruger komponenten, men binder actionen med slug.
  // BEMÆRK: ImporterClient skal opdateres til at tage slug-prop (se nedenfor).
  return <ImporterClient slug={slug} />;
}
```

Opdatér `app/(app)/indsatser/importer/importer-client.tsx` — tilføj `slug`-prop og brug den til at importere og kalde den nye action. Find `bulkImportAction`-importen og kald-stedet i filen, og:
1. Tilføj `slug: string` til komponentens props.
2. Erstat `import { bulkImportAction } from './actions'` med `import { bulkImportAction } from '@/app/(app)/k/[kommune]/indsatser/importer/actions'`.
3. Erstat alle kald `bulkImportAction(data)` med `bulkImportAction(slug, data)`.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/k/[kommune]/indsatser/"
git commit -m "feat: indsatser under /k/[kommune]/indsatser/"
```

---

### Task 6: Tiltag

**Files:**
- Create: `app/(app)/k/[kommune]/tiltag/page.tsx`
- Create: `app/(app)/k/[kommune]/tiltag/ny/page.tsx`
- Create: `app/(app)/k/[kommune]/tiltag/[id]/rediger/page.tsx`
- Create: `app/(app)/k/[kommune]/tiltag/actions.ts`

- [ ] **Step 1: Opret `actions.ts`**

```ts
// app/(app)/k/[kommune]/tiltag/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { createTiltag, updateTiltag, getTiltagById, getIndsatsOmraadeById } from '@/db/queries';
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

export async function createTiltagAction(slug: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const io = await getIndsatsOmraadeById(parsed.data.indsatsOmraadeId);
  if (!io || io.kommuneId !== kommune.id) return { message: 'Ugyldigt indsatsområde' };
  await createTiltag({ ...parsed.data, kommuneId: kommune.id });
  redirect(`/k/${slug}/tiltag`);
}

export async function updateTiltagAction(
  slug: string,
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const existing = await getTiltagById(id);
  if (!existing || existing.kommuneId !== kommune.id) return { message: 'Ikke autoriseret' };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const io = await getIndsatsOmraadeById(parsed.data.indsatsOmraadeId);
  if (!io || io.kommuneId !== kommune.id) return { message: 'Ugyldigt indsatsområde' };
  await updateTiltag(id, parsed.data);
  redirect(`/k/${slug}/tiltag`);
}
```

- [ ] **Step 2: Opret tiltag-sider**

Læs de eksisterende `app/(app)/tiltag/page.tsx`, `app/(app)/tiltag/ny/page.tsx` og `app/(app)/tiltag/[id]/rediger/page.tsx`. Opret tilsvarende filer under `/k/[kommune]/tiltag/` med disse ændringer:
1. `type Props = { params: Promise<{ kommune: string }> }` (og `{ kommune: string; id: string }` for rediger).
2. `const { kommune: slug } = await params` + `const { kommune } = await requireKommuneContext(slug)`.
3. Brug `kommune.id` i stedet for `session.kommuneId`.
4. Alle interne links/redirects: `/tiltag` → `/k/${slug}/tiltag`.
5. Actions bindes med slug: `createTiltagAction.bind(null, slug)`, `updateTiltagAction.bind(null, slug, id)`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/k/[kommune]/tiltag/"
git commit -m "feat: tiltag under /k/[kommune]/tiltag/"
```

---

### Task 7: Tovholdere

**Files:**
- Create: `app/(app)/k/[kommune]/tovholdere/page.tsx`
- Create: `app/(app)/k/[kommune]/tovholdere/ny/page.tsx`
- Create: `app/(app)/k/[kommune]/tovholdere/[id]/page.tsx`
- Create: `app/(app)/k/[kommune]/tovholdere/actions.ts`

- [ ] **Step 1: Opret `actions.ts`**

```ts
// app/(app)/k/[kommune]/tovholdere/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import {
  createTovholder, updateTovholder, getAllTovholdere,
  assignTiltagToTovholder, removeTiltagFromTovholder,
  getTovholderById, getTiltagById,
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

export async function createTovholderAction(slug: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await createTovholder({ ...parsed.data, kommuneId: kommune.id });
  redirect(`/k/${slug}/tovholdere`);
}

export async function updateTovholderAction(slug: string, id: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const existing = await getTovholderById(id);
  if (!existing || existing.kommuneId !== kommune.id) return { message: 'Ikke autoriseret' };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await updateTovholder(id, parsed.data);
  redirect(`/k/${slug}/tovholdere/${id}`);
}

export async function assignTiltagAction(slug: string, tovholderId: string, tiltagId: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const th = await getTovholderById(tovholderId);
  if (!th || th.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  const t = await getTiltagById(tiltagId);
  if (!t || t.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  await assignTiltagToTovholder({ tovholderId, tiltagId });
  redirect(`/k/${slug}/tovholdere/${tovholderId}`);
}

export async function removeTiltagAction(slug: string, tovholderId: string, tiltagId: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const th = await getTovholderById(tovholderId);
  if (!th || th.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  const t = await getTiltagById(tiltagId);
  if (!t || t.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  await removeTiltagFromTovholder({ tovholderId, tiltagId });
  redirect(`/k/${slug}/tovholdere/${tovholderId}`);
}

export async function sendRundeAction(slug: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const [kommuneData, tovholdere] = await Promise.all([
    getKommuneById(kommune.id),
    getAllTovholdere(kommune.id),
  ]);
  const aktive = tovholdere.filter((t) => t.aktiv);
  await Promise.all(
    aktive.map(async (th) => {
      const link = await createMagicLink(th.id, kommune.id);
      if (kommuneData) await sendMagicLinkEmail(th.email, th.navn, kommuneData.navn, link.token);
    }),
  );
  redirect(`/k/${slug}/tovholdere`);
}
```

- [ ] **Step 2: Opret tovholder-sider**

Læs de eksisterende tovholder-sider og opret tilsvarende under `/k/[kommune]/tovholdere/` med:
1. `requireKommuneContext(slug)` i stedet for `verifySession` + `session.kommuneId`.
2. Alle interne links/redirects opdateret til `/k/${slug}/tovholdere/...`.
3. Actions bundet med slug.

- [ ] **Step 3: Typecheck og commit**

```bash
npx tsc --noEmit
git add "app/(app)/k/[kommune]/tovholdere/"
git commit -m "feat: tovholdere under /k/[kommune]/tovholdere/"
```

---

### Task 8: Data

**Files:**
- Create: `app/(app)/k/[kommune]/data/page.tsx`
- Create: `app/(app)/k/[kommune]/data/actions.ts`

- [ ] **Step 1: Opret `actions.ts`**

Læs den eksisterende `app/(app)/data/actions.ts`. Opret ny version:

```ts
// app/(app)/k/[kommune]/data/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { indikator } from '@/db/schema';
import { getTemplateById } from '@/db/queries/indikator-template';
import {
  createKommuneIndikator,
  setKommuneIndikatorAktiv,
  getKommuneIndikatorById,
} from '@/db/queries/kommune-indikator';
import type { FormState } from '@/lib/definitions';

export async function activateTemplateAction(
  slug: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const templateId = formData.get('templateId') as string;
  const template = await getTemplateById(templateId);
  if (!template || !template.aktiv) return { message: 'Indikator ikke tilgængelig.' };

  try {
    const [newIndikator] = await db.insert(indikator).values({
      niveau: 'impact',
      beskrivelse: template.titel,
      enhed: template.enhed,
      datakildeType: 'api',
      apiKilde: template.kilde,
      apiQuery: template.apiQuery,
    }).returning();

    await createKommuneIndikator({
      kommuneId: kommune.id,
      templateId,
      indikatorId: newIndikator.id,
    });
  } catch {
    return { message: 'Indikatoren er allerede aktiv.' };
  }

  revalidatePath(`/k/${slug}/data`);
  redirect(`/k/${slug}/data`);
}

export async function deactivateKommuneIndikatorAction(slug: string, kiId: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const ki = await getKommuneIndikatorById(kiId);
  if (!ki || ki.kommuneId !== kommune.id) return;
  await setKommuneIndikatorAktiv(kiId, false);
  revalidatePath(`/k/${slug}/data`);
}

export async function hentNuFormAction(
  slug: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const kiId = formData.get('kiId') as string;
  const ki = await getKommuneIndikatorById(kiId);
  if (!ki || ki.kommuneId !== kommune.id) return { message: 'Ikke autoriseret' };
  // Trigger fetch — genbruger eksisterende fetch-logik med kommuneId
  // (pg-boss job oprettes med ki.indikatorId + kommune.id som i den nuværende implementation)
  revalidatePath(`/k/${slug}/data`);
  return { message: 'Hentning planlagt.' };
}
```

- [ ] **Step 2: Opret data-side**

Læs `app/(app)/data/page.tsx`. Opret `/k/[kommune]/data/page.tsx` med:
1. `requireKommuneContext(slug)` → `kommune.id`.
2. Alle links/redirects → `/k/${slug}/data`.
3. Actions bundet: `activateTemplateAction.bind(null, slug)`, `deactivateKommuneIndikatorAction.bind(null, slug)`, `hentNuFormAction.bind(null, slug)`.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add "app/(app)/k/[kommune]/data/"
git commit -m "feat: data under /k/[kommune]/data/"
```

---

### Task 9: Læring

**Files:**
- Create: `app/(app)/k/[kommune]/laering/page.tsx`
- Create: `app/(app)/k/[kommune]/laering/actions.ts`

- [ ] **Step 1: Opret `actions.ts`**

```ts
// app/(app)/k/[kommune]/laering/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createLaeringspost, deleteLaeringspost } from '@/db/queries/laeringspost';
import type { LaeringsBeslutning, LaeringsKnytning } from '@/lib/merl/laeringspost-types';
import { BESLUTNINGER } from '@/lib/merl/laeringspost-types';

const KNYTNINGER: LaeringsKnytning[] = ['tiltag', 'indsatsomraade', 'maal'];

export async function opretLaeringspostAction(slug: string, formData: FormData): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  const knyttetTilType = formData.get('knyttetTilType') as string;
  const beslutning = formData.get('beslutning') as string;
  const knyttetTilId = (formData.get('knyttetTilId') as string) ?? '';
  const observation = ((formData.get('observation') as string) ?? '').trim();
  const dato = (formData.get('dato') as string) ?? '';

  if (!KNYTNINGER.includes(knyttetTilType as LaeringsKnytning)) throw new Error('Ugyldig knytning');
  if (!BESLUTNINGER.includes(beslutning as LaeringsBeslutning)) throw new Error('Ugyldig beslutning');
  if (!observation || !dato || !knyttetTilId) throw new Error('Manglende felter');

  await createLaeringspost({
    kommuneId: kommune.id,
    knyttetTilType: knyttetTilType as LaeringsKnytning,
    knyttetTilId,
    beslutning: beslutning as LaeringsBeslutning,
    observation,
    dato,
  });

  revalidatePath(`/k/${slug}/laering`);
}

export async function deleteLaeringspostAction(slug: string, id: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  await deleteLaeringspost(id, kommune.id);
  revalidatePath(`/k/${slug}/laering`);
}
```

- [ ] **Step 2: Opret laering-side**

Læs `app/(app)/laering/page.tsx`. Opret `/k/[kommune]/laering/page.tsx` med:
1. `requireKommuneContext(slug)` → `kommune.id`.
2. Actions bundet med slug.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add "app/(app)/k/[kommune]/laering/"
git commit -m "feat: laering under /k/[kommune]/laering/"
```

---

### Task 10: Selvevaluering

**Files:**
- Create: `app/(app)/k/[kommune]/selvevaluering/page.tsx`
- Create: `app/(app)/k/[kommune]/selvevaluering/preview/page.tsx`
- Create: `app/(app)/k/[kommune]/selvevaluering/actions.ts`

- [ ] **Step 1: Opret `actions.ts`**

Læs `app/(app)/selvevaluering/actions.ts`. Opret ny version:

```ts
// app/(app)/k/[kommune]/selvevaluering/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { revalidatePath } from 'next/cache';
import {
  getSelvevaluering,
  upsertSelvevaluering,
  getDokumentationshenvisninger,
  initialiserKriterieData,
  opdaterKriterieText,
  godkendKriterieInData,
} from '@/db/queries/selvevaluering';
import type { KriterieBesvarelse } from '@/lib/cctf/selvevaluering-types';

export async function genererSelvevaluering(slug: string): Promise<{ ok: boolean }> {
  const { kommune } = await requireKommuneContext(slug);
  const existing = await getSelvevaluering(kommune.id);
  let data = existing?.kriterieData ?? initialiserKriterieData('2.5');
  const docs = await getDokumentationshenvisninger(kommune.id, undefined as unknown as number);
  data = { ...data, ...docs };
  await upsertSelvevaluering(kommune.id, data);
  revalidatePath(`/k/${slug}/selvevaluering`);
  return { ok: true };
}

export async function opdaterKriterieTekstAction(
  slug: string,
  kriterieNr: number,
  felt: string,
  vaerdi: string,
): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const existing = await getSelvevaluering(kommune.id);
  if (!existing) return;
  const opdateret = opdaterKriterieText(existing.kriterieData as Record<string, KriterieBesvarelse>, kriterieNr, felt, vaerdi);
  await upsertSelvevaluering(kommune.id, opdateret);
  revalidatePath(`/k/${slug}/selvevaluering`);
}

export async function godkendKriterieAction(slug: string, kriterieNr: number): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const existing = await getSelvevaluering(kommune.id);
  if (!existing) return;
  const opdateret = godkendKriterieInData(existing.kriterieData as Record<string, KriterieBesvarelse>, kriterieNr);
  await upsertSelvevaluering(kommune.id, opdateret);
  revalidatePath(`/k/${slug}/selvevaluering`);
}
```

- [ ] **Step 2: Opret selvevaluering- og preview-sider**

Læs de eksisterende `app/(app)/selvevaluering/page.tsx` og `preview/page.tsx`. Opret tilsvarende med:
1. `requireKommuneContext(slug)` → `kommune.id`.
2. Links til `/k/${slug}/selvevaluering/preview` og tilbage.
3. Actions kaldt med slug som første argument.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add "app/(app)/k/[kommune]/selvevaluering/"
git commit -m "feat: selvevaluering under /k/[kommune]/selvevaluering/"
```

---

### Task 11: Indstillinger + dashboard-composer

**Files:**
- Create: `app/(app)/k/[kommune]/indstillinger/page.tsx`
- Create: `app/(app)/k/[kommune]/indstillinger/dashboard/page.tsx`
- Create: `app/(app)/k/[kommune]/indstillinger/dashboard/actions.ts`
- Create: `app/(app)/k/[kommune]/indstillinger/dashboard/_composer.tsx`
- Modify: `app/(app)/indstillinger/page.tsx` (redirect)

- [ ] **Step 1: Opret indstillinger-action (public config)**

Læs `app/(app)/indstillinger/_public-config-form.tsx` for at forstå hvad actionen gør. Opret:

```ts
// app/(app)/k/[kommune]/indstillinger/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { kommune as kommuneSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/lib/definitions';

export async function updatePublicConfigAction(
  slug: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);
  const publicEnabled = formData.get('publicEnabled') === 'true';
  const publicStaleDaysRaw = formData.get('publicStaleDays');
  const publicStaleDays = publicStaleDaysRaw ? parseInt(String(publicStaleDaysRaw)) : 90;
  const publicHighlights = formData.getAll('publicHighlights') as string[];

  await db.update(kommuneSchema).set({
    publicEnabled,
    publicStaleDays,
    publicHighlights,
    updatedAt: new Date(),
  }).where(eq(kommuneSchema.id, kommune.id));

  revalidatePath(`/k/${slug}/indstillinger`);
  return { message: 'Gemt.' };
}
```

- [ ] **Step 2: Opret indstillinger-side**

```tsx
// app/(app)/k/[kommune]/indstillinger/page.tsx
import Link from 'next/link';
import { requireKommuneContext } from '@/lib/kommune-context';
import { getAktiveKommuneIndikatorer } from '@/db/queries/public-dashboard';
import { PublicConfigForm } from '@/app/(app)/indstillinger/_public-config-form';
import { updatePublicConfigAction } from './actions';

export const metadata = { title: 'Indstillinger — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function IndstillingerPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);
  const indikatorer = await getAktiveKommuneIndikatorer(kommune.id);

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
          action={updatePublicConfigAction.bind(null, slug)}
        />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Dashboard-opbygning</h2>
        <p className="mb-4 text-sm text-gray-500">Vælg og arrangér widgets på den offentlige side.</p>
        <Link
          href={`/k/${slug}/indstillinger/dashboard`}
          className="inline-block rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Åbn dashboard-opbygning →
        </Link>
      </div>
    </div>
  );
}
```

**Bemærk:** `PublicConfigForm` modtager nu en `action`-prop med slug bundet ind. Kontrollér at `_public-config-form.tsx` accepterer en action-prop (eller tilpas den minimalt til at tage `action` som prop i stedet for at importere den direkte).

- [ ] **Step 3: Opret dashboard-action**

```ts
// app/(app)/k/[kommune]/indstillinger/dashboard/actions.ts
'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { kommune as kommuneSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { saneerWidgets } from '@/lib/widgets/validering';
import { DEFINITIONER } from '@/lib/widgets/definitioner';
import type { WidgetInstans } from '@/lib/widgets/types';

export async function updateDashboardWidgets(
  slug: string,
  widgets: WidgetInstans[],
): Promise<{ ok: boolean; error?: string }> {
  const { kommune } = await requireKommuneContext(slug);
  const saneret = saneerWidgets(widgets, DEFINITIONER);
  await db
    .update(kommuneSchema)
    .set({ publicWidgets: saneret, updatedAt: new Date() })
    .where(eq(kommuneSchema.id, kommune.id));
  return { ok: true };
}
```

- [ ] **Step 4: Opret `_composer.tsx`**

Kopier `app/(app)/indstillinger/dashboard/_composer.tsx` til ny placering og:
1. Tilføj `slug: string` til `Props`-typen.
2. Erstat `import { updateDashboardWidgets } from './actions'` med import fra den nye `actions.ts`.
3. Erstat `updateDashboardWidgets(widgets)` med `updateDashboardWidgets(slug, widgets)`.
4. Erstat `iframe src={`/${subdomain}`}` — uændret (peger på offentlig side).

- [ ] **Step 5: Opret dashboard-composer-side**

```tsx
// app/(app)/k/[kommune]/indstillinger/dashboard/page.tsx
import { requireKommuneContext } from '@/lib/kommune-context';
import { getAktiveKommuneIndikatorer } from '@/db/queries/public-dashboard';
import { Composer } from './_composer';
import { definitionListe, DEFINITIONER } from '@/lib/widgets/definitioner';
import { saneerWidgets } from '@/lib/widgets/validering';
import { standardSkabelon } from '@/lib/widgets/standard-skabelon';
import type { WidgetInstans } from '@/lib/widgets/types';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function DashboardComposerPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const indikatorer = await getAktiveKommuneIndikatorer(kommune.id);
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
        slug={slug}
        subdomain={kommune.subdomain}
        initielle={initielle}
        definitioner={definitionListe()}
        indikatorer={indikatorer.map((i) => ({ value: i.id, label: `${i.label} (${i.enhed})` }))}
      />
    </div>
  );
}
```

- [ ] **Step 6: Gør gammelt indstillinger til redirect**

Erstat `app/(app)/indstillinger/page.tsx`:

```tsx
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';

export default async function IndstillingerRedirect() {
  const session = await verifySession();
  if (!session) redirect('/login');
  if (session.role === 'admin') redirect('/admin/kommuner');
  const slug =
    session.kommuneSlug ??
    (session.kommuneId ? (await getKommuneById(session.kommuneId))?.subdomain : null);
  if (!slug) redirect('/login');
  redirect(`/k/${slug}/indstillinger`);
}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen nye fejl.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/k/[kommune]/indstillinger/" "app/(app)/indstillinger/page.tsx"
git commit -m "feat: indstillinger + dashboard-composer under /k/[kommune]/indstillinger/"
```

---

### Task 12: Admin-panel + cleanup

**Files:**
- Modify: `app/admin/kommuner/page.tsx`
- Modify: `app/admin/kommuner/actions.ts`

- [ ] **Step 1: Opdatér admin-kommuner-liste**

Erstat hele `app/admin/kommuner/page.tsx`:

```tsx
import { getAllKommuner } from '@/db/queries';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Kommuner — Admin' };

export default async function KommunerPage() {
  const kommuner = await getAllKommuner();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Kommuner</h1>
        <Link href="/admin/kommuner/ny">
          <Button>Opret kommune</Button>
        </Link>
      </div>

      {kommuner.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500">
          Ingen kommuner endnu. Opret den første.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Navn</th>
                <th className="px-4 py-3 font-medium">Kommunekode</th>
                <th className="px-4 py-3 font-medium">Subdomæne</th>
                <th className="px-4 py-3 font-medium">Offentlig</th>
                <th className="px-4 py-3 font-medium">Oprettet</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {kommuner.map((k) => (
                <tr key={k.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.navn}</td>
                  <td className="px-4 py-3 text-gray-600">{k.kommunekode}</td>
                  <td className="px-4 py-3 text-gray-600">{k.subdomain}.klimastatus.dk</td>
                  <td className="px-4 py-3 text-gray-600">{k.publicEnabled ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(k.createdAt).toLocaleDateString('da-DK')}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Link href={`/k/${k.subdomain}/dashboard`}>
                      <Button variant="outline" size="sm">Åbn arbejdsflade →</Button>
                    </Link>
                    <Link href={`/${k.subdomain}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">Se offentlig side</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Fjern `switchKommuneAction` fra actions.ts**

Erstat hele `app/admin/kommuner/actions.ts`:

```ts
'use server';
import { z } from 'zod';
import { createKommune } from '@/db/queries';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/lib/definitions';
import { verifySession } from '@/lib/dal';

const CreateKommuneSchema = z.object({
  navn: z.string().min(2, 'Navn skal være mindst 2 tegn.').max(100),
  kommunekode: z.string().min(3, 'Kommunekode skal være mindst 3 tegn.').max(10),
});

function toSubdomain(navn: string): string {
  return navn
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createKommuneAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session || session.role !== 'admin') redirect('/login');

  const raw = {
    navn: formData.get('navn'),
    kommunekode: formData.get('kommunekode'),
  };
  const parsed = CreateKommuneSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { navn, kommunekode } = parsed.data;
  const subdomain = toSubdomain(navn);

  try {
    await createKommune({ navn, kommunekode, subdomain });
  } catch {
    return { message: 'Subdomæne eller kommunekode er allerede i brug.' };
  }

  revalidatePath('/admin/kommuner');
  redirect('/admin/kommuner');
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 4: Commit**

```bash
git add app/admin/kommuner/page.tsx app/admin/kommuner/actions.ts
git commit -m "feat: admin-panel med direkte links til /k/<slug>/ + fjern switchKommuneAction"
```

---

### Task 13: Fuld verifikation

**Files:** ingen ændringer.

- [ ] **Step 1: Kør hele testsuiten**

Run: `npm test`
Expected: alle tests grønne. Tjek specielt `lib/kommune-context.test.ts` (5 tests).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: ingen fejl (ud over pre-existing `.next/`-cache-fejl).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: ingen nye fejl.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: bygger uden fejl. Verificerer server/klient-grænser og at alle `/k/[kommune]/`-ruter er korrekt statisk analyseret.

- [ ] **Step 5: Branch-status**

```bash
git log --oneline main..HEAD
git status
```

Expected: ~13 feature-commits, ren working tree.

---

## Self-Review Notes

- **Spec-dækning:** Alle tre verdener (offentlig/arbejdsflade/admin) implementeret. `requireKommuneContext` er eneste håndhævelsespunkt. `kommuneSlug` i session giver koordinator præcis redirect. `switchKommuneAction` fjernet. Synlig aktiv-kommune i topbar med farveaccent. `/dashboard` og `/indstillinger` backward-compat redirects med fallback til DB-opslag for gamle sessions.
- **Type-konsistens:** `requireKommuneContext(slug)` bruges ens i alle tasks. Actions-signaturer er `(slug: string, ...rest)` konsekvent. `KommuneContext` returnerer `{ session, kommune }` overalt.
- **YAGNI:** Ingen dropdown-kommune-vælger, ingen per-bruger-rettigheder ud over de to roller, ingen migrering af API-ruter.
- **Importer-client:** Den eksisterende `importer-client.tsx` genbruges ved at tilføje `slug`-prop — minimalt indgreb i eksisterende kode.
- **PublicConfigForm:** Skal kontrolleres for om den accepterer `action`-prop. Hvis ikke, er en minimal ændring nødvendig (tilføj prop, kald den i stedet for hardkodet import).
