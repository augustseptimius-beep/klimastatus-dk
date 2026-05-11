# Phase 2: Auth, Admin & Koordinator-dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement custom email+password auth, admin panel for creating kommuner, and koordinator dashboard skeleton so a logged-in user can see their kommune's status.

**Architecture:** Custom JWT auth (no NextAuth) using `jose` for signing, stored in an HttpOnly cookie. Route protection via Next.js 16's `proxy.ts` (replaces `middleware.ts`). Three route groups: `(auth)` for login, `(admin)` for admin-only pages, `(app)` for koordinator pages. KommuneId is stored in the JWT — no subdomain detection needed in Phase 2.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM (postgres.js), `jose` (JWT), `@node-rs/argon2` (password hashing, already installed), Zod v4, shadcn/ui Button component, Tailwind CSS v4, React 19 (`useActionState`).

---

## File Map

**New files:**
- `lib/definitions.ts` — shared TypeScript types for session payload, form state
- `lib/session.ts` — JWT encrypt/decrypt, createSession, deleteSession (server-only)
- `lib/dal.ts` — verifySession, getCurrentUser (Data Access Layer, server-only)
- `db/queries/user.ts` — DB queries: getUserByEmail, createUser
- `db/queries/kommune.ts` — DB queries: getAllKommuner, getKommuneById, createKommune
- `app/actions/auth.ts` — login, logout server actions
- `proxy.ts` — Next.js 16 route protection (replaces middleware.ts)
- `app/(auth)/layout.tsx` — centered layout for login page
- `app/(auth)/login/page.tsx` — login page (server component)
- `components/login-form.tsx` — login form (client component, uses useActionState)
- `app/(admin)/layout.tsx` — admin layout (checks role=admin)
- `app/(admin)/kommuner/page.tsx` — list all kommuner
- `app/(admin)/kommuner/ny/page.tsx` — create kommune form page
- `components/create-kommune-form.tsx` — create kommune form (client component)
- `app/(admin)/kommuner/actions.ts` — createKommune server action
- `app/(app)/layout.tsx` — app layout with sidebar
- `components/app-sidebar.tsx` — sidebar navigation
- `app/(app)/dashboard/page.tsx` — koordinator dashboard skeleton
- `app/(app)/indstillinger/page.tsx` — kommune settings skeleton

**Modified files:**
- `.env.example` and `.env.local` — add SESSION_SECRET
- `db/seed.ts` — add admin user seed
- `app/layout.tsx` — update metadata title

**IMPORTANT — Next.js 16 breaking change:** The `middleware.ts` convention is deprecated. Use `proxy.ts` with a function named `proxy`. The edge runtime is NOT supported; it runs on Node.js.

---

### Task 1: Install jose and server-only

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
npm install jose server-only
```

Expected output: `added 2 packages`

- [ ] **Step 2: Verify TypeScript can resolve jose**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install jose and server-only for auth"
```

---

### Task 2: Shared type definitions

**Files:**
- Create: `lib/definitions.ts`

- [ ] **Step 1: Write the test**

Create `lib/definitions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { SessionPayload, FormState } from './definitions';

describe('SessionPayload type', () => {
  it('accepts valid payload', () => {
    const payload: SessionPayload = {
      userId: 'abc-123',
      kommuneId: 'def-456',
      role: 'koordinator',
      navn: 'Test User',
      expiresAt: new Date(),
    };
    expect(payload.role).toBe('koordinator');
  });

  it('accepts null kommuneId for admin', () => {
    const payload: SessionPayload = {
      userId: 'abc-123',
      kommuneId: null,
      role: 'admin',
      navn: 'Admin',
      expiresAt: new Date(),
    };
    expect(payload.kommuneId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/definitions.test.ts
```

Expected: FAIL — cannot find module `./definitions`.

- [ ] **Step 3: Create `lib/definitions.ts`**

```typescript
export type SessionPayload = {
  userId: string;
  kommuneId: string | null;
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

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/definitions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/definitions.ts lib/definitions.test.ts
git commit -m "feat: add shared auth type definitions"
```

---

### Task 3: Session management library

**Files:**
- Create: `lib/session.ts`

> Before writing: read `node_modules/next/dist/docs/01-app/02-guides/authentication.md` sections on "Stateless Sessions" and "Setting cookies".

- [ ] **Step 1: Add SESSION_SECRET to env files**

In `.env.example`:
```
# Generate with: openssl rand -base64 32
SESSION_SECRET=
```

In `.env.local`, generate and add a real value:
```bash
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.local
```

- [ ] **Step 2: Write the test**

Create `lib/session.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// We test the logic, not the cookie side-effects.
// Import encrypt/decrypt directly (not createSession/deleteSession which need Next.js cookies).
describe('session encryption', () => {
  it('round-trips a payload', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-32-chars-longg';
    const { encrypt, decrypt } = await import('./session');
    const payload = {
      userId: 'user-1',
      kommuneId: 'kom-1',
      role: 'koordinator' as const,
      navn: 'Test',
      expiresAt: new Date(Date.now() + 1000 * 60),
    };
    const token = await encrypt(payload);
    expect(typeof token).toBe('string');
    const result = await decrypt(token);
    expect(result?.userId).toBe('user-1');
    expect(result?.role).toBe('koordinator');
  });

  it('returns undefined for invalid token', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-32-chars-longg';
    const { decrypt } = await import('./session');
    const result = await decrypt('not-a-valid-token');
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run lib/session.test.ts
```

Expected: FAIL — cannot find module `./session`.

- [ ] **Step 4: Create `lib/session.ts`**

```typescript
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { SessionPayload } from './definitions';

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey());
}

export async function decrypt(token: string): Promise<SessionPayload | undefined> {
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return undefined;
  }
}

export async function createSession(data: Omit<SessionPayload, 'expiresAt'>) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await encrypt({ ...data, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run lib/session.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/session.ts lib/session.test.ts .env.example .env.local
git commit -m "feat: add JWT session management"
```

---

### Task 4: Data Access Layer (DAL)

**Files:**
- Create: `lib/dal.ts`

- [ ] **Step 1: Write the test**

Create `lib/dal.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./session', () => ({
  decrypt: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(() => ({ value: 'mock-token' })) })),
}));
vi.mock('@/db', () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe('verifySession', () => {
  it('returns null when no token', async () => {
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockReturnValueOnce({ get: vi.fn(() => undefined) } as any);
    const { verifySession } = await import('./dal');
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it('returns null when token is invalid', async () => {
    const { decrypt } = await import('./session');
    vi.mocked(decrypt).mockResolvedValueOnce(undefined);
    const { verifySession } = await import('./dal');
    const result = await verifySession();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/dal.test.ts
```

Expected: FAIL — cannot find module `./dal`.

- [ ] **Step 3: Create `lib/dal.ts`**

```typescript
import 'server-only';
import { cookies } from 'next/headers';
import { decrypt } from './session';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { user } from '@/db/schema';
import type { SessionPayload } from './definitions';

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  const payload = await decrypt(token);
  if (!payload || !payload.userId) return null;
  return payload;
}

export async function getCurrentUser() {
  const session = await verifySession();
  if (!session) return null;
  return db.query.user.findFirst({
    where: eq(user.id, session.userId),
    columns: { passwordHash: false },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/dal.test.ts
```

Expected: PASS.

- [ ] **Step 5: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/dal.ts lib/dal.test.ts
git commit -m "feat: add Data Access Layer for session verification"
```

---

### Task 5: DB queries for user and kommune

**Files:**
- Create: `db/queries/user.ts`
- Create: `db/queries/kommune.ts`
- Create: `db/queries/index.ts`

- [ ] **Step 1: Write tests**

Create `db/queries/user.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'u1',
          email: 'test@kommune.dk',
          navn: 'Test',
          role: 'koordinator',
          kommuneId: 'k1',
        }),
      },
    },
  },
}));

describe('getUserByEmail', () => {
  it('calls db with correct email', async () => {
    const { getUserByEmail } = await import('./user');
    const result = await getUserByEmail('test@kommune.dk');
    expect(result?.email).toBe('test@kommune.dk');
  });
});
```

Create `db/queries/kommune.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      kommune: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'k1', navn: 'Thisted', subdomain: 'thisted' },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'k1',
          navn: 'Thisted',
          subdomain: 'thisted',
        }),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'k2', navn: 'Aalborg', subdomain: 'aalborg' }]),
      })),
    })),
  },
}));

describe('getAllKommuner', () => {
  it('returns list of kommuner', async () => {
    const { getAllKommuner } = await import('./kommune');
    const result = await getAllKommuner();
    expect(result).toHaveLength(1);
    expect(result[0].navn).toBe('Thisted');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run db/queries/user.test.ts db/queries/kommune.test.ts
```

Expected: FAIL — cannot find modules.

- [ ] **Step 3: Create `db/queries/user.ts`**

```typescript
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';

export async function getUserByEmail(email: string) {
  return db.query.user.findFirst({ where: eq(user.email, email) });
}

export async function createUser(data: {
  email: string;
  password: string;
  navn: string;
  role: string;
  kommuneId: string | null;
}) {
  const passwordHash = await hash(data.password);
  const [created] = await db
    .insert(user)
    .values({
      email: data.email,
      passwordHash,
      navn: data.navn,
      role: data.role,
      kommuneId: data.kommuneId ?? undefined,
    })
    .returning({ id: user.id, email: user.email, navn: user.navn, role: user.role });
  return created;
}
```

- [ ] **Step 4: Create `db/queries/kommune.ts`**

```typescript
import { db } from '@/db';
import { kommune } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function getAllKommuner() {
  return db.query.kommune.findMany({ orderBy: asc(kommune.navn) });
}

export async function getKommuneById(id: string) {
  return db.query.kommune.findFirst({ where: eq(kommune.id, id) });
}

export async function getKommuneBySubdomain(subdomain: string) {
  return db.query.kommune.findFirst({ where: eq(kommune.subdomain, subdomain) });
}

export async function createKommune(data: {
  navn: string;
  kommunekode: string;
  subdomain: string;
}) {
  const [created] = await db.insert(kommune).values(data).returning();
  return created;
}
```

- [ ] **Step 5: Create `db/queries/index.ts`**

```typescript
export * from './user';
export * from './kommune';
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run db/queries/user.test.ts db/queries/kommune.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add db/queries/
git commit -m "feat: add DB queries for user and kommune"
```

---

### Task 6: Login and logout server actions

**Files:**
- Create: `app/actions/auth.ts`

- [ ] **Step 1: Write the test**

Create `app/actions/auth.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db/queries', () => ({
  getUserByEmail: vi.fn(),
}));
vi.mock('@node-rs/argon2', () => ({
  verify: vi.fn(),
}));
vi.mock('@/lib/session', () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('login', () => {
  it('returns error for invalid email format', async () => {
    const { login } = await import('./auth');
    const formData = new FormData();
    formData.set('email', 'not-an-email');
    formData.set('password', 'password123!');
    const result = await login(undefined, formData);
    expect(result?.errors?.email).toBeDefined();
  });

  it('returns error when user not found', async () => {
    const { getUserByEmail } = await import('@/db/queries');
    vi.mocked(getUserByEmail).mockResolvedValueOnce(undefined);
    const { login } = await import('./auth');
    const formData = new FormData();
    formData.set('email', 'user@test.dk');
    formData.set('password', 'ValidPass1!');
    const result = await login(undefined, formData);
    expect(result?.message).toBe('Forkert email eller adgangskode.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run app/actions/auth.test.ts
```

Expected: FAIL — cannot find module `./auth`.

- [ ] **Step 3: Create `app/actions/auth.ts`**

```typescript
'use server';
import { z } from 'zod';
import { verify } from '@node-rs/argon2';
import { getUserByEmail } from '@/db/queries';
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

  await createSession({
    userId: foundUser.id,
    kommuneId: foundUser.kommuneId ?? null,
    role: foundUser.role as 'admin' | 'koordinator',
    navn: foundUser.navn,
  });

  redirect(foundUser.role === 'admin' ? '/admin/kommuner' : '/dashboard');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run app/actions/auth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/actions/auth.ts app/actions/auth.test.ts
git commit -m "feat: add login and logout server actions"
```

---

### Task 7: Proxy route protection

**Files:**
- Create: `proxy.ts`

> **Next.js 16 note:** This file is named `proxy.ts` (not `middleware.ts`). The export function must be named `proxy`. It runs on the Node.js runtime (not edge).

- [ ] **Step 1: Create `proxy.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const publicRoutes = ['/', '/login'];
const adminRoutes = ['/admin'];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic = publicRoutes.includes(path);
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

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: add proxy route protection"
```

---

### Task 8: Login page

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `components/login-form.tsx`

- [ ] **Step 1: Create `app/(auth)/layout.tsx`**

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/login-form.tsx`**

```typescript
'use client';
import { useActionState } from 'react';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state?.errors?.email && (
          <p className="text-sm text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Adgangskode
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state?.errors?.password && (
          <p className="text-sm text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Logger ind…' : 'Log ind'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/login/page.tsx`**

```typescript
import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Log ind — Klimastatus.dk' };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Klimastatus.dk</h1>
        <p className="mt-1 text-sm text-gray-500">Log ind for at fortsætte</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/'(auth)'/ components/login-form.tsx
git commit -m "feat: add login page and form"
```

---

### Task 9: Seed admin user and update env

**Files:**
- Modify: `db/seed.ts`

- [ ] **Step 1: Update `db/seed.ts` to add admin user**

Replace the entire file:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hash } from '@node-rs/argon2';
import { cctfKriterie, user } from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const CCTF_V25_CRITERIA = [
  {
    version: '2.5',
    kriterieNr: 1,
    komponent: 'Forpligtelse, styring og mainstreaming',
    titel: 'Offentlig forpligtelse',
    beskrivelse: 'Offentlig forpligtelse fra siddende borgmester (eller kommunalbestyrelse) til at igangsætte hurtig, rimelig og retfærdig handling ved anvendelse af tilgængelige beføjelser og indflydelse til at opnå netto-nuludledning og styrke klimarobustheden i overensstemmelse med Parisaftalens højeste ambition (1.5°C).',
  },
  {
    version: '2.5',
    kriterieNr: 2,
    komponent: 'Forpligtelse, styring og mainstreaming',
    titel: 'Klimaintegration i styring',
    beskrivelse: 'Klimaforpligtelser og -hensyn er integreret i interne styrings- og beslutningsstrukturer, processer og funktioner, hvilket sikrer, at klimapåvirkningen overvejes og inkluderes som en del af kommunens øvrige prioriteter.',
  },
  {
    version: '2.5',
    kriterieNr: 3,
    komponent: 'Inkluderende inddragelse og kommunikation',
    titel: 'Inddragelse af interessenter',
    beskrivelse: 'Inddragelse af forskellige interessenter for at indsamle information til brug i klimaplanlægningen samt for at advokere for - og skabe opbakning til - klimaindsatsen. Interessenterne bør omfatte dem, der påvirkes mest af klimaforandringerne og klimatiltagene, samt dem, der har magt, indflydelse og potentiale til at reducere emissioner og klimarisici.',
  },
  {
    version: '2.5',
    kriterieNr: 4,
    komponent: 'Inkluderende inddragelse og kommunikation',
    titel: 'Kommunikation og samarbejde',
    beskrivelse: 'Kommunikation til og samarbejde med lokalsamfundet og andre interessenter som en del af klimaindsatsen.',
  },
  {
    version: '2.5',
    kriterieNr: 5,
    komponent: 'Viden som grundlag for mål, strategier og handlinger',
    titel: 'Klimarisici og sårbarhed',
    beskrivelse: 'Vidensgrundlag for klimatilpasning baseret på identificering af klimafarer, klimarelaterede risici og sårbarheder.',
  },
  {
    version: '2.5',
    kriterieNr: 6,
    komponent: 'Viden som grundlag for mål, strategier og handlinger',
    titel: 'Vidensgrundlag for reduktion',
    beskrivelse: 'Vidensgrundlag for reduktion af drivhusgasudledninger baseret på drivhusgasregnskab, fremskrivning og analyse af tilgængelige beføjelser.',
  },
  {
    version: '2.5',
    kriterieNr: 7,
    komponent: 'Viden som grundlag for mål, strategier og handlinger',
    titel: 'Retfærdighed og rimelighed',
    beskrivelse: 'Vidensgrundlag for retfærdighed og rimelighed, der identificerer sårbare og marginaliserede grupper og sociale konsekvenser af klimaforandringer og klimatiltag.',
  },
  {
    version: '2.5',
    kriterieNr: 8,
    komponent: 'Mål for hele kommunen, understøttet af sektorstrategier',
    titel: 'Reduktionsmål',
    beskrivelse: 'Mål for reduktion af drivhusgasudledninger på kort, mellemlang og lang sigt i overensstemmelse med Parisaftalens 1.5°C-ambition.',
  },
  {
    version: '2.5',
    kriterieNr: 9,
    komponent: 'Mål for hele kommunen, understøttet af sektorstrategier',
    titel: 'Tilpasningsmål',
    beskrivelse: 'Mål for klimatilpasning og øget klimarobusthed på kort, mellemlang og lang sigt.',
  },
  {
    version: '2.5',
    kriterieNr: 10,
    komponent: 'Mål for hele kommunen, understøttet af sektorstrategier',
    titel: 'Retfærdighedsmål',
    beskrivelse: 'Mål på kort, mellemlang og lang sigt, der skal sikre, at klimatiltag bidrager til at fremme social, miljømæssig og økonomisk rimelighed, retfærdighed og lighed.',
  },
  {
    version: '2.5',
    kriterieNr: 11,
    komponent: 'Mål for hele kommunen, understøttet af sektorstrategier',
    titel: 'Sektorstrategier',
    beskrivelse: 'Sektorspecifikke strategier, der tilsammen opfylder kommunens mål for klimatilpasning, netto-nuludledning samt rimelighed og retfærdighed.',
  },
  {
    version: '2.5',
    kriterieNr: 12,
    komponent: 'Handlinger og implementeringsplanlægning baseret på vidensgrundlaget',
    titel: 'Tiltag',
    beskrivelse: 'Tilpasnings- og reduktionstiltag, der er baseret på vidensgrundlaget, mål og delmål, som demonstrerer brug af alle tilgængelige beføjelser, partnerskaber og indflydelse.',
  },
  {
    version: '2.5',
    kriterieNr: 13,
    komponent: 'Handlinger og implementeringsplanlægning baseret på vidensgrundlaget',
    titel: 'Udfasning af fossile brændstoffer',
    beskrivelse: 'Kommunen skal bruge alle tilgængelige beføjelser til at stoppe brugen af og støtten til fossile brændstoffer. Dette omfatter at tage alle tilgængelige skridt for at sikre, at der ikke bygges/udvides/forlænges nye el- og varmeproduktionsanlæg eller udvindingsanlæg til fossile brændstoffer, og at alle kulfyrede kraftværker er udfaset inden 2030.',
  },
  {
    version: '2.5',
    kriterieNr: 14,
    komponent: 'Handlinger og implementeringsplanlægning baseret på vidensgrundlaget',
    titel: 'Implementeringsplanlægning',
    beskrivelse: 'Implementeringsplanlægning for prioriterede handlinger, der er blevet identificeret på kort sigt. Dette bør omfatte: understøttende tiltag, implementeringsplan, tidsramme og milepæle, berørte interessenter, detaljerede omkostninger, finansiering og finansieringsmetode, fordeling af merværdier, indikatorer.',
  },
  {
    version: '2.5',
    kriterieNr: 15,
    komponent: 'Monitorering, evaluering og rapportering af fremdrift med fokus på læring',
    titel: 'MERL-system',
    beskrivelse: 'Et system til monitorering, evaluering, rapportering og læring af erfaringer (MERL) fra implementering af klimatiltag, som omfatter et sæt indikatorer til at vurdere implementering af tiltag og fremskridt på output-, outcome- og impactniveau.',
  },
  {
    version: '2.5',
    kriterieNr: 16,
    komponent: 'Monitorering, evaluering og rapportering af fremdrift med fokus på læring',
    titel: 'Offentlig rapportering',
    beskrivelse: 'Løbende offentlig kommunikation og rapportering af status for implementering af klimaplanen og fremdrift mod klimamålene.',
  },
];

async function seed() {
  console.log('Seeding CCTF v2.5 criteria...');
  await db.insert(cctfKriterie).values(CCTF_V25_CRITERIA).onConflictDoNothing();
  console.log(`Seeded ${CCTF_V25_CRITERIA.length} criteria.`);

  console.log('Seeding admin user...');
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123!';
  const passwordHash = await hash(adminPassword);
  await db
    .insert(user)
    .values({
      email: 'augustseptimius@gmail.com',
      passwordHash,
      navn: 'August Septimius',
      role: 'admin',
    })
    .onConflictDoNothing();
  console.log('Admin user seeded (email: augustseptimius@gmail.com).');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add ADMIN_PASSWORD to .env files**

In `.env.example`:
```
ADMIN_PASSWORD=change-this-in-production
```

In `.env.local`, add a dev password:
```bash
echo "ADMIN_PASSWORD=admin123!" >> .env.local
```

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add db/seed.ts .env.example .env.local
git commit -m "feat: add admin user to seed"
```

---

### Task 10: Admin layout and kommune list

**Files:**
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/kommuner/page.tsx`

- [ ] **Step 1: Create `app/(admin)/layout.tsx`**

```typescript
import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { logout } from '@/app/actions/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session || session.role !== 'admin') redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-semibold text-gray-900">Klimastatus Admin</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Log ud
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(admin)/kommuner/page.tsx`**

```typescript
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
        <Button asChild>
          <Link href="/admin/kommuner/ny">Opret kommune</Link>
        </Button>
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
                <th className="px-4 py-3 font-medium">Oprettet</th>
              </tr>
            </thead>
            <tbody>
              {kommuner.map((k) => (
                <tr key={k.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.navn}</td>
                  <td className="px-4 py-3 text-gray-600">{k.kommunekode}</td>
                  <td className="px-4 py-3 text-gray-600">{k.subdomain}.klimastatus.dk</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(k.createdAt).toLocaleDateString('da-DK')}
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

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/'(admin)'/
git commit -m "feat: add admin layout and kommune list page"
```

---

### Task 11: Admin — create kommune

**Files:**
- Create: `app/(admin)/kommuner/ny/page.tsx`
- Create: `components/create-kommune-form.tsx`
- Create: `app/(admin)/kommuner/actions.ts`

- [ ] **Step 1: Write test**

Create `app/(admin)/kommuner/actions.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db/queries', () => ({
  createKommune: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('createKommuneAction', () => {
  it('returns error for empty navn', async () => {
    const { createKommuneAction } = await import('./actions');
    const formData = new FormData();
    formData.set('navn', '');
    formData.set('kommunekode', '773');
    const result = await createKommuneAction(undefined, formData);
    expect(result?.errors?.navn).toBeDefined();
  });

  it('returns error for empty kommunekode', async () => {
    const { createKommuneAction } = await import('./actions');
    const formData = new FormData();
    formData.set('navn', 'Thisted');
    formData.set('kommunekode', '');
    const result = await createKommuneAction(undefined, formData);
    expect(result?.errors?.kommunekode).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run 'app/(admin)/kommuner/actions.test.ts'
```

Expected: FAIL — cannot find module `./actions`.

- [ ] **Step 3: Create `app/(admin)/kommuner/actions.ts`**

```typescript
'use server';
import { z } from 'zod';
import { createKommune } from '@/db/queries';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/lib/definitions';

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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run 'app/(admin)/kommuner/actions.test.ts'
```

Expected: PASS.

- [ ] **Step 5: Create `components/create-kommune-form.tsx`**

```typescript
'use client';
import { useActionState } from 'react';
import { createKommuneAction } from '@/app/(admin)/kommuner/actions';
import { Button } from '@/components/ui/button';

export function CreateKommuneForm() {
  const [state, action, pending] = useActionState(createKommuneAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="navn" className="text-sm font-medium text-gray-700">
          Kommunenavn
        </label>
        <input
          id="navn"
          name="navn"
          type="text"
          placeholder="Thisted"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state?.errors?.navn && (
          <p className="text-sm text-red-600">{state.errors.navn[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="kommunekode" className="text-sm font-medium text-gray-700">
          Kommunekode
        </label>
        <input
          id="kommunekode"
          name="kommunekode"
          type="text"
          placeholder="773"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <p className="text-xs text-gray-400">Find kommunekoden på Danmarks Statistik (3-4 cifre).</p>
        {state?.errors?.kommunekode && (
          <p className="text-sm text-red-600">{state.errors.kommunekode[0]}</p>
        )}
      </div>

      {state?.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Opretter…' : 'Opret kommune'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Create `app/(admin)/kommuner/ny/page.tsx`**

```typescript
import { CreateKommuneForm } from '@/components/create-kommune-form';
import Link from 'next/link';

export const metadata = { title: 'Opret kommune — Admin' };

export default function NyKommunePage() {
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/admin/kommuner" className="text-sm text-gray-500 hover:text-gray-900">
          ← Tilbage til kommuner
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Opret ny kommune</h1>
        <p className="mt-1 text-sm text-gray-500">
          Subdomænet genereres automatisk fra kommunenavnet.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <CreateKommuneForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/'(admin)'/kommuner/ components/create-kommune-form.tsx
git commit -m "feat: add create kommune admin page"
```

---

### Task 12: App layout with sidebar

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `components/app-sidebar.tsx`

- [ ] **Step 1: Create `components/app-sidebar.tsx`**

```typescript
import Link from 'next/link';
import { logout } from '@/app/actions/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tiltag', label: 'Handlingsoverblik' },
  { href: '/data', label: 'Datastyring' },
  { href: '/scenarieberegner', label: 'Scenarieberegner' },
  { href: '/selvevaluering', label: 'Selvevaluering' },
  { href: '/indstillinger', label: 'Indstillinger' },
];

export function AppSidebar({ kommuneNavn }: { kommuneNavn: string }) {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Klimastatus.dk
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{kommuneNavn}</p>
      </div>

      <nav className="flex-1 px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-100 px-4 py-3">
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
            Log ud
          </button>
        </form>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `app/(app)/layout.tsx`**

```typescript
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session || session.role !== 'koordinator') redirect('/login');

  const kommune = session.kommuneId
    ? await getKommuneById(session.kommuneId)
    : null;

  if (!kommune) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar kommuneNavn={kommune.navn} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="mx-auto max-w-4xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/'(app)'/layout.tsx components/app-sidebar.tsx
git commit -m "feat: add app layout with sidebar"
```

---

### Task 13: Dashboard and settings pages

**Files:**
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/indstillinger/page.tsx`

- [ ] **Step 1: Create `app/(app)/dashboard/page.tsx`**

```typescript
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const kommune = await getKommuneById(session.kommuneId);
  if (!kommune) redirect('/login');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{kommune.navn} Kommune</h1>
        <p className="mt-1 text-sm text-gray-500">Klimastatus-overblik</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatusCard
          title="CCTF-status"
          value="—"
          description="Selvevaluering ikke påbegyndt"
          status="neutral"
        />
        <StatusCard
          title="Tovholdere"
          value="—"
          description="Ingen runde igangsat"
          status="neutral"
        />
        <StatusCard
          title="Seneste data"
          value="—"
          description="Ingen data hentet endnu"
          status="neutral"
        />
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-400">
        Handlingsoverblik og data tilføjes i næste fase.
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  description,
  status,
}: {
  title: string;
  value: string;
  description: string;
  status: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    neutral: 'bg-white border-gray-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[status]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(app)/indstillinger/page.tsx`**

```typescript
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Indstillinger — Klimastatus.dk' };

export default async function IndstillingerPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const kommune = await getKommuneById(session.kommuneId);
  if (!kommune) redirect('/login');

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

      <div className="mt-4 rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-400">
        Redigering af indstillinger tilføjes i en senere fase.
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update root layout metadata**

In `app/layout.tsx`, change:
```typescript
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};
```
to:
```typescript
export const metadata: Metadata = {
  title: "Klimastatus.dk",
  description: "Klimarapportering og CCTF-selvevaluering for danske kommuner",
};
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/'(app)'/dashboard/ app/'(app)'/indstillinger/ app/layout.tsx
git commit -m "feat: add koordinator dashboard and settings pages"
```

---

## Phase 2 Complete ✓

After all 13 tasks, the system has:
- Custom JWT auth (login, logout, route protection via proxy.ts)
- Admin panel: list + create kommuner
- Koordinator dashboard skeleton with status cards
- Settings page with kommune details
- Sidebar navigation for all future app sections

**To test locally** (requires Docker + migrations + seed from Phase 1):
1. Start DB: `docker compose up -d`
2. Run migrations: `npx drizzle-kit migrate`
3. Seed: `npx tsx db/seed.ts`
4. Start app: `npm run dev`
5. Visit `http://localhost:3000/login`
6. Log in as `augustseptimius@gmail.com` / `admin123!`
7. Create a test kommune in the admin panel
8. Create a koordinator user manually in the DB and log in as them

**Phase 3 next:** Handlingsoverblik + tovholder flow (magic links, formular, rykkere).
