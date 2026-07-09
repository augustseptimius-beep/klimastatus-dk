import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
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
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));
vi.mock('@/db/schema', () => ({
  user: {},
}));

describe('verifySession', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when no token', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(() => ({ get: vi.fn(() => undefined) })),
    }));
    vi.doMock('./session', () => ({
      decrypt: vi.fn().mockResolvedValue(undefined),
    }));
    const { verifySession } = await import('./dal');
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it('returns null when token is invalid', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(() => ({ get: vi.fn(() => ({ value: 'bad-token' })) })),
    }));
    vi.doMock('./session', () => ({
      decrypt: vi.fn().mockResolvedValue(undefined),
    }));
    const { verifySession } = await import('./dal');
    const result = await verifySession();
    expect(result).toBeNull();
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('kaster uden session', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(() => ({ get: vi.fn(() => undefined) })),
    }));
    vi.doMock('./session', () => ({
      decrypt: vi.fn().mockResolvedValue(undefined),
    }));
    const { requireAdmin } = await import('./dal');
    await expect(requireAdmin()).rejects.toThrow('Ikke autoriseret');
  });

  it('kaster for koordinator-session', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(() => ({ get: vi.fn(() => ({ value: 'token' })) })),
    }));
    vi.doMock('./session', () => ({
      decrypt: vi.fn().mockResolvedValue({
        userId: 'u1', role: 'koordinator', kommuneId: 'k1', kommuneSlug: 'x', navn: 'K',
      }),
    }));
    const { requireAdmin } = await import('./dal');
    await expect(requireAdmin()).rejects.toThrow('Ikke autoriseret');
  });

  it('returnerer session for admin', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(() => ({ get: vi.fn(() => ({ value: 'token' })) })),
    }));
    vi.doMock('./session', () => ({
      decrypt: vi.fn().mockResolvedValue({
        userId: 'u1', role: 'admin', kommuneId: null, kommuneSlug: null, navn: 'A',
      }),
    }));
    const { requireAdmin } = await import('./dal');
    const session = await requireAdmin();
    expect(session.role).toBe('admin');
  });
});
