import { describe, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// Stub next/server og next-krypto — vi tester kun rute-logikken
vi.mock('next/server', () => {
  class MockNextResponse {
    static next() { return new MockNextResponse('next'); }
    static redirect(url: URL) { return new MockNextResponse('redirect:' + url.pathname); }
    constructor(public _action: string) {}
  }
  return { NextResponse: MockNextResponse };
});

const mockSession = vi.fn();
vi.mock('@/lib/session', () => ({
  decrypt: () => mockSession(),
}));

import { proxy } from './proxy';

function makeReq(pathname: string, hasCookie = false): NextRequest {
  const base = 'https://klimastatus.dk';
  const url = `${base}${pathname}`;
  const nextUrl = new URL(url);
  return {
    nextUrl,
    url,
    cookies: { get: () => hasCookie ? { value: 'tok' } : undefined },
  } as unknown as NextRequest;
}

describe('proxy — offentlige ruter', () => {
  it('/ er offentlig uden session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await proxy(makeReq('/'));
    expect((res as unknown as { _action: string })._action).toBe('next');
  });

  it('/groenkobing er offentlig slug', async () => {
    mockSession.mockResolvedValue(null);
    const res = await proxy(makeReq('/groenkobing'));
    expect((res as unknown as { _action: string })._action).toBe('next');
  });

  it('/k er IKKE offentlig slug (reservedSegments)', async () => {
    mockSession.mockResolvedValue(null);
    const res = await proxy(makeReq('/k'));
    // /k er ikke i publicRoutes og ikke offentlig slug → redirect til login
    expect((res as unknown as { _action: string })._action).toBe('redirect:/login');
  });
});

describe('proxy — beskyttede ruter', () => {
  it('/k/groenkobing/dashboard kræver session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await proxy(makeReq('/k/groenkobing/dashboard'));
    expect((res as unknown as { _action: string })._action).toBe('redirect:/login');
  });

  it('/admin kræver admin-rolle', async () => {
    mockSession.mockResolvedValue({ role: 'koordinator', kommuneSlug: 'groenkobing' });
    const res = await proxy(makeReq('/admin/kommuner', true));
    expect((res as unknown as { _action: string })._action).toBe('redirect:/dashboard');
  });

  it('/admin tillades for admin', async () => {
    mockSession.mockResolvedValue({ role: 'admin', kommuneSlug: null });
    const res = await proxy(makeReq('/admin/kommuner', true));
    expect((res as unknown as { _action: string })._action).toBe('next');
  });
});

describe('proxy — /login redirect for logget-ind bruger', () => {
  it('admin på /login → /admin/kommuner', async () => {
    mockSession.mockResolvedValue({ role: 'admin', kommuneSlug: null });
    const res = await proxy(makeReq('/login', true));
    expect((res as unknown as { _action: string })._action).toBe('redirect:/admin/kommuner');
  });

  it('koordinator på /login → /k/<slug>/dashboard', async () => {
    mockSession.mockResolvedValue({ role: 'koordinator', kommuneSlug: 'groenkobing' });
    const res = await proxy(makeReq('/login', true));
    expect((res as unknown as { _action: string })._action).toBe('redirect:/k/groenkobing/dashboard');
  });

  it('koordinator uden slug (gammel session) → /dashboard', async () => {
    mockSession.mockResolvedValue({ role: 'koordinator', kommuneSlug: null });
    const res = await proxy(makeReq('/login', true));
    expect((res as unknown as { _action: string })._action).toBe('redirect:/dashboard');
  });
});
